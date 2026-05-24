import { test, expect } from "../fixtures";
import type { Expert, TestContextRegistry } from "../fixtures";
import type { Page } from "@playwright/test";
import { parseEther } from "viem";
import { ANVIL_KEYS, makeWallet } from "../helpers/chain";
import { approveExpertsForBidding } from "../helpers/endorsement";
import { attachWallet } from "../helpers/wallet-injection";
import { loginAsExpertViaUI } from "../helpers/ui-auth";
import { testApi } from "../helpers/backend";
import {
  applyToGuildApplicationViaUI,
  findAssignedExperts,
  submitCandidateReviewViaUI,
} from "../helpers/ui-candidate-review-flow";
import {
  createActiveJob,
  createCandidateJobApplication,
  expectExpertEarningsShowsEndorsement,
  expectExpertHistoryShowsHiredEndorsement,
  expectExpertHistoryShowsSlashedEndorsement,
  fetchEndorsementTarget,
  fetchExpertRewards,
  placeEndorsementViaUI,
  recordHiredOutcomeAndForfeitLockedReward,
  recordHiredOutcomeAndReleaseLockedReward,
  recordNotHiredOutcome,
  waitForSyncedEndorsement,
} from "../helpers/ui-endorsement-flow";

test.setTimeout(300_000);

const watchPauseMs = Number(
  process.env.PLAYWRIGHT_WATCH_PAUSE_MS ??
    (process.env.PLAYWRIGHT_WATCH_UI === "1" ? "750" : "0"),
);

async function watchPause(page: Page): Promise<void> {
  if (watchPauseMs > 0) await page.waitForTimeout(watchPauseMs);
}

