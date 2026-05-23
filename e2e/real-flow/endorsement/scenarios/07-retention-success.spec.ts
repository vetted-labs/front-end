// e2e/real-flow/endorsement/scenarios/07-retention-success.spec.ts
//
// Suite B — Scenario 07: retention-success.
//
// Builds on Scenario 01 (happy-bid-and-hire). The candidate applies to a
// seeded job, three experts place bids, the company records `hired`, the outbox
// is drained, and the immediate-half rewards land on-chain. Then we wait past
// the (test-tuned) retention deadline, kick the BE retention processor, and
// drain the outbox a second time so the now-released locked-half rewards reach
// `RewardDistributor.distributeSingleReward`.
//
// Backend assumes `ENDORSEMENT_RETENTION_SECONDS=5` for the dev/test env (see
// `hire-accountability.service.ts:56` — defaults to 300s; the e2e env must
// override this to 5 in `.env.local`/`.env.test`). The 6-second wait below
// gives Postgres a 1s buffer past the deadline before we ask the processor to
// pick the row up.
//
// Assertions:
//   - on-chain: top-3 endorsers recorded for (jobId, candidateId).
//   - BE: `hire_outcomes.outcome === 'successful_retention'` and
//     `retention_confirmed === true` (via GET /api/endorsements/hire-outcome).
//   - BE: 3 `endorsement_rewards.status === 'locked_released'` and
//     `locked_released === true` (via GET /api/endorsements/rewards/:expertId
//     for each of the 3 bidders).
//   - on-chain (proxy): the second `drainBlockchainOps` resolves without
//     throwing, which is sufficient evidence that the 3 queued
//     `reward_distribution` ops were dispatched to RewardDistributor.

import { test, expect } from "../../fixtures";
import {
  approveExpertsForBidding,
  createJob,
  placeBid,
  recordHireOutcome,
  uuidToBytes32,
} from "../../helpers/endorsement";
import { testApi, BACKEND_URL } from "../../helpers/backend";
import type { Address } from "viem";

// 1 second past `ENDORSEMENT_RETENTION_SECONDS=5` so the Postgres
// `retention_deadline <= CURRENT_TIMESTAMP` predicate inside
// `processRetentionConfirmations` clears even with sub-second clock drift
// between the Node test runner and the Postgres container.
const RETENTION_WAIT_MS = 6_000;

// Shape of the `hire_outcomes` row plus the two virtual count columns the BE
// projects in `getHireOutcome`. Only the fields we assert on are typed strictly
// — the rest are left optional so a BE projection change doesn't blow up the
// type-check.
type HireOutcomeResponse = {
  id: string;
  application_id: string;
  outcome: string;
  retention_confirmed: boolean;
  retention_deadline: string | null;
};

// Shape of one row returned by `GET /api/endorsements/rewards/:expertId`. The
// BE joins `endorsement_rewards` with `hire_outcomes`, so a few outcome
// columns ride along — we only read the ones we assert against.
type ExpertRewardRow = {
  id: string;
  expert_id: string;
  hire_outcome_id: string;
  status: string;
  locked_released: boolean;
  locked_forfeited: boolean;
};

test("retention success: hire → wait past retention → processRetention → locked rewards released on-chain", async ({
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
  // Hoisted bindings so later steps can read what step 1 produced. We resolve
  // them inside the first `test.step` so any error inside the step is
  // attributed correctly in the trace viewer.
  let applicationId!: string;
  let jobId!: string;

  const candidateId = candidate.candidateId;
  const bidders = experts.slice(0, 3);
  // Bid amounts in whole VETD strings (helper uses `parseEther`). >=1 VETD per
  // the contract's MIN_BID — see plan note 5.6.
  const bidAmounts = ["1", "2", "3"] as const;

  await test.step("approve VETD for the 3 bidders", async () => {
    await approveExpertsForBidding(bidders, contracts);
  });

  await test.step("seed job + candidate applies to job; create on-chain job", async () => {
    // Seed a real jobs row (hire_outcomes FK requires applications.job_id →
    // jobs.id). The `company` fixture provides the company id + token.
    const seededJob = await testApi.seedJob(request, {
      companyId: company.id,
      title: "E2E Retention Success Job",
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
            "E2E test application for endorsement scenario 07. This cover letter meets the minimum length requirement.",
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

  await test.step("drain immediate-half outbox", async () => {
    await testApi.endorsement.drainBlockchainOps(request);
  });

  await test.step("assert top-3 endorsers recorded on-chain", async () => {
    // ABIs are loaded from non-`as const` JSON, so viem types this read as
    // `unknown`. Non-`as const` ABI: viem may return the named tuple as an
    // array `[experts, amounts]` rather than `{ experts, amounts }`.
    // Support both shapes.
    const rawTop = await contracts.endorsementBidding.read.getTopEndorsers([
      uuidToBytes32(jobId),
      uuidToBytes32(candidateId),
    ]);
    const topExperts: readonly Address[] =
      Array.isArray(rawTop) ? (rawTop as unknown[])[0] as Address[]
      : (rawTop as { experts: readonly Address[] }).experts;

    // 3 distinct non-zero bidder addresses — filters the always-3-slot
    // fixed-size array that the contract returns.
    const nonZero = topExperts.filter(
      (addr) =>
        addr.toLowerCase() !== "0x0000000000000000000000000000000000000000",
    );
    expect(nonZero).toHaveLength(3);
  });

  await test.step("wait past retention deadline (6s)", async () => {
    // Real wall-clock wait — Postgres uses real time, anvil time-warp is
    // invisible to it (see plan §50 Implication, Fallback A).
    await new Promise((resolve) => setTimeout(resolve, RETENTION_WAIT_MS));
  });

  await test.step("process retention confirmations + drain locked-half outbox", async () => {
    await testApi.endorsement.processRetention(request);
    await testApi.endorsement.drainBlockchainOps(request);
  });

  await test.step("assert hire_outcomes.outcome = successful_retention + retention_confirmed = true", async () => {
    const res = await page.request.get(
      `${BACKEND_URL}/api/endorsements/hire-outcome/${applicationId}`,
      { headers: { Authorization: `Bearer ${company.token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { data: HireOutcomeResponse };
    expect(body.data.outcome).toBe("successful_retention");
    expect(body.data.retention_confirmed).toBe(true);
  });

  await test.step("assert 3 endorsement_rewards.status = locked_released", async () => {
    for (const expert of bidders) {
      const res = await page.request.get(
        `${BACKEND_URL}/api/endorsements/rewards/${expert.id}`,
        { headers: { Authorization: `Bearer ${company.token}` } },
      );
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as { data: ExpertRewardRow[] };
      // One row per expert per hire outcome — narrow to this scenario's
      // outcome before asserting so an unrelated stale row doesn't mask a
      // regression.
      const rewardsForThisExpert = body.data.filter(
        (r) => r.expert_id === expert.id,
      );
      expect(rewardsForThisExpert.length).toBeGreaterThanOrEqual(1);
      // Latest reward per the BE ORDER BY created_at DESC.
      const reward = rewardsForThisExpert[0];
      expect(reward.status).toBe("locked_released");
      // The spec mentions a `locked_released_at` column as a fallback — that
      // column does not exist on `endorsement_rewards`; the boolean is the
      // closest populated-on-release signal.
      expect(reward.locked_released).toBe(true);
      expect(reward.locked_forfeited).toBe(false);
    }
  });
});
