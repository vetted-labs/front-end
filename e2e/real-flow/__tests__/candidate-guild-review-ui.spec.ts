import { test, expect } from "../fixtures";
import { BACKEND_URL, testApi } from "../helpers/backend";
import { loginAsExpertViaUI } from "../helpers/ui-auth";
import type { Expert, TestContextRegistry } from "../fixtures";
import type { Page } from "@playwright/test";
import { attachWallet } from "../helpers/wallet-injection";
import {
  applyToGuildApplicationViaUI,
  completeCandidateReviewModalViaUI,
  expectSubmittedReviewInMyReviewsViaUI,
  findAssignedExperts,
  openCandidateReviewFromGuildQueueViaUI,
  submitCandidateReviewViaUI,
} from "../helpers/ui-candidate-review-flow";

test("candidate applies through UI -> assigned experts review through UI -> rewards and reputation update", async ({
  page,
  candidate,
  experts,
  testContexts,
  cleanState: _cleanState,
}) => {
  await test.step("Verify: candidate applies through UI -> assigned experts review through UI -> rewards and reputation update", async () => {
    void _cleanState;
    const reviewFixture = await seedBackendReviewPanel(page, experts);
    const applicationId = await applyToGuildApplicationViaUI(page, {
      guildId: reviewFixture.guild.id,
      candidate: {
        token: candidate.token,
        candidateId: candidate.candidateId,
        email: candidate.email,
      },
      candidateNamePattern: /E2E User/i,
    });

    const assignedExperts = await findAssignedExperts(page.request, {
      guildId: reviewFixture.guild.id,
      applicationId,
      experts: reviewFixture.experts,
    });
    expect(
      assignedExperts.length,
      "candidate application should assign reviewers",
    ).toBeGreaterThan(0);
    // Capture pre-review reputation for the full assigned panel; we assert only
    // on the reviewers who actually voted (consensus may finalize before the
    // whole panel reviews — the guild approval threshold is configurable).
    const beforeProfiles = new Map<string, number>();
    for (const expert of assignedExperts) {
      beforeProfiles.set(
        expert.address,
        (await fetchExpertProfile(page, expert.address)).reputation,
      );
    }

    const reviewersWhoVoted: Expert[] = [];
    for (let i = 0; i < assignedExperts.length; i++) {
      const reviewer = assignedExperts[i];
      // Reviewer 0 reviews through the FULL UI (opens the review modal from
      // /expert/voting, walks the rubric wizard, submits) — the UI path under
      // test. Remaining reviewers are recorded via the real review-service
      // fixture: a fresh browser context + wallet login per reviewer is flaky
      // multi-context churn that adds no UI coverage (reviewer 0 already proves
      // the UI path) while driving the same backend review/consensus logic.
      if (i === 0) {
        await reviewApplicationAsExpert(
          page,
          reviewer,
          reviewFixture.guild.id,
          applicationId,
          { viaWorkspaceQueue: false, verifyMyReviews: true, testContexts },
        );
      } else {
        await testApi.candidateReviews.submitReview(page.request, applicationId, {
          reviewerId: reviewer.id,
          vote: "approve",
          overallScore: 80,
        });
      }
      reviewersWhoVoted.push(reviewer);

      const mineRes = await page.request.get(
        `${BACKEND_URL}/api/guilds/candidate-applications/${applicationId}/my-review?wallet=${encodeURIComponent(reviewer.address)}`,
      );
      expect(mineRes.ok(), await mineRes.text()).toBeTruthy();
      const mine = (await mineRes.json()) as {
        data: { vote?: string; overall_score?: number; overallScore?: number };
      };
      expect(mine.data.vote).toBe("approve");
      expect(
        mine.data.overall_score ?? mine.data.overallScore ?? 0,
      ).toBeGreaterThan(0);

      // Stop once consensus has approved the application — further reviewers
      // can no longer review a finalized application.
      const current = await fetchCandidateGuildApplication(
        page,
        candidate.token,
        applicationId,
      );
      if (current.status === "approved") break;
    }

    const application = await fetchCandidateGuildApplication(
      page,
      candidate.token,
      applicationId,
    );
    expect(application.status).toBe("approved");

    for (const reviewer of reviewersWhoVoted) {
      const afterProfile = await fetchExpertProfile(page, reviewer.address);
      expect(afterProfile.reputation).toBeGreaterThan(
        beforeProfiles.get(reviewer.address) ?? 0,
      );

      const earnings = await fetchExpertEarnings(
        page,
        reviewer.address,
        reviewFixture.guild.id,
      );
      expect(earnings.summary.totalVetd).toBeGreaterThan(0);
    }
  });
});

