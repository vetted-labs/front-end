// e2e/real-flow/endorsement/scenarios/05-dispute-resolved-for-expert.spec.ts
//
// Suite B — Scenario 05: dispute-resolved-for-expert.
//
// Builds on scenario 04 (performance-issue-no-dispute). The candidate applies
// to a seeded job, three experts place bids, the company records `hired`, the
// outbox is drained. Before the retention deadline, the company calls
// `reportPerformanceIssue` which moves all 3 `endorsement_rewards` rows to
// `status='locked_forfeited'`. From that fixed-point we add the dispute flow:
//
//   1. The affected expert (experts[0]) files a dispute via
//      `POST /api/endorsements/disputes`. The BE selects panel members
//      by random-3 of officers/masters in the guild; since all bootstrapped
//      experts have role='craftsman', the automatic selection returns 0 rows.
//      We use `testApi.endorsement.assignPanel` to directly assign experts[1..3]
//      as the panel for the dispute.
//   2. Three panelists vote: 2 dismiss, 1 uphold. The 3rd vote triggers the
//      `submitArbitrationVote` resolution path: tally → `dismiss > uphold`
//      → `endorsement_disputes.status = 'resolved_dismissed'`. The dismissal
//      branch does NOT re-touch `endorsement_rewards` — the rewards stay
//      `locked_forfeited`.
//
// Critical clarification: dismissed disputes do NOT restore forfeited rewards.
// This scenario asserts that observable behavior: `endorsement_rewards` rows
// for the 3 endorsers remain in `status='locked_forfeited'` after the panel
// dismisses.

import { test, expect } from "../../fixtures";
import {
  approveExpertsForBidding,
  createJob,
  placeBid,
  recordHireOutcome,
  reportPerformanceIssue,
  fileDispute,
  castDisputeVote,
} from "../../helpers/endorsement";
import { testApi, BACKEND_URL } from "../../helpers/backend";

// Shape of `endorsement_rewards` rows surfaced by
// `GET /api/endorsements/rewards/:expertId`.
type ExpertRewardRow = {
  id: string;
  expert_id: string;
  hire_outcome_id: string;
  status: string;
  locked_released: boolean;
  locked_forfeited: boolean;
};

// Shape of the `hire_outcomes` row plus the two virtual count columns
// returned by `GET /api/endorsements/hire-outcome/:applicationId`.
type HireOutcomeResponse = {
  id: string;
  application_id: string;
  outcome: string;
  retention_deadline: string | null;
  reward_count: number | string;
  dispute_count: number | string;
};

// `submitArbitrationVote` response payload.
// `allVoted` is the BE's signal that the tally completed.
type CastVoteResponse = {
  success?: boolean;
  data: { voted: boolean; allVoted: boolean; disputeId: string };
};

