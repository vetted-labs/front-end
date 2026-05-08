// e2e/real-flow/helpers/endorsement.ts
import { keccak256, parseEther, toHex, type Hex } from "viem";
import type { APIRequestContext } from "@playwright/test";
import type { Expert } from "../fixtures";
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
  const txHash = await contracts.endorsementBidding.write.withdrawRefund(
    [],
    { account: expert.client.account },
  );
  return { txHash };
}

// POST /api/endorsements/hire-outcome — verifyCompanyToken middleware.
export async function recordHireOutcome(
  request: APIRequestContext,
  companyToken: string,
  applicationId: string,
  outcome: "hired" | "not_hired",
  finalCompensation?: number,
): Promise<{ id: string }> {
  const res = await request.post(`${BACKEND_URL}/api/endorsements/hire-outcome`, {
    headers: { Authorization: `Bearer ${companyToken}` },
    data: { applicationId, outcome, finalCompensation },
  });
  if (!res.ok()) throw new Error(`recordHireOutcome failed: ${await res.text()}`);
  return (await res.json()).data;
}

// POST /api/endorsements/performance-issue — verifyCompanyToken middleware.
export async function reportPerformanceIssue(
  request: APIRequestContext,
  companyToken: string,
  applicationId: string,
  notes: string,
  rating?: number,
): Promise<void> {
  const res = await request.post(`${BACKEND_URL}/api/endorsements/performance-issue`, {
    headers: { Authorization: `Bearer ${companyToken}` },
    data: { applicationId, notes, rating },
  });
  if (!res.ok()) throw new Error(`reportPerformanceIssue failed: ${await res.text()}`);
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
  const res = await request.post(`${BACKEND_URL}/api/endorsements/disputes/${disputeId}/vote`, {
    headers: { Authorization: `Bearer ${expertToken}` },
    data: { vote },
  });
  if (!res.ok()) throw new Error(`castDisputeVote failed: ${await res.text()}`);
}