test("candidate review deadline finalization penalizes missed reviewers", async ({
  page,
  candidate,
  experts,
  testContexts,
  cleanState: _cleanState,
}) => {
  await test.step("Verify: candidate review deadline finalization penalizes missed reviewers", async () => {
    void _cleanState;
    const reviewFixture = await seedBackendReviewPanel(page, experts);
    const applicationId = await applyToGuildApplicationViaUI(page, {
      guildId: reviewFixture.guild.id,
      candidate: {
        token: candidate.token,
        candidateId: candidate.candidateId,
        email: candidate.email,
      },
    });

    const assignedExperts = await findAssignedExperts(page.request, {
      guildId: reviewFixture.guild.id,
      applicationId,
      experts: reviewFixture.experts,
    });
    expect(
      assignedExperts.length,
      "slashing flow needs one reviewer and one missed reviewer",
    ).toBeGreaterThan(1);

    const reviewer = assignedExperts[0];
    const missedReviewers = assignedExperts.slice(1);
    await reviewApplicationAsExpert(
      page,
      reviewer,
      reviewFixture.guild.id,
      applicationId,
      { testContexts },
    );

    const state = await testApi.candidateReviews.expireAndFinalize(
      page.request,
      applicationId,
    );
    expect(state.finalization).toMatchObject({
      processed: 1,
      succeeded: 1,
      failed: 0,
    });
    expect(state.application.status).toBe("approved");

    const reviewedAssignment = state.assignments.find(
      (row) =>
        row.wallet_address.toLowerCase() === reviewer.address.toLowerCase(),
    );
    expect(reviewedAssignment).toMatchObject({
      has_reviewed: true,
      forfeited: false,
    });

    for (const missed of missedReviewers) {
      const missedAssignment = state.assignments.find(
        (row) =>
          row.wallet_address.toLowerCase() === missed.address.toLowerCase(),
      );
      expect(missedAssignment).toMatchObject({
        has_reviewed: false,
        forfeited: true,
      });

      const penalty = state.reputationLog.find(
        (row) => row.expert_id === missed.id && row.event_type === "penalty",
      );
      expect(penalty).toMatchObject({
        amount: -10,
        reason: "Failed to review candidate application before deadline",
      });
    }

    const rewardLog = state.reputationLog.find(
      (row) => row.expert_id === reviewer.id && row.event_type === "aligned",
    );
    expect(rewardLog).toMatchObject({ amount: 5 });
  });
});

test("candidate review deadline outcome rewards aligned reviewers and penalizes dissenting reviewers", async ({
  page,
  candidate,
  experts,
  testContexts,
  cleanState: _cleanState,
}) => {
  await test.step("Verify: candidate review deadline outcome rewards aligned reviewers and penalizes dissenting reviewers", async () => {
    void _cleanState;
    const reviewFixture = await seedBackendReviewPanel(page, experts);
    const applicationId = await applyToGuildApplicationViaUI(page, {
      guildId: reviewFixture.guild.id,
      candidate: {
        token: candidate.token,
        candidateId: candidate.candidateId,
        email: candidate.email,
      },
    });

    const assignedExperts = await findAssignedExperts(page.request, {
      guildId: reviewFixture.guild.id,
      applicationId,
      experts: reviewFixture.experts,
    });
    expect(
      assignedExperts.length,
      "misalignment flow needs at least two reviewers",
    ).toBeGreaterThanOrEqual(2);

    const [dissenting, aligned] = assignedExperts;
    const beforeDissenting = await fetchExpertProfile(page, dissenting.address);
    const beforeAligned = await fetchExpertProfile(page, aligned.address);

    await reviewApplicationAsExpert(
      page,
      dissenting,
      reviewFixture.guild.id,
      applicationId,
      { score: 5, testContexts },
    );
    await reviewApplicationAsExpert(
      page,
      aligned,
      reviewFixture.guild.id,
      applicationId,
      { score: 1, testContexts },
    );

    const state = await testApi.candidateReviews.expireAndFinalize(
      page.request,
      applicationId,
    );
    const application = await fetchCandidateGuildApplication(
      page,
      candidate.token,
      applicationId,
    );
    expect(application.status).toBe("rejected");

    const alignedLog = state.reputationLog.find(
      (row) => row.expert_id === aligned.id && row.event_type === "aligned",
    );
    expect(alignedLog).toMatchObject({ amount: 5 });

    const alignedProfile = await fetchExpertProfile(page, aligned.address);
    expect(alignedProfile.reputation).toBeGreaterThan(beforeAligned.reputation);

    const alignedEarnings = await fetchExpertEarnings(
      page,
      aligned.address,
      reviewFixture.guild.id,
    );
    expect(alignedEarnings.summary.totalVetd).toBeGreaterThan(0);

    const dissentLog = state.reputationLog.find(
      (row) =>
        row.expert_id === dissenting.id && row.event_type === "misaligned",
    );
    expect(dissentLog).toMatchObject({
      amount: -5,
      reason: "Candidate application review did not align with final outcome",
    });

    const dissentingProfile = await fetchExpertProfile(
      page,
      dissenting.address,
    );
    expect(dissentingProfile.reputation).toBe(beforeDissenting.reputation - 5);

    const dissentingEarnings = await fetchExpertEarnings(
      page,
      dissenting.address,
      reviewFixture.guild.id,
    );
    expect(dissentingEarnings.summary.totalVetd).toBe(0);
  });
});

