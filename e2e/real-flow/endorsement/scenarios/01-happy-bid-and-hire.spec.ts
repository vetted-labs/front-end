// e2e/real-flow/endorsement/scenarios/01-happy-bid-and-hire.spec.ts
//
// Suite B — Scenario 01: happy-bid-and-hire.
//
// Canonical happy path for the endorsement-bidding flow: a company job is
// seeded, the candidate applies to it, three experts place increasing on-chain
// bids on (jobId, candidateId), each bid is synced to the BE
// endorsement_bids table, the company records `hired`, the BE outbox is
// drained so the immediate-half rewards reach `RewardDistributor`, and the
// top-3 endorsers + reward rows are asserted on both sides (chain + BE).
//
// This is the first scenario in Suite B and doubles as a smoke test for the
// Suite B helper stack (`helpers/endorsement.ts`, the `experts` worker
// fixture, and the test-API blockchain-ops drain).
//
// Bid sync: after each on-chain `placeBid`, we call
// `POST /api/blockchain/endorsements/sync` with `walletAddress` in the body.
// The `identifyExpertWallet` middleware resolves expert identity from the
// wallet address (no SIWE required) so the BE can write the `endorsement_bids`
// row that `hire_outcomes` needs to calculate rewards.
//
// Critical concern — bytes32 conversion for jobId/candidateId:
//   `placeBid` calls `uuidToBytes32(jobId)` (`keccak256(toHex(uuid))`). If the
//   BE bid-recording / hire-outcome path uses a different recipe — or doesn't
//   bother with bytes32 at all — the on-chain bid will not surface in
//   `getTopEndorsers([uuidToBytes32(jobId), uuidToBytes32(candidateId)])`. We
//   surface this via a specific assertion on `top.experts.length === 3`; an
//   empty result means recipe drift.

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

// Shape of one row returned by `GET /api/endorsements/rewards/:expertId`. We
// only read the fields we assert on — the rest are left optional so a BE
// projection change doesn't blow up the type-check.
type ExpertRewardRow = {
  id: string;
  expert_id: string;
  hire_outcome_id: string;
  status: string;
  total_reward: string;
  immediate_reward: string;
  locked_reward: string;
};

test("happy bid and hire: 3 bids, candidate hired, rewards distributed", async ({
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
  // Hoisted bindings so later steps can read what step 1 produced. Resolved
  // inside the relevant `test.step` so any error inside the step is attributed
  // correctly in the trace viewer.
  let applicationId!: string;
  let jobId!: string;
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
      title: "E2E Endorsement Test Job",
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
            "E2E test application for endorsement scenario 01. This cover letter meets the minimum length requirement.",
        },
      },
    );
    expect(applyRes.ok()).toBeTruthy();
    const applyBody = (await applyRes.json()) as {
      data: { id: string };
    };
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
      // `identifyExpertWallet` resolves expert identity from wallet address
      // (no SIWE required — pass `walletAddress` in the body).
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

  await test.step("assert top-3 endorsers recorded on-chain", async () => {
    // ABIs are loaded from non-`as const` JSON so viem types this read as
    // `unknown`. The Solidity signature is `(address[3] experts, uint256[3]
    // amounts)` — named-return tuples come back from viem as
    // `{ experts, amounts }`. Cast to that shape so the tuple is statically
    // indexable; the contract guarantees 3 slots (`MAX_ENDORSEMENTS = 3`)
    // even when fewer bids are placed (zero-address sentinels fill empty
    // ranks), so we filter those out before counting.
    // Non-`as const` ABI: viem may return the named tuple as an array
    // `[experts, amounts]` rather than `{ experts, amounts }`. Support both.
    const rawTop = await contracts.endorsementBidding.read.getTopEndorsers([
      uuidToBytes32(jobId),
      uuidToBytes32(candidateId),
    ]);
    const topExperts: readonly Address[] =
      Array.isArray(rawTop) ? (rawTop as unknown[])[0] as Address[]
      : (rawTop as { experts: readonly Address[] }).experts;
    const topAmounts: readonly bigint[] =
      Array.isArray(rawTop) ? (rawTop as unknown[])[1] as bigint[]
      : (rawTop as { amounts: readonly bigint[] }).amounts;

    const nonZero = topExperts.filter(
      (addr) =>
        addr.toLowerCase() !== "0x0000000000000000000000000000000000000000",
    );
    expect(nonZero).toHaveLength(3);
    // Sanity-check: amounts non-increasing (rank 1 = highest bid). Bids were
    // 1, 2, 3 VETD — so rank 1 is the 3-VETD bidder, rank 3 is the 1-VETD
    // bidder. The fixed-size array preserves rank ordering even with sentinels.
    expect(topAmounts[0]).toBeGreaterThan(0n);
    expect(topAmounts[0]).toBeGreaterThanOrEqual(topAmounts[1]);
    expect(topAmounts[1]).toBeGreaterThanOrEqual(topAmounts[2]);
  });

  await test.step("assert BE rewards positive for each bidder", async () => {
    // BE returns an array of EndorsementRewardRow + outcome columns; we assert
    // the most-recent row (DESC by created_at per the BE ORDER BY) has a
    // positive total_reward. This is the BE-side mirror of the on-chain
    // reward-distributed event the outbox drain just dispatched.
    for (const expert of bidders) {
      const res = await page.request.get(
        `${BACKEND_URL}/api/endorsements/rewards/${expert.id}`,
        { headers: { Authorization: `Bearer ${company.token}` } },
      );
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as { data: ExpertRewardRow[] };
      const rewardsForThisExpert = body.data.filter(
        (r) => r.expert_id === expert.id,
      );
      expect(rewardsForThisExpert.length).toBeGreaterThanOrEqual(1);
      const reward = rewardsForThisExpert[0];
      // total_reward is a numeric Postgres column (USD, not wei) returned as a
      // string with decimal precision. Parse as float before comparing.
      expect(parseFloat(reward.total_reward)).toBeGreaterThan(0);
    }
  });

  await test.step("UI spot-check: applications list renders the application", async () => {
    // The candidate UI job-applications list. The closest stable smoke check
    // is asserting the list page loaded and the row for our application is
    // visible by the job title we seeded.
    await page.goto(`/candidate/applications`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByText(/E2E Endorsement Test Job/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
