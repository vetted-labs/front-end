// e2e/real-flow/helpers/scenario.ts
//
// Suite A scenario primitives. These are thin building blocks shared by every
// commit-reveal vetting scenario in `e2e/real-flow/__tests__/`. They wrap UI
// flows, on-chain writes, anvil time-warping, and BE cron triggers so that
// individual `*.spec.ts` files read like a story rather than plumbing.
//
// IMPORTANT — commit-hash recipe is **derived from the on-chain contract**.
// `VettingManager._revealVote` (smart-contracts/src/VettingManager.sol:567)
// asserts:
//
//   keccak256(abi.encodePacked(sessionId, panelist, score, salt))
//
// where `sessionId` is `bytes32`, `panelist` is `address`, `score` is `uint8`,
// and `salt` is `bytes32`. We replicate that exact ordering with viem's
// `encodePacked` to avoid hash-mismatch bugs from bytes-encoding subtleties.
// There is no public `computeCommitHash` view on the contract today; if one is
// added later, prefer calling it via viem (`contracts.vettingManager.read.*`)
// rather than recomputing here.

import { encodePacked, keccak256, toHex, type Hex } from "viem";
import type { APIRequestContext, Page } from "@playwright/test";
import type { Expert, Candidate } from "../fixtures";
import type { ContractHandles } from "./contracts";
import type { AnvilHandle } from "./chain";
import { cronApi, BACKEND_URL } from "./backend";

/**
 * Submit a candidate guild-application directly via the BE API and return the
 * resulting application + on-chain session id. The BE schema
 * (`submitGuildApplicationSchema`) treats `resumeUrl` and `noAiDeclaration` as
 * optional, so we skip the FE form's resume-upload + multi-step wizard which
 * is brittle to drive headlessly. Candidate-side UI is still exercised by the
 * end-of-scenario spot check on `/candidate/applications`.
 *
 * Caller must be signed in as `candidate` (the `candidate` fixture handles
 * that — sets `authToken` in localStorage).
 */
export async function applyToGuildViaUI(
  page: Page,
  candidate: Candidate,
  guildId: string,
): Promise<{ applicationId: string; sessionId: Hex }> {
  // Use the candidate's JWT directly — going through localStorage is fragile
  // because navigating to authed routes can trigger the FE AuthContext to
  // clear the token if any sub-fetch fails during hydration.
  const token = candidate.token;

  // Submit directly. BE schema accepts arbitrary `answers` and treats other
  // fields as optional.
  const submitRes = await page.request.post(
    `${BACKEND_URL}/api/guilds/${encodeURIComponent(guildId)}/applications`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        answers: {
          motivation: "E2E test answer covering motivation and intent thoroughly enough to pass min-length checks.",
          experience: "E2E test answer covering professional experience and expertise depth thoroughly.",
          domain_topic: "E2E test domain answer with sufficient detail to satisfy validation requirements.",
        },
        level: "experienced",
        noAiDeclaration: true,
      },
    },
  );
  if (!submitRes.ok()) {
    throw new Error(
      `applyToGuildViaUI: submit failed ${submitRes.status()} ${await submitRes.text()}`,
    );
  }

  // Read application ID + candidate_proposal_id from the BE.
  const fetchApplications = async () => {
    const r = await page.request.get(
      `${BACKEND_URL}/api/candidates/me/guild-applications`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return (await r.json()) as {
      data: Array<{
        id: string;
        candidate_proposal_id?: string | null;
        candidateProposalId?: string | null;
        on_chain_session_id?: string | null;
        blockchain_session_id?: string | null;
        blockchainSessionId?: string | null;
      }>;
    };
  };

  const initial = await fetchApplications();
  const app = initial.data[0];
  if (!app) throw new Error("applyToGuildViaUI: no applications returned after submit");

  const proposalId = app.candidate_proposal_id ?? app.candidateProposalId;
  if (!proposalId) {
    throw new Error(
      `applyToGuildViaUI: BE did not link a candidate_proposal for application ${app.id}. ` +
        `This usually means reviewer assignment failed (check BE log for "Reviewer assignment failed").`,
    );
  }

  // Enable commit-reveal (transitions proposal direct→commit + queues
  // create_vetting_session in pending_blockchain_ops outbox), then drain the
  // outbox so the on-chain session actually exists when experts try to vote.
  await cronApi.enableCommitReveal(page.request, proposalId);
  await cronApi.drainBlockchainOps(page.request);

  // Re-fetch — blockchain_session_id should now be populated.
  const after = await fetchApplications();
  const refreshed = after.data.find((row) => row.id === app.id) ?? app;
  const rawSessionId =
    refreshed.on_chain_session_id ??
    refreshed.blockchain_session_id ??
    refreshed.blockchainSessionId;
  if (!rawSessionId) {
    throw new Error(
      `applyToGuildViaUI: BE did not populate blockchain_session_id after enable+drain for application ${app.id}`,
    );
  }
  return { applicationId: app.id, sessionId: rawSessionId as Hex };
}