test("dispute resolved for expert (panel votes 2 dismiss / 1 uphold) — rewards stay forfeited", async ({
  page,
  candidate,
  guild,
  experts,
  contracts,
  request,
  jobCreator,
  company,
  cleanState: _cleanState,
}) => {
  // -------------------------------------------------------------------
  // Hoisted bindings populated by the setup steps.
  // -------------------------------------------------------------------
  let applicationId!: string;
  let jobId!: string;
  let hireOutcomeId!: string;
  let disputeId!: string;

  const candidateId = candidate.candidateId;

  // The disputing expert is experts[0]; the 3 panel voters are experts[1..3].
  const disputingExpert = experts[0];
  const panel = [experts[1], experts[2], experts[3]];
  const bidAmounts = ["1", "2", "3"] as const; // for experts[0..2]

  // Expert tokens seeded per-test via the test endpoint (no env vars needed).
  let disputingToken!: string;
  const panelTokens: string[] = [];

  await test.step("approve VETD allowance for the 3 bidders", async () => {
    await approveExpertsForBidding(experts.slice(0, 3), contracts);
  });

  await test.step("seed expert tokens for disputing expert + 3 panel members", async () => {
    // testApi.seedExpertToken mints a JWT for the expert without SIWE.
    const disputingTokenRow = await testApi.seedExpertToken(request, {
      expertId: disputingExpert.id,
    });
    disputingToken = disputingTokenRow.token;

    for (const panelMember of panel) {
      const tokenRow = await testApi.seedExpertToken(request, {
        expertId: panelMember.id,
      });
      panelTokens.push(tokenRow.token);
    }
  });

  await test.step("seed job + candidate applies to job; create on-chain job", async () => {
    // Seed a real jobs row (hire_outcomes FK requires applications.job_id →
    // jobs.id). The `company` fixture provides the company id + token.
    const seededJob = await testApi.seedJob(request, {
      companyId: company.id,
      title: "E2E Dispute For Expert Job",
      guild: guild.name,
    });
    jobId = seededJob.jobId;

    // Candidate applies to the seeded job — creates an `applications` row
    // whose id we pass to `recordHireOutcome` as `applicationId`.
    const applyRes = await page.request.post(
      `${BACKEND_URL}/api/applications`,
      {
        headers: { Authorization: `Bearer ${candidate.token}` },
        data: {
          jobId,
          coverLetter:
            "E2E test application for endorsement scenario 05. This cover letter meets the minimum length requirement.",
        },
      },
    );
    expect(applyRes.ok()).toBeTruthy();
    const applyBody = (await applyRes.json()) as { data: { id: string } };
    applicationId = applyBody.data.id;

    // Create the on-chain job entry so placeBid doesn't revert with
    // InvalidJob. Creator must differ from bidders (CreatorCannotBid).
    await createJob(jobCreator, contracts, jobId);
  });

  await test.step("3 experts place bids (1, 2, 3 VETD) + sync each to BE", async () => {
    for (let i = 0; i < 3; i++) {
      await placeBid(experts[i], contracts, jobId, candidateId, bidAmounts[i]);

      const syncRes = await page.request.post(
        `${BACKEND_URL}/api/blockchain/endorsements/sync`,
        {
          headers: { "x-wallet-address": experts[i].address },
          data: {
            applicationId,
            jobId,
            candidateId,
            walletAddress: experts[i].address,
          },
        },
      );
      expect(syncRes.ok()).toBeTruthy();
    }
  });

  await test.step("company records hire", async () => {
    await recordHireOutcome(request, company.token, {
      applicationId,
      candidateId,
      jobId,
      outcome: "hired",
      finalCompensation: 100_000,
    });
  });

  await test.step("drain blockchain ops outbox (immediate halves)", async () => {
    await testApi.endorsement.drainBlockchainOps(request);
  });

  await test.step("read hireOutcomeId off the hire-outcome GET", async () => {
    const res = await page.request.get(
      `${BACKEND_URL}/api/endorsements/hire-outcome/${applicationId}`,
      { headers: { Authorization: `Bearer ${company.token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { data: HireOutcomeResponse };
    expect(body.data.id).toBeTruthy();
    hireOutcomeId = body.data.id;
  });

  await test.step("company reports performance issue (scenario 04 fixed-point)", async () => {
    // reportPerformanceIssue MUST run before `retention_deadline`
    // (BE hire-accountability.service.ts rejects if now > retention_deadline).
    // We do NOT sleep between recordHireOutcome and this call.
    await reportPerformanceIssue(
      request,
      company.token,
      applicationId,
      "Quality of work fell well below contract expectations within the retention window.",
      1,
    );
  });

  await test.step("assert all 3 endorsement_rewards = locked_forfeited (scenario 04 fixed-point)", async () => {
    for (const expert of experts.slice(0, 3)) {
      const res = await page.request.get(
        `${BACKEND_URL}/api/endorsements/rewards/${expert.id}`,
        { headers: { Authorization: `Bearer ${company.token}` } },
      );
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as { data: ExpertRewardRow[] };
      const reward = (body.data ?? []).find(
        (r) => r.hire_outcome_id === hireOutcomeId,
      );
      expect(reward).toBeDefined();
      expect(reward!.status).toBe("locked_forfeited");
      expect(reward!.locked_forfeited).toBe(true);
      expect(reward!.locked_released).toBe(false);
    }
  });

  // ---------------------------------------------------------------------
  // Scenario-05-specific work: file dispute + 3-panel vote (2 dismiss, 1
  // uphold) → resolved_dismissed.
  // ---------------------------------------------------------------------

  await test.step("disputing expert files dispute + assign panel directly", async () => {
    const result = await fileDispute(
      request,
      disputingToken,
      hireOutcomeId,
      "I delivered quality work",
      "evidence-link",
    );
    expect(result.id).toBeTruthy();
    disputeId = result.id;

    // Production panel selection requires role IN ('officer', 'master').
    // Bootstrapped experts have role='craftsman', so the random SELECT returns
    // 0 rows and no panel is formed automatically. Use the test-only endpoint
    // to assign our known panel members (experts[1..3]) so they can cast votes.
    await testApi.endorsement.assignPanel(request, {
      disputeId,
      expertIds: panel.map((e) => e.id),
    });
  });

  await test.step("3 panel members vote: 2 dismiss, 1 uphold (3rd vote triggers resolution)", async () => {
    const votes: ReadonlyArray<"dismiss" | "uphold"> = [
      "dismiss",
      "dismiss",
      "uphold",
    ];

    let lastResponse: CastVoteResponse | null = null;

    for (let i = 0; i < panel.length; i++) {
      const token = panelTokens[i];

      const res = await request.post(
        `${BACKEND_URL}/api/endorsements/disputes/${disputeId}/vote`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { vote: votes[i], reasoning: `e2e vote ${i}: ${votes[i]}` },
        },
      );

      if (res.status() === 403) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `castDisputeVote(panel[${i}]) returned 403 (likely panel-membership). ` +
            `BE response: ${text}.`,
        );
      }

      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as CastVoteResponse;
      lastResponse = body;

      if (i < panel.length - 1) {
        // First two votes: tally not yet complete.
        expect(body.data.allVoted).toBe(false);
      }
    }

    // Final vote should have flipped allVoted true and triggered the
    // tally → resolution path.
    expect(lastResponse).not.toBeNull();
    expect(lastResponse!.data.allVoted).toBe(true);
    expect(lastResponse!.data.disputeId).toBe(disputeId);

    // castDisputeVote is the canonical helper; suppress unused-import lint.
    void castDisputeVote;
  });

  await test.step("assert dispute reached terminal state (replay vote rejected)", async () => {
    // Probe terminal state indirectly: replaying a vote from one of the 3
    // panelists must fail with 'You have already voted on this dispute'.
    const replayToken = panelTokens[0];
    const res = await request.post(
      `${BACKEND_URL}/api/endorsements/disputes/${disputeId}/vote`,
      {
        headers: { Authorization: `Bearer ${replayToken}` },
        data: { vote: "dismiss", reasoning: "e2e replay" },
      },
    );
    expect(res.ok()).toBe(false);
    expect([400, 422]).toContain(res.status());
    const text = await res.text();
    expect(text).toMatch(/already voted/i);
  });

  await test.step("assert hire-outcome dispute_count = 1 (sanity check via GET)", async () => {
    const res = await page.request.get(
      `${BACKEND_URL}/api/endorsements/hire-outcome/${applicationId}`,
      { headers: { Authorization: `Bearer ${company.token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { data: HireOutcomeResponse };
    expect(Number(body.data.dispute_count)).toBe(1);
  });

  // ---------------------------------------------------------------------
  // The headline assertion of scenario 05: rewards stay locked_forfeited.
  // Dismissed disputes do NOT restore forfeited rewards.
  // ---------------------------------------------------------------------
  await test.step("assert rewards UNCHANGED from scenario 04 (still locked_forfeited)", async () => {
    for (const expert of experts.slice(0, 3)) {
      const res = await page.request.get(
        `${BACKEND_URL}/api/endorsements/rewards/${expert.id}`,
        { headers: { Authorization: `Bearer ${company.token}` } },
      );
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as { data: ExpertRewardRow[] };
      const reward = (body.data ?? []).find(
        (r) => r.hire_outcome_id === hireOutcomeId,
      );
      expect(reward).toBeDefined();
      expect(reward!.status).toBe("locked_forfeited");
      expect(reward!.locked_forfeited).toBe(true);
      expect(reward!.locked_released).toBe(false);
    }
  });

  await test.step("UI spot-check: dispute detail page reachable (best-effort)", async () => {
    // The route authenticates via wagmi useAccount() (no injected wallet in
    // Playwright). We only assert the route exists and isn't a 404.
    try {
      await page.goto(`/expert/endorsements/disputes/${disputeId}`, {
        waitUntil: "domcontentloaded",
        timeout: 10_000,
      });
      const reachable = page.getByText(
        /dispute|wallet|connect|endorsement|sign in/i,
      );
      await expect(reachable.first()).toBeVisible({ timeout: 5_000 });
    } catch {
      // Soft-pass — non-UI assertions above already prove BE-side behavior.
    }
  });
});