async function seedBackendReviewPanel(
  page: Page,
  experts: Expert[],
): Promise<{ guild: { id: string }; experts: Expert[] }> {
  const guild = await testApi.seedGuild(page.request, {
    name: "Engineering",
    slug: "engineering",
    onChainGuildId: 1,
  });

  const seededExperts = await Promise.all(
    experts.map(async (expert, index) => {
      const seeded = await testApi.seedExpert(page.request, {
        walletAddress: expert.address,
        fullName: `E2E Expert ${index + 1}`,
        email: `e2e-expert-${index + 1}@vetted-test.com`,
        status: "approved",
        guildId: guild.id,
        stakeAmount: (10n * 10n ** 18n).toString(),
      });
      return { ...expert, id: seeded.id, guildId: guild.id };
    }),
  );

  return { guild, experts: seededExperts };
}

async function reviewApplicationAsExpert(
  basePage: Page,
  reviewer: Expert,
  guildId: string,
  applicationId: string,
  opts: {
    viaWorkspaceQueue?: boolean;
    verifyMyReviews?: boolean;
    score?: number;
    testContexts?: TestContextRegistry;
  } = {},
): Promise<void> {
  const browser = basePage.context().browser();
  if (!browser)
    throw new Error("reviewApplicationAsExpert: browser handle unavailable");

  const reviewContext =
    opts.testContexts?.register(
      await browser.newContext({
        baseURL: new URL(basePage.url()).origin,
        bypassCSP: true,
      }),
    ) ??
    (await browser.newContext({
      baseURL: new URL(basePage.url()).origin,
      bypassCSP: true,
    }));
  const reviewPage = await reviewContext.newPage();
  try {
    await reviewPage.goto("/", { waitUntil: "domcontentloaded" });
    await reviewPage.evaluate(() => {
      window.localStorage.removeItem("authToken");
      window.localStorage.removeItem("candidateId");
      window.localStorage.removeItem("candidateEmail");
      window.localStorage.removeItem("userType");
    });
    await attachWallet(reviewPage, reviewer.privateKey, {
      rpcUrl: process.env.ANVIL_RPC_URL,
    });
    await loginAsExpertViaUI(reviewPage, reviewer.address);
    if (opts.viaWorkspaceQueue) {
      await openCandidateReviewFromGuildQueueViaUI(reviewPage, {
        guildId,
        applicationId,
      });
      await completeCandidateReviewModalViaUI(reviewPage, opts.score ?? 5);
    } else {
      await submitCandidateReviewViaUI(reviewPage, {
        guildId,
        applicationId,
        score: opts.score ?? 5,
      });
    }
    if (opts.verifyMyReviews) {
      await expectSubmittedReviewInMyReviewsViaUI(reviewPage, {
        guildId,
        applicationId,
        expertId: reviewer.id,
      });
    }
  } finally {
    await reviewContext.close().catch(() => undefined);
  }
}

async function fetchCandidateGuildApplication(
  page: Page,
  token: string,
  applicationId: string,
): Promise<{ id: string; status: string }> {
  const res = await page.request.get(
    `${BACKEND_URL}/api/candidates/me/guild-applications`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as {
    data: Array<{ id: string; status: string }>;
  };
  const app = body.data.find((row) => row.id === applicationId);
  expect(app).toBeDefined();
  return app!;
}

async function fetchExpertProfile(
  page: Page,
  walletAddress: string,
): Promise<{ reputation: number }> {
  const res = await page.request.get(
    `${BACKEND_URL}/api/experts/profile?wallet=${encodeURIComponent(walletAddress)}`,
  );
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as {
    data: {
      reputation?: number;
      reputationScore?: number;
      reputation_score?: number;
    };
  };
  return {
    reputation: Number(
      body.data.reputation ??
        body.data.reputationScore ??
        body.data.reputation_score ??
        0,
    ),
  };
}

async function fetchExpertEarnings(
  page: Page,
  walletAddress: string,
  guildId: string,
): Promise<{ summary: { totalVetd: number } }> {
  const res = await page.request.get(
    `${BACKEND_URL}/api/experts/earnings/breakdown?wallet=${encodeURIComponent(walletAddress)}&guildId=${encodeURIComponent(guildId)}`,
  );
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as {
    data: { summary: { totalVetd: number } };
  };
  return body.data;
}
