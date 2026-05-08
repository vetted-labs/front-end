// e2e/real-flow/endorsement/scenarios/08-bid-already-exists-rejection.spec.ts
//
// Suite B — Scenario 08: bid-already-exists-rejection.
//
// The smallest endorsement scenario. Purely on-chain — no hire flow, no BE
// outcome bookkeeping, no UI assertion. We exercise the
// `EndorsementBidding.bids[jobId][candidateId][expert]` uniqueness invariant
// from `smart-contracts/src/staking/EndorsementBidding.sol:684`:
//
//   if (bids[jobId][candidateId][msg.sender].amount > 0)
//       revert BidAlreadyExists();
//
// Flow:
//   1. Approve experts[0] (the bidder) on EndorsementBidding so
//      `safeTransferFrom` can pull the bid amount.
//   2. Apply candidate via `applyToGuildViaUI`. Plain guild applications have
//      no associated Job posting (`job_id = NULL` on the BE row), so we
//      synthesize a fresh UUID for jobId and pull the candidate's UUID from
//      `/api/candidates/me`. Same pattern as scenario 03.
//   3. `createJob` from anvil account 5 — the creator is forbidden from
//      bidding on their own job (`CreatorCannotBid`, L678), so it must NOT
//      be experts[0..3] used by the fixture.
//   4. experts[0] places a 1 VETD bid.
//   5. experts[0] tries to place a SECOND bid on the same `(jobId, candidateId)`.
//      Expect the call to revert with `BidAlreadyExists`.
//   6. Read `bids(jobId, candidateId, experts[0])` on-chain and assert the
//      stored amount is still 1 VETD (i.e. the failed second tx didn't
//      mutate state).
//
// Out of scope (per the task spec):
//   - The mocked-suite asserts the FE error toast on failed bids; this
//     real-flow scenario explicitly does not. We assert revert + on-chain
//     state only.
//   - We do not call the BE hire/finalize/refund endpoints.

import { test, expect } from "../../fixtures";
import {
  approveExpertsForBidding,
  createJob,
  placeBid,
  uuidToBytes32,
} from "../../helpers/endorsement";
import { applyToGuildViaUI } from "../../helpers/scenario";
import { ANVIL_KEYS, makeWallet } from "../../helpers/chain";
import { parseEther, type Address } from "viem";
import { randomUUID } from "node:crypto";

// Indexable view of the `bids(bytes32,bytes32,address)` tuple. The ABI is
// loaded from a non-`as const` JSON, so viem types `read.bids(...)` as
// `unknown`. We cast to this tuple shape to reach `amount` (slot 1) without
// `any`. Mirror of `struct Bid` in `EndorsementBidding.sol:189`.
type BidTuple = readonly [
  Address, // expert
  bigint, // amount
  bigint, // timestamp
  boolean, // isActive
];

test("bid-already-exists rejection: 2nd placeBid by same expert reverts on-chain", async ({
  page,
  candidate,
  guild,
  experts,
  contracts,
  cleanState: _cleanState,
}) => {
  // The bidder. Must NOT also be the job creator (CreatorCannotBid, L678).
  const bidder = experts[0];
  // Anvil account 5 — outside the experts[0..3] fixture range, holds VETD
  // from the dev mint script, and avoids `CreatorCannotBid` because it
  // never bids. Same convention as scenario 03.
  const jobCreator = makeWallet(ANVIL_KEYS[5]);

  // Resolved inside step 2 so the trace viewer attributes errors correctly.
  let jobId!: string;
  let candidateId!: string;

  await test.step("approve bidder for VETD spend on EndorsementBidding", async () => {
    await approveExpertsForBidding([bidder], contracts);
  });

  await test.step("apply candidate via UI; capture candidateId; synthesize jobId", async () => {
    // The applicationId / sessionId from `applyToGuildViaUI` are unused for
    // this purely-on-chain scenario; we only need the candidate UUID, which
    // `getMyCandidateProposals` does NOT project. Pull it from
    // `/api/candidates/me` (candidate session cookie attached via `page.request`).
    await applyToGuildViaUI(page, candidate, guild.id);
    const meRes = await page.request.get(`/api/candidates/me`);
    expect(meRes.ok()).toBeTruthy();
    const me = (await meRes.json()) as { data: { id: string } };
    candidateId = me.data.id;
    // Synthesize jobId — plain guild applications have no Job posting.
    jobId = randomUUID();
  });

  await test.step("create on-chain job (creator != bidder)", async () => {
    await createJob(jobCreator, contracts, jobId);
  });

  await test.step("first bid: 1 VETD as experts[0]", async () => {
    await placeBid(bidder, contracts, jobId, candidateId, "1");
  });

  await test.step("second bid by same expert reverts with BidAlreadyExists", async () => {
    const secondBidPromise = placeBid(
      bidder,
      contracts,
      jobId,
      candidateId,
      "1",
    );
    await expect(secondBidPromise).rejects.toThrow(/BidAlreadyExists/);
  });

  await test.step("on-chain bid amount is unchanged (still 1 VETD)", async () => {
    const stored = (await contracts.endorsementBidding.read.bids([
      uuidToBytes32(jobId),
      uuidToBytes32(candidateId),
      bidder.address,
    ])) as BidTuple;
    // amount slot = 1. Should equal the original 1 VETD, NOT 2 VETD — the
    // second tx must have reverted before any state mutation.
    expect(stored[1]).toBe(parseEther("1"));
  });
});
