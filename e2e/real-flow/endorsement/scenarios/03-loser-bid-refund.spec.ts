// e2e/real-flow/endorsement/scenarios/03-loser-bid-refund.spec.ts
//
// Suite B — Scenario 03: loser-bid-refund.
//
// Pure on-chain test of the EndorsementBidding top-3 displacement + refund
// flow. Four experts each place an increasing bid on the SAME candidate for
// the SAME job; the smallest bid (experts[0]) gets pushed out of the top 3
// and lands in `pendingRefunds`. We then withdraw and assert balance returns
// to the bidder.
//
// Why no BE outcome step: this scenario does not exercise hire-outcome,
// reward distribution, or the BE endorsement sync queue — those are covered
// in other Suite B scenarios. The candidate UI may not reflect bids placed
// directly via the contract (no BE record exists), so we only soft-check
// `getTopEndorsers` to confirm the on-chain top 3 was set correctly.
//
// Notes / known mismatches with the plan:
//   1. The plan says "read job_id from `/api/candidates/me/guild-applications`".
//      Plain guild applications (the only flow `applyToGuildViaUI` exercises)
//      have `job_id = NULL` because no Job posting is involved. Since this
//      scenario is purely on-chain, we synthesize a fresh UUID for `jobId`
//      and call `createJob` ourselves before any bids are placed.
//   2. `EndorsementBidding.placeBid` reverts unless `createJob(jobId)` has
//      been called first AND the caller is not the job creator. We use the
//      `jobCreator` fixture (wallet outside experts[0..3]) as the creator,
//      which has VETD topped up by `cleanState`. This avoids `CreatorCannotBid`.
//   3. `pendingRefunds` is a public mapping in Solidity, so viem reads via
//      `read.pendingRefunds([address])` (single-element args array per viem
//      convention).
//   4. The `candidate.candidateId` fixture field already holds the UUID from
//      signup — no guild-application step or `GET /api/candidates/me` round-trip
//      is needed. The previous approach (applyToGuildViaUI + HTTP fetch) was
//      redundant and caused the scenario to fail when the commit-reveal drain
//      raced with the subsequent `/api/candidates/me` request.

import { test, expect } from "../../fixtures";
import {
  approveExpertsForBidding,
  createJob,
  placeBid,
  withdrawRefund,
  uuidToBytes32,
} from "../../helpers/endorsement";
import { parseEther, type Address } from "viem";
import { randomUUID } from "node:crypto";

// Top-3 view returned by `getTopEndorsers(jobId, candidateId)`. The ABI is
// loaded from a non-`as const` JSON, so viem types the read as `unknown`. We
// cast to this tuple shape to inspect the experts/amounts arrays without
// `any`.
type TopEndorsersTuple = readonly [
  readonly [Address, Address, Address],
  readonly [bigint, bigint, bigint],
];

test("loser-bid refund: 4th expert displaces lowest, refund withdraws cleanly", async ({
  candidate,
  experts,
  contracts,
  jobCreator,
  anvil,
  cleanState: _cleanState,
}) => {
  // candidateId comes directly from the `candidate` fixture (set during signup).
  // No guild-application step is needed — this scenario is purely on-chain and
  // only requires a UUID to identify the candidate in the bidding contract.
  const candidateId = candidate.candidateId;

  // jobCreator fixture: pre-funded wallet whose VETD balance is topped up by
  // cleanState. Cannot bid (distinct address from experts[0..3]); this avoids
  // the contract's `CreatorCannotBid` revert.
  const bidders = experts.slice(0, 4);
  let jobId!: string;

  await test.step("approve experts for bidding", async () => {
    await approveExpertsForBidding(bidders, contracts);
  });

  await test.step("synthesize jobId + createJob on-chain", async () => {
    // Plain guild applications have no associated Job posting; synthesize a
    // fresh UUID so `placeBid` has a valid on-chain job to attach to.
    jobId = randomUUID();
    await createJob(jobCreator, contracts, jobId);
  });

  await test.step("4 sequential bids: 1, 2, 3, 4 VETD", async () => {
    // experts[3]'s 4 VETD bid displaces experts[0]'s 1 VETD bid out of the
    // top 3, sending experts[0]'s stake to `pendingRefunds`.
    await placeBid(bidders[0], contracts, jobId, candidateId, "1");
    await placeBid(bidders[1], contracts, jobId, candidateId, "2");
    await placeBid(bidders[2], contracts, jobId, candidateId, "3");
    await placeBid(bidders[3], contracts, jobId, candidateId, "4");
  });

  await test.step("assert experts[0] has 1 VETD pending refund", async () => {
    const pending = (await contracts.endorsementBidding.read.pendingRefunds([
      bidders[0].address,
    ])) as bigint;
    expect(pending).toBe(parseEther("1"));
  });

  await test.step("soft-check top-3 on-chain matches expected ordering", async () => {
    // Top 3 should be experts[3] (4), experts[2] (3), experts[1] (2). We do
    // a soft-check (not a hard ordering assert against unrelated mechanics)
    // because the contract's insertion ordering for equal bids could shift
    // in future revisions; we only assert that experts[0] is NOT in the top
    // and the displacing bidder IS.
    const top = (await contracts.endorsementBidding.read.getTopEndorsers([
      uuidToBytes32(jobId),
      uuidToBytes32(candidateId),
    ])) as TopEndorsersTuple;
    const topAddrs = top[0].map((a) => a.toLowerCase());
    expect(topAddrs).not.toContain(bidders[0].address.toLowerCase());
    expect(topAddrs).toContain(bidders[3].address.toLowerCase());
  });

  await test.step("capture experts[0] VETD balance pre-withdraw", async () => {
    // Captured here to keep the read close to the withdraw call.
    const balanceBefore = (await contracts.vettedToken.read.balanceOf([
      bidders[0].address,
    ])) as bigint;

    const { txHash } = await withdrawRefund(bidders[0], contracts);
    // Wait for the receipt so we know the tx was mined and assert it succeeded.
    // Without this, a reverting withdrawRefund would return a hash silently and
    // the pendingRefunds read below would show the uncleared balance.
    const receipt = await anvil.publicClient.waitForTransactionReceipt({ hash: txHash });
    expect(receipt.status).toBe("success");

    const pendingAfter =
      (await contracts.endorsementBidding.read.pendingRefunds([
        bidders[0].address,
      ])) as bigint;
    expect(pendingAfter).toBe(0n);

    const balanceAfter = (await contracts.vettedToken.read.balanceOf([
      bidders[0].address,
    ])) as bigint;
    expect(balanceAfter - balanceBefore).toBe(parseEther("1"));
  });
});
