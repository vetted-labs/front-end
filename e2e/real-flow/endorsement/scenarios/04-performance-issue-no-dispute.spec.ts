// e2e/real-flow/endorsement/scenarios/04-performance-issue-no-dispute.spec.ts
//
// Suite B — Scenario 04: performance-issue-no-dispute.
//
// Builds on Scenario 01 (happy-bid-and-hire). The candidate applies to a
// seeded job, three experts place increasing on-chain bids on
// (jobId, candidateId), each bid is synced to the BE, the company records
// `hired`, the BE outbox is drained so the immediate-half rewards reach
// `RewardDistributor`. Then — BEFORE the retention deadline elapses — the
// company calls `reportPerformanceIssue`. That moves all 3
// `endorsement_rewards` rows into `status = 'locked_forfeited'` (the
// immediate half is already paid; only the locked half is forfeited).
//
// This scenario establishes the fixed-point that scenarios 05 and 06 both
// build on. No dispute is filed here — the headline assertion is simply that
// performance-issue, on its own, forfeits the locked halves.
//
// Spec reference (Suite B spec line ~214):
//   "All 3 endorsement_rewards rows have status='locked_forfeited' after a
//    performance issue is reported within the retention window."

import { test, expect } from "../../fixtures";
import {
  approveExpertsForBidding,
  createJob,
  placeBid,
  recordHireOutcome,
  reportPerformanceIssue,
  uuidToBytes32,
} from "../../helpers/endorsement";
import { testApi, BACKEND_URL } from "../../helpers/backend";
import type { Address } from "viem";

// Shape of one row returned by `GET /api/endorsements/rewards/:expertId`.
// We narrow only the fields we assert on; the rest are left optional so a BE
// projection change doesn't blow up the type-check.
type ExpertRewardRow = {
  id: string;
  expert_id: string;
  hire_outcome_id: string;
  status: string;
  total_reward: string;
  immediate_reward: string;
  locked_reward: string;
  locked_released: boolean;
  locked_forfeited: boolean;
};

// Shape of the `hire_outcomes` row + virtual count columns returned by
// `GET /api/endorsements/hire-outcome/:applicationId`. Used to read
// `hireOutcomeId` so we can narrow reward rows to this scenario's outcome.
type HireOutcomeResponse = {
  id: string;
  application_id: string;
  outcome: string;
  retention_deadline: string | null;
};

test("performance issue (no dispute): hire → reportPerformanceIssue → all 3 rewards locked_forfeited", async ({
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
  // Hoisted bindings populated by the early steps.
  let applicationId!: string;
  let jobId!: string;
  let hireOutcomeId!: string;

  const candidateId = candidate.candidateId;
  const bidders = experts.slice(0, 3);
  // Bid amounts in whole VETD strings (helper uses `parseEther`). >=1 VETD per
  // the contract's MIN_BID — see plan §5.6.
  const bidAmounts = ["1", "2", "3"] as const;

  await test.step("approve VETD for the 3 bidders", async () => {
    await approveExpertsForBidding(bidders, contracts);
  });

  await test.step("seed job + candidate applies to job; create on-chain job", async () => {
    // Seed a real jobs row (hire_outcomes FK requires applications.job_id →
    // jobs.id). The `company` fixture provides the company id + token.
    const seededJob = await testApi.seedJob(request, {
      companyId: company.id,
      title: "E2E Performance Issue No Dispute Job",
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
            "E2E test application for endorsement scenario 04. This cover letter meets the minimum length requirement.",
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
    for (let i = 0; i < bidders.length; i++) {
      await placeBid(bidders[i], contracts, jobId, candidateId, bidAmounts[i]);

      // Sync the on-chain bid to the BE `endorsement_bids` table so that
      // `recordHireOutcome` can find endorsers and create reward rows.
      const syncRes = await page.request.post(
        `${BACKEND_URL}/api/blockchain/endorsements/sync`,
        {
          headers: { "x-wallet-address": bidders[i].address },
          data: {
            applicationId,
            jobId,
            candidateId,
            walletAddress: bidders[i].address,
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

  await test.step("assert top-3 endorsers recorded on-chain (sanity)", async () => {
    // Inherited from T21: the contract returns a fixed-size `address[3]`;
    // filter zero-address sentinels before counting. Non-`as const` ABI:
    // viem may return the named tuple as an array `[experts, amounts]` rather
    // than `{ experts, amounts }`. Support both.
    const rawTop = await contracts.endorsementBidding.read.getTopEndorsers([
      uuidToBytes32(jobId),
      uuidToBytes32(candidateId),
    ]);
    const topExperts: readonly Address[] =
      Array.isArray(rawTop) ? (rawTop as unknown[])[0] as Address[]
      : (rawTop as { experts: readonly Address[] }).experts;

    const nonZero = topExperts.filter(
      (addr) =>
        addr.toLowerCase() !== "0x0000000000000000000000000000000000000000",
    );
    expect(nonZero).toHaveLength(3);
  });

  await test.step("read hireOutcomeId off the hire-outcome GET", async () => {
    // We need this so we can narrow reward rows to this scenario's hire
    // outcome (rather than picking up stale rows from a previous run).
    const res = await page.request.get(
      `${BACKEND_URL}/api/endorsements/hire-outcome/${applicationId}`,
      { headers: { Authorization: `Bearer ${company.token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { data: HireOutcomeResponse };
    expect(body.data.id).toBeTruthy();
    hireOutcomeId = body.data.id;
  });

  await test.step("company reports performance issue (within retention window)", async () => {
    // Retention deadline = hire.created_at + ENDORSEMENT_RETENTION_SECONDS=5.
    // We deliberately do NOT sleep between recordHireOutcome and this call —
    // the BE rejects performance-issue submissions after the deadline.
    // Helper remaps notes → performanceNotes and rating → companyRating per
    // the BE controller schema.
    await reportPerformanceIssue(
      request,
      company.token,
      applicationId,
      "low quality work",
      2,
    );
  });

  await test.step("assert all 3 endorsement_rewards.status = locked_forfeited", async () => {
    // Headline assertion of scenario 04. The locked half is forfeited; the
    // immediate half stays paid (the BE flips status to 'locked_forfeited'
    // and sets `locked_forfeited = true` while leaving the immediate-half
    // distribution untouched).
    for (const expert of bidders) {
      const res = await page.request.get(
        `${BACKEND_URL}/api/endorsements/rewards/${expert.id}`,
        { headers: { Authorization: `Bearer ${company.token}` } },
      );
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as { data: ExpertRewardRow[] };
      const rewardsForThisHire = (body.data ?? []).filter(
        (r) => r.hire_outcome_id === hireOutcomeId,
      );
      expect(rewardsForThisHire.length).toBeGreaterThanOrEqual(1);
      const reward = rewardsForThisHire[0];
      expect(reward.status).toBe("locked_forfeited");
      expect(reward.locked_forfeited).toBe(true);
      expect(reward.locked_released).toBe(false);
      // Immediate half stays paid: immediate_reward should remain populated.
      // Numeric Postgres columns come back as strings; parseFloat before compare.
      expect(parseFloat(reward.immediate_reward)).toBeGreaterThan(0);
    }
  });

  await test.step("UI spot-check: applications list renders the application", async () => {
    await page.goto(`/candidate/applications`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByText(/E2E Performance Issue No Dispute Job/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
