// e2e/real-flow/helpers/endorsement.ts
import { keccak256, parseEther, toHex, type Hex } from "viem";
import type { APIRequestContext } from "@playwright/test";
import type { Expert } from "../fixtures";
import type { Wallet } from "./chain";
import type { ContractHandles } from "./contracts";
import { BACKEND_URL } from "./backend";

const MAX_UINT256 = 2n ** 256n - 1n;

// Convert UUID to bytes32 by keccak256 hashing (mirrors BE convention in
// `commit-reveal.service.ts`: `keccak256(toUtf8Bytes(id))`).
export function uuidToBytes32(uuid: string): Hex {
  return keccak256(toHex(uuid));
}

export async function approveExpertsForBidding(
  experts: Expert[],
  contracts: ContractHandles,
): Promise<void> {
  for (const e of experts) {
    await contracts.vettedToken.write.approve(
      [contracts.endorsementBidding.address, MAX_UINT256],
      { account: e.client.account },
    );
  }
}

/**
 * Calls `EndorsementBidding.createJob(jobId)` from a non-expert wallet. Required
 * before any expert can `placeBid` against the job (the contract reverts with
 * `InvalidJob` if `jobs[jobId].creator == 0`). The creator is also forbidden
 * from bidding on their own job, so this MUST be a wallet that no expert in the
 * scenario uses. The creator must hold + have approved at least `minimumBid`
 * VETD (1 VETD by default) for the anti-spam fee.
 */
export async function createJob(
  creator: Wallet,
  contracts: ContractHandles,
  jobId: string,
): Promise<{ txHash: Hex }> {
  // Approve the creation fee (uses MAX_UINT256 to keep this idempotent across
  // repeated calls in the same test).
  await contracts.vettedToken.write.approve(
    [contracts.endorsementBidding.address, MAX_UINT256],
    { account: creator.client.account },
  );
  const txHash = await contracts.endorsementBidding.write.createJob(
    [uuidToBytes32(jobId)],
    { account: creator.client.account },
  );
  return { txHash };
}

export async function placeBid(
  expert: Expert,
  contracts: ContractHandles,
  jobId: string,
  candidateId: string,
  amountVetd: string,
): Promise<{ txHash: Hex }> {
  const txHash = await contracts.endorsementBidding.write.placeBid(
    [uuidToBytes32(jobId), uuidToBytes32(candidateId), parseEther(amountVetd)],
    { account: expert.client.account },
  );
  return { txHash };
}

export async function withdrawRefund(
  expert: Expert,
  contracts: ContractHandles,
): Promise<{ txHash: Hex }> {
  // withdrawRefund() takes no on-chain args; pass [] then options.
  const txHash = await contracts.endorsementBidding.write.withdrawRefund([], {
    account: expert.client.account,
  });
  return { txHash };
}

// POST /api/endorsements/hire-outcome — verifyCompanyToken middleware.
// BE schema (`recordHireOutcomeSchema`) requires applicationId, candidateId,
// jobId, outcome, and finalCompensation when outcome === "hired".
export async function recordHireOutcome(
  request: APIRequestContext,
  companyToken: string,
  args: {
    applicationId: string;
    candidateId: string;
    jobId: string;
    outcome: "hired" | "not_hired";
    finalCompensation?: number;
  },
): Promise<{ id: string }> {
  const res = await request.post(
    `${BACKEND_URL}/api/endorsements/hire-outcome`,
    {
      headers: { Authorization: `Bearer ${companyToken}` },
      data: {
        applicationId: args.applicationId,
        candidateId: args.candidateId,
        jobId: args.jobId,
        outcome: args.outcome,
        finalCompensation: args.finalCompensation,
      },
    },
  );
  if (!res.ok())
    throw new Error(`recordHireOutcome failed: ${await res.text()}`);
  return (await res.json()).data;
}

// POST /api/endorsements/performance-issue — verifyCompanyToken middleware.
// BE controller reads `performanceNotes` + `companyRating`; remap on the wire.
export async function reportPerformanceIssue(
  request: APIRequestContext,
  companyToken: string,
  applicationId: string,
  notes: string,
  rating?: number,
): Promise<void> {
  const res = await request.post(
    `${BACKEND_URL}/api/endorsements/performance-issue`,
    {
      headers: { Authorization: `Bearer ${companyToken}` },
      data: { applicationId, performanceNotes: notes, companyRating: rating },
    },
  );
  if (!res.ok())
    throw new Error(`reportPerformanceIssue failed: ${await res.text()}`);
}

// POST /api/endorsements/disputes — verifyAnyUser middleware (company or expert).
export async function fileDispute(
  request: APIRequestContext,
  expertToken: string,
  hireOutcomeId: string,
  reason: string,
  evidence?: string,
): Promise<{ id: string }> {
  const res = await request.post(`${BACKEND_URL}/api/endorsements/disputes`, {
    headers: { Authorization: `Bearer ${expertToken}` },
    data: { hireOutcomeId, reason, evidence },
  });
  if (!res.ok()) throw new Error(`fileDispute failed: ${await res.text()}`);
  return (await res.json()).data;
}

// POST /api/endorsements/disputes/:disputeId/vote — verifyExpertToken middleware.
export async function castDisputeVote(
  request: APIRequestContext,
  expertToken: string,
  disputeId: string,
  vote: "uphold" | "dismiss",
): Promise<void> {
  const res = await request.post(
    `${BACKEND_URL}/api/endorsements/disputes/${disputeId}/vote`,
    {
      headers: { Authorization: `Bearer ${expertToken}` },
      data: { vote },
    },
  );
  if (!res.ok()) throw new Error(`castDisputeVote failed: ${await res.text()}`);
}