test("candidate approval -> endorsement UI bid -> rewards, forfeiture, and slashing are wired", async ({
  page,
  anvil,
  candidate,
  contracts,
  experts,
  testContexts,
  cleanState: _cleanState,
}) => {
  void _cleanState;

  let reviewFixture!: Awaited<ReturnType<typeof seedBackendReviewPanel>>;
  let company!: Awaited<ReturnType<typeof testApi.seedCompany>>;
  let primaryJobId!: string;
  let guildApplicationId!: string;
  let assignedExperts!: Expert[];
  let approvedTarget!: Awaited<ReturnType<typeof fetchEndorsementTarget>>;
  let endorser!: Expert;

  await test.step("seed review panel, company, and primary job", async () => {
    reviewFixture = await seedBackendReviewPanel(page, experts);
    company = await testApi.seedCompany(page.request, {
      name: `E2E Hiring Co ${Date.now()}`,
    });
    primaryJobId = await createActiveJob(page.request, company, "Engineering");
    await watchPause(page);
  });

  await test.step("candidate applies to the engineering guild via UI", async () => {
    guildApplicationId = await applyToGuildApplicationViaUI(page, {
      guildId: reviewFixture.guild.id,
      candidate: {
        token: candidate.token,
        candidateId: candidate.candidateId,
        email: candidate.email,
      },
      jobId: primaryJobId,
    });
    await watchPause(page);
  });

  await test.step("assigned experts approve the candidate application", async () => {
    assignedExperts = await findAssignedExperts(page.request, {
      guildId: reviewFixture.guild.id,
      applicationId: guildApplicationId,
      experts: reviewFixture.experts,
    });
    expect(
      assignedExperts.length,
      "candidate application should assign reviewers",
    ).toBeGreaterThan(0);
    endorser = assignedExperts[0];

    const majorityThreshold = Math.floor(assignedExperts.length / 2) + 1;
    for (const reviewer of assignedExperts.slice(0, majorityThreshold)) {
      await reviewApplicationAsExpert(
        page,
        reviewer,
        reviewFixture.guild.id,
        guildApplicationId,
        testContexts,
      );
    }
    await watchPause(page);
  });

  await test.step("approved candidate becomes available for endorsement bidding", async () => {
    approvedTarget = await fetchEndorsementTarget(
      page.request,
      candidate.token,
      guildApplicationId,
    );
    const owner = makeWallet(ANVIL_KEYS[0]);
    const targetBalance = parseEther("1000");
    for (const expert of reviewFixture.experts) {
      const balance = await contracts.vettedToken.read.balanceOf([
        expert.address,
      ]);
      if (typeof balance !== "bigint") {
        throw new Error("Expected VETD balanceOf to return a bigint");
      }
      if (balance < targetBalance) {
        const txHash = await contracts.vettedToken.write.mint(
          [expert.address, targetBalance - balance],
          { account: owner.client.account },
        );
        await anvil.publicClient.waitForTransactionReceipt({ hash: txHash });
      }
    }
    await approveExpertsForBidding(reviewFixture.experts, contracts);
    await watchPause(page);
  });

  await test.step("expert places endorsement bid in the UI", async () => {
    await placeEndorsementViaUI(page, endorser, {
      guildId: reviewFixture.guild.id,
      applicationId: approvedTarget.jobApplicationId,
      amountVetd: "1.5",
      candidateNamePattern: /E2E User/i,
      testContexts,
    });
    await waitForSyncedEndorsement(
      page.request,
      endorser,
      approvedTarget.jobApplicationId,
    );
    await watchPause(page);
  });

  await test.step("hired outcome forfeits locked reward and earnings UI shows endorsement", async () => {
    await recordHiredOutcomeAndForfeitLockedReward(
      page.request,
      company.token,
      approvedTarget,
    );
    await testApi.endorsement.drainBlockchainOps(page.request);

    const rewardedRows = await fetchExpertRewards(
      page.request,
      endorser.id,
      company.token,
    );
    const rewarded = rewardedRows.find((row) => row.expert_id === endorser.id);
    expect(rewarded).toBeDefined();
    expect(Number(rewarded!.total_reward)).toBeGreaterThan(0);
    expect(rewarded).toMatchObject({
      status: "locked_forfeited",
      locked_forfeited: true,
    });
    await expectExpertEarningsShowsEndorsement(
      page,
      endorser,
      /E2E User/i,
      testContexts,
    );
    await watchPause(page);
  });

  await test.step("not-hired outcome creates slashing record and history UI shows slashed endorsement", async () => {
    const slashingJobId = await createActiveJob(
      page.request,
      company,
      "Engineering",
    );
    const slashTarget = await createCandidateJobApplication(
      page.request,
      candidate.token,
      {
        jobId: slashingJobId,
        candidateId: candidate.candidateId,
      },
    );

    await placeEndorsementViaUI(page, endorser, {
      guildId: reviewFixture.guild.id,
      applicationId: slashTarget.jobApplicationId,
      amountVetd: "2",
      candidateNamePattern: /E2E User/i,
      testContexts,
    });
    await waitForSyncedEndorsement(
      page.request,
      endorser,
      slashTarget.jobApplicationId,
    );

    await recordNotHiredOutcome(page.request, company.token, slashTarget);

    const slashingRows = await testApi.endorsement.slashingRecords(
      page.request,
      {
        applicationId: slashTarget.jobApplicationId,
      },
    );
    expect(slashingRows).toHaveLength(1);
    expect(slashingRows[0]).toMatchObject({
      expert_id: endorser.id,
      slash_percentage: 10,
      reason: "Endorsed candidate was not hired",
      related_type: "hire_outcome",
    });
    await expectExpertHistoryShowsSlashedEndorsement(
      page,
      endorser,
      /E2E User/i,
      testContexts,
    );
    await watchPause(page);
  });

  await test.step("successful retention releases locked reward and history UI shows hired endorsement", async () => {
    const retentionJobId = await createActiveJob(
      page.request,
      company,
      "Engineering",
    );
    const retentionTarget = await createCandidateJobApplication(
      page.request,
      candidate.token,
      {
        jobId: retentionJobId,
        candidateId: candidate.candidateId,
      },
    );

    await placeEndorsementViaUI(page, endorser, {
      guildId: reviewFixture.guild.id,
      applicationId: retentionTarget.jobApplicationId,
      amountVetd: "2.5",
      candidateNamePattern: /E2E User/i,
      testContexts,
    });
    await waitForSyncedEndorsement(
      page.request,
      endorser,
      retentionTarget.jobApplicationId,
    );

    await recordHiredOutcomeAndReleaseLockedReward(
      page.request,
      company.token,
      retentionTarget,
    );
    await testApi.endorsement.drainBlockchainOps(page.request);

    const releasedRows = await fetchExpertRewards(
      page.request,
      endorser.id,
      company.token,
    );
    const released = releasedRows.find(
      (row) =>
        row.expert_id === endorser.id && row.status === "locked_released",
    );
    expect(released).toBeDefined();
    expect(Number(released!.total_reward)).toBeGreaterThan(0);
    expect(released).toMatchObject({
      status: "locked_released",
      locked_released: true,
      locked_forfeited: false,
    });
    await expectExpertEarningsShowsEndorsement(
      page,
      endorser,
      /E2E User/i,
      testContexts,
    );
    await expectExpertHistoryShowsHiredEndorsement(
      page,
      endorser,
      /E2E User/i,
      testContexts,
    );
    await watchPause(page);
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
        email: `e2e-endorsement-expert-${index + 1}@vetted-test.com`,
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
  testContexts?: TestContextRegistry,
): Promise<void> {
  const browser = basePage.context().browser();
  if (!browser)
    throw new Error("reviewApplicationAsExpert: browser handle unavailable");

  const reviewContext =
    testContexts?.register(
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
    await submitCandidateReviewViaUI(reviewPage, {
      guildId,
      applicationId,
      score: 5,
    });
  } finally {
    await reviewContext.close().catch(() => undefined);
  }
}