/**
 * Random 32-byte salt suitable for use as the `salt` argument to the
 * commit-reveal hash. Returns a `0x`-prefixed lowercase hex string.
 */
export function generateNonce(): Hex {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

/**
 * Replicates `keccak256(abi.encodePacked(sessionId, panelist, score, salt))`
 * from `VettingManager._revealVote`. `score` is cast to `uint8` because the
 * on-chain score domain is 1-10.
 */
export function commitHash(
  sessionId: Hex,
  panelist: `0x${string}`,
  score: number,
  nonce: Hex,
): Hex {
  return keccak256(
    encodePacked(
      ["bytes32", "address", "uint8", "bytes32"],
      [sessionId, panelist, score, nonce],
    ),
  );
}

/**
 * Submit a commit (hashed vote) on behalf of `expert`. Returns the salt the
 * caller must hand back to `expertReveal` for that same `(sessionId, expert)`.
 */
export async function expertCommit(
  expert: Expert,
  contracts: ContractHandles,
  sessionId: Hex,
  score: number,
): Promise<{ nonce: Hex; txHash: Hex }> {
  const nonce = generateNonce();
  const hash = commitHash(sessionId, expert.address, score, nonce);
  const txHash = await contracts.vettingManager.write.commitVote(
    [sessionId, hash],
    { account: expert.client.account },
  );
  return { nonce, txHash };
}

/**
 * Reveal a previously-committed vote. The contract recomputes the hash from
 * `(sessionId, msg.sender, score, salt)` and reverts if it doesn't match the
 * stored commitment.
 */
export async function expertReveal(
  expert: Expert,
  contracts: ContractHandles,
  sessionId: Hex,
  score: number,
  nonce: Hex,
): Promise<{ txHash: Hex }> {
  const txHash = await contracts.vettingManager.write.revealVote(
    [sessionId, score, nonce],
    { account: expert.client.account },
  );
  return { txHash };
}

/**
 * Thin wrapper around `anvil.increaseTime` so spec files read declaratively
 * (`await advanceTime(anvil, COMMIT_WINDOW)` instead of poking RPC directly).
 */
export async function advanceTime(anvil: AnvilHandle, seconds: number): Promise<void> {
  await anvil.increaseTime(seconds);
}

/**
 * Trigger the BE cron that promotes commit-reveal lifecycle phases for expert
 * applications (Commit -> Reveal -> Finalized/Expired mirror jobs).
 */
export async function fireExpertTransitions(request: APIRequestContext): Promise<void> {
  await cronApi.processExpertTransitions(request);
}

/**
 * Owner-side verifiable finalization. The fixture must pick an expert wallet
 * that has the `onlyOwner` role on `VettingManager`; in the local Deploy
 * script that's anvil account 0, but the test fixture currently uses one of
 * the panelists — we accept whichever wallet the caller hands us and let the
 * contract revert if it isn't owner.
 */
export async function finalize(
  expert: Expert,
  contracts: ContractHandles,
  sessionId: Hex,
): Promise<void> {
  await contracts.vettingManager.write.finalizeSessionVerifiable(
    [sessionId],
    { account: expert.client.account },
  );
}

/**
 * Anyone can call `expireSession` once both deadlines have passed without a
 * finalize. We accept an `Expert` purely to reuse its viem wallet client.
 */
export async function expireSession(
  expert: Expert,
  contracts: ContractHandles,
  sessionId: Hex,
): Promise<void> {
  await contracts.vettingManager.write.expireSession(
    [sessionId],
    { account: expert.client.account },
  );
}
