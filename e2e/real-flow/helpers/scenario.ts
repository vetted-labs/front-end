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

import fs from "node:fs";
import path from "node:path";
import { encodePacked, keccak256, toHex, type Hex } from "viem";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import type { Expert, Candidate } from "../fixtures";
import type { ContractHandles } from "./contracts";
import type { AnvilHandle } from "./chain";
import { makeWallet } from "./chain";
import { cronApi, testApi, BACKEND_URL } from "./backend";

/**
 * Resolve the backend service wallet — the `onlyOwner` account on the
 * VettingManager (see bootstrap/setup-stack.ts `authorizeBackendWallet`).
 * Read straight from backend/.env.e2e so the test and the running e2e backend
 * agree on the same key. Memoized.
 */
let _backendWallet: ReturnType<typeof makeWallet> | null = null;
function backendOwnerWallet(): ReturnType<typeof makeWallet> {
  if (_backendWallet) return _backendWallet;
  const envPath = path.resolve(__dirname, "../../../../backend/.env.e2e");
  const raw = fs.readFileSync(envPath, "utf-8");
  let key: string | undefined;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    if (trimmed.slice(0, sep).trim() !== "BACKEND_WALLET_PRIVATE_KEY") continue;
    key = trimmed.slice(sep + 1).trim().replace(/^['"]|['"]$/g, "");
    break;
  }
  if (!key || !/^0x[a-fA-F0-9]{64}$/.test(key)) {
    throw new Error(
      "scenario: BACKEND_WALLET_PRIVATE_KEY missing/invalid in backend/.env.e2e",
    );
  }
  _backendWallet = makeWallet(key as Hex);
  return _backendWallet;
}

/**
 * Submit a candidate guild-application directly via the BE API and return the
 * resulting application + on-chain session id. The BE schema
 * (`submitGuildApplicationSchema`) treats `resumeUrl` and `noAiDeclaration` as
 * optional, so we skip the FE form's resume-upload + multi-step wizard which
 * is brittle to drive headlessly. Candidate-side UI is still exercised by the
 * end-of-scenario spot check on `/candidate/applications`.
 *
 * The guild-application path now routes through Pipeline B: the BE creates a
 * linked `candidate_proposals` row and returns its id as `candidateProposalId`.
 * Reviewer selection at submission time is random; callers that need a
 * deterministic panel (e.g. the headline scenario, which logs each panelist in
 * to review via the UI) pass explicit `reviewerIds` — the `panelFor` fixture's
 * expert ids — and this helper overwrites the panel via the `assign-panel`
 * test fixture before enabling commit-reveal. Callers that don't care which
 * experts are assigned omit it and keep the BE's random panel.
 *
 * Caller must be signed in as `candidate` (the `candidate` fixture handles
 * that — sets `authToken` in localStorage).
 */
export async function applyToGuildViaUI(
  page: Page,
  candidate: Candidate,
  guildId: string,
  reviewerIds?: string[],
): Promise<{ applicationId: string; sessionId: Hex }> {
  // Use the candidate's JWT directly — going through localStorage is fragile
  // because navigating to authed routes can trigger the FE AuthContext to
  // clear the token if any sub-fetch fails during hydration.
  const token = candidate.token;

  // Submit directly. BE schema accepts arbitrary `answers` and treats other
  // fields as optional. Pipeline B: the response carries `candidateProposalId`.
  const submitRes = await page.request.post(
    `${BACKEND_URL}/api/guilds/${encodeURIComponent(guildId)}/applications`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        answers: {
          motivation:
            "E2E test answer covering motivation and intent thoroughly enough to pass min-length checks.",
          experience:
            "E2E test answer covering professional experience and expertise depth thoroughly.",
          domain_topic:
            "E2E test domain answer with sufficient detail to satisfy validation requirements.",
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

  const submitBody = (await submitRes.json()) as {
    data: {
      applicationId: string;
      candidateProposalId?: string | null;
      reviewersAssigned?: number;
    };
  };
  const applicationId = submitBody.data.applicationId;
  if (!applicationId) {
    throw new Error("applyToGuildViaUI: BE did not return an applicationId");
  }
  const proposalId = submitBody.data.candidateProposalId;
  if (!proposalId) {
    throw new Error(
      `applyToGuildViaUI: BE did not link a candidate_proposal for application ${applicationId}. ` +
        `Pipeline B promotion failed (check BE log for "Reviewer assignment failed").`,
    );
  }

  // Overwrite the (randomly selected) panel with the deterministic test panel
  // so the experts that log in and review below are exactly the assigned ones.
  if (reviewerIds && reviewerIds.length > 0) {
    await testApi.candidateReviews.assignPanel(
      page.request,
      applicationId,
      reviewerIds,
    );
  }

  // Read on-chain session id from the BE after enable+drain.
  const fetchApplications = async () => {
    const r = await page.request.get(
      `${BACKEND_URL}/api/candidates/me/guild-applications`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return (await r.json()) as {
      data: Array<{
        id: string;
        on_chain_session_id?: string | null;
        blockchain_session_id?: string | null;
        blockchainSessionId?: string | null;
        blockchain_session_created?: boolean | null;
        blockchainSessionCreated?: boolean | null;
      }>;
    };
  };

  // Enable commit-reveal (transitions proposal direct→commit + queues
  // create_vetting_session in pending_blockchain_ops outbox), then drain the
  // outbox so the on-chain session actually exists when experts try to vote.
  await cronApi.enableCommitReveal(page.request, proposalId);
  await cronApi.drainBlockchainOps(page.request);

  // Re-fetch until the BE has observed the on-chain createSession tx. A
  // populated session id only means the outbox op was queued; reviewers still
  // cannot commit until blockchain_session_created flips true.
  let refreshed: Awaited<ReturnType<typeof fetchApplications>>["data"][number] | undefined;
  await expect
    .poll(
      async () => {
        await cronApi.drainBlockchainOps(page.request).catch(() => undefined);
        const after = await fetchApplications();
        refreshed =
          after.data.find((row) => row.id === applicationId) ?? after.data[0];
        return Boolean(
          refreshed &&
            (refreshed.blockchain_session_created ??
              refreshed.blockchainSessionCreated),
        );
      },
      {
        timeout: 30_000,
        intervals: [500, 1_000, 2_000],
        message: `applyToGuildViaUI: blockchain session should be created for application ${applicationId}`,
      },
    )
    .toBe(true);
  if (!refreshed) {
    throw new Error("applyToGuildViaUI: no applications returned after submit");
  }
  const rawSessionId =
    refreshed.on_chain_session_id ??
    refreshed.blockchain_session_id ??
    refreshed.blockchainSessionId;
  if (!rawSessionId) {
    throw new Error(
      `applyToGuildViaUI: BE did not populate blockchain_session_id after enable+drain for application ${applicationId}`,
    );
  }
  return { applicationId, sessionId: rawSessionId as Hex };
}

/**
 * Submit a candidate guild-application via the BE API and assign a deterministic
 * Pipeline B expert panel — but leave the linked proposal in its initial
 * `direct` voting phase (do NOT enable commit-reveal).
 *
 * This is the direct-vote sibling of `applyToGuildViaUI`. The Pipeline B proposal
 * is created with `voting_phase = 'direct'` and `status = 'ongoing'` (see
 * `candidate-proposal-submission.service.ts`). As long as commit-reveal is never
 * enabled, the assigned panel can vote with precise scores through
 * `POST /api/proposals/:proposalId/vote` and the backend's IQR finalizer runs
 * (with full tiered slashing) the moment every assigned reviewer has voted.
 *
 * Used by scenarios that need PRECISE per-expert scores — e.g. the slashing /
 * misalignment scenario, which drives a deliberate, oracle-predicted
 * disagreement. The rubric-wizard UI driver only produces coarse high/mid/low
 * bands, so it cannot express a score vector like [91, 88, 85, 30, 87].
 *
 * Caller must be signed in as `candidate` (the `candidate` fixture handles that).
 * Returns the application id and the linked candidate-proposal id.
 */
export async function applyToGuildDirectVote(
  page: Page,
  candidate: Candidate,
  guildId: string,
  reviewerIds: string[],
): Promise<{ applicationId: string; proposalId: string }> {
  const token = candidate.token;

  const submitRes = await page.request.post(
    `${BACKEND_URL}/api/guilds/${encodeURIComponent(guildId)}/applications`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        answers: {
          motivation:
            "E2E test answer covering motivation and intent thoroughly enough to pass min-length checks.",
          experience:
            "E2E test answer covering professional experience and expertise depth thoroughly.",
          domain_topic:
            "E2E test domain answer with sufficient detail to satisfy validation requirements.",
        },
        level: "experienced",
        noAiDeclaration: true,
      },
    },
  );
  if (!submitRes.ok()) {
    throw new Error(
      `applyToGuildDirectVote: submit failed ${submitRes.status()} ${await submitRes.text()}`,
    );
  }

  const submitBody = (await submitRes.json()) as {
    data: {
      applicationId: string;
      candidateProposalId?: string | null;
    };
  };
  const applicationId = submitBody.data.applicationId;
  const proposalId = submitBody.data.candidateProposalId;
  if (!applicationId) {
    throw new Error("applyToGuildDirectVote: BE did not return an applicationId");
  }
  if (!proposalId) {
    throw new Error(
      `applyToGuildDirectVote: BE did not link a candidate_proposal for application ${applicationId}. ` +
        `Pipeline B promotion failed (check BE log for "Reviewer assignment failed").`,
    );
  }

  // Overwrite the (randomly selected) panel with the deterministic test panel.
  // Crucially, we do NOT call cronApi.enableCommitReveal here — the proposal
  // stays in `direct` phase so the panel can submit precise scores.
  await testApi.candidateReviews.assignPanel(
    page.request,
    applicationId,
    reviewerIds,
  );

  return { applicationId, proposalId };
}

/**
 * Submit a single direct (non-commit-reveal) vote on a Pipeline B candidate
 * proposal on behalf of `expert`, with an explicit 0-100 score.
 *
 * Hits `POST /api/proposals/:proposalId/vote`, which is authenticated purely by
 * the `x-wallet-address` header (`identifyExpertWallet` middleware). The proposal
 * must be in `direct` voting phase with `status = 'ongoing'` and `expert` must be
 * an assigned reviewer (use `applyToGuildDirectVote` to set both up).
 *
 * When the LAST assigned reviewer votes, the backend triggers IQR finalization
 * automatically (early finalization in `proposals.service.ts:voteOnProposal`).
 */
export async function submitProposalVote(
  request: APIRequestContext,
  proposalId: string,
  expert: Expert,
  score: number,
): Promise<void> {
  const res = await request.post(
    `${BACKEND_URL}/api/proposals/${encodeURIComponent(proposalId)}/vote`,
    {
      headers: { "x-wallet-address": expert.address },
      data: {
        score,
        stakeAmount: 10,
        comment: `E2E panel review by ${expert.address}: deliberate score ${score}.`,
      },
    },
  );
  if (!res.ok()) {
    throw new Error(
      `submitProposalVote(proposal=${proposalId}, expert=${expert.address}, score=${score}): ` +
        `${res.status()} ${await res.text()}`,
    );
  }
}

/**
 * Read the IQR finalization results for a Pipeline B candidate proposal.
 *
 * Hits `GET /api/proposals/:proposalId/finalization`, authenticated by an
 * assigned reviewer's `x-wallet-address` header. Returns the per-vote breakdown
 * the backend's `ProposalFinalizationService` wrote — `slashing_tier`,
 * `slash_percent`, `reputation_change`, `score` — which is exactly what a
 * slashing scenario asserts against the oracle.
 *
 * Returns `null` if the proposal is not finalized yet (the endpoint 404s).
 */
export async function getProposalFinalization(
  request: APIRequestContext,
  proposalId: string,
  authExpert: Expert,
): Promise<ProposalFinalizationResults | null> {
  const res = await request.get(
    `${BACKEND_URL}/api/proposals/${encodeURIComponent(proposalId)}/finalization`,
    { headers: { "x-wallet-address": authExpert.address } },
  );
  if (res.status() === 404) return null;
  if (!res.ok()) {
    throw new Error(
      `getProposalFinalization(${proposalId}): ${res.status()} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { data: ProposalFinalizationResults };
  return body.data;
}

/** Per-vote finalization detail from `GET /api/proposals/:id/finalization`. */
export type ProposalFinalizationVote = {
  expert_id: string;
  expert_name: string;
  score: number | null;
  alignment_distance: string | null;
  reputation_change: number;
  reward_amount: string;
  slash_percent: number;
  slashing_tier: string | null;
  comment: string | null;
};

/** Finalization results envelope from `GET /api/proposals/:id/finalization`. */
export type ProposalFinalizationResults = {
  outcome: string;
  consensus_score: string | null;
  total_rewards: string;
  vote_count: number;
  votes: ProposalFinalizationVote[];
};

/**
 * Poll `getProposalFinalization` until the proposal is finalized or the timeout
 * expires. Early finalization runs fire-and-forget after the last vote, so a
 * short poll is needed rather than an immediate read.
 */
export async function pollProposalFinalization(
  request: APIRequestContext,
  proposalId: string,
  authExpert: Expert,
  timeoutMs = 20_000,
): Promise<ProposalFinalizationResults | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await getProposalFinalization(request, proposalId, authExpert);
    if (result) return result;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

/**
 * Read an expert's current global reputation from the BE. Used to assert the
 * +10 aligned / -20 misaligned reputation deltas a finalization applies.
 *
 * `GET /api/experts/profile` maps the DB column `experts.reputation_score`
 * (which `ProposalFinalizationService` updates) onto the response field
 * `reputation`. We accept the snake_case / camelCase variants too for safety.
 */
export async function getExpertReputation(
  request: APIRequestContext,
  expert: Expert,
): Promise<number> {
  const res = await request.get(
    `${BACKEND_URL}/api/experts/profile?wallet=${expert.address}`,
  );
  if (!res.ok()) {
    throw new Error(
      `getExpertReputation(${expert.address}): ${res.status()} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as {
    data: {
      reputation?: number;
      reputation_score?: number;
      reputationScore?: number;
    };
  };
  const d = body.data;
  return d.reputation ?? d.reputation_score ?? d.reputationScore ?? 0;
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
export async function advanceTime(
  anvil: AnvilHandle,
  seconds: number,
): Promise<void> {
  await anvil.increaseTime(seconds);
}

/**
 * Trigger the BE cron that promotes commit-reveal lifecycle phases for expert
 * applications (Commit -> Reveal -> Finalized/Expired mirror jobs).
 */
export async function fireExpertTransitions(
  request: APIRequestContext,
): Promise<void> {
  await cronApi.processExpertTransitions(request);
}

/**
 * Trigger the BE cron that promotes commit-reveal lifecycle phases for
 * candidate proposals (the Pipeline B path used by guild applications).
 */
export async function fireProposalTransitions(
  request: APIRequestContext,
): Promise<void> {
  await cronApi.processProposalTransitions(request);
}

/**
 * Drive the candidate-proposal review to on-chain finalization.
 *
 * `finalizeSession` / `finalizeSessionVerifiable` on the VettingManager are
 * `onlyOwner`, and the owner is the backend service wallet — NOT a panelist.
 * The backend already orchestrates the whole on-chain lifecycle: when the
 * panel finishes committing it auto-reveals + finalizes the proposal, which
 * queues `batch_reveal_votes` and `finalize_vetting_session` ops in the
 * `pending_blockchain_ops` outbox. Those ops are submitted by the backend
 * wallet via the blockchain-ops cron.
 *
 * So the test must NOT call the contract directly with a panelist wallet
 * (that reverts with `OwnableUnauthorizedAccount`). Instead it pumps the
 * backend: run the proposal-transition cron, then drain the outbox so the
 * queued reveal + finalize ops actually land on-chain. Idempotent and safe
 * to call repeatedly.
 */
export async function finalizeViaBackend(
  request: APIRequestContext,
): Promise<void> {
  // The backend queues the on-chain ops (batch_reveal_votes, then — fire and
  // forget, slightly later — finalize_vetting_session) only after the proposal
  // auto-reveals/finalizes. The blockchain-ops cron also processes a bounded
  // batch (LIMIT 3) per tick, and the finalize op sits behind batch_reveal +
  // reward_distribution ops. So one transition+drain is never enough.
  //
  // We interleave transition + drain with short waits so the fire-and-forget
  // finalize op gets queued and the outbox is flushed. Callers that need a
  // guaranteed on-chain outcome should still re-invoke this in a poll loop —
  // the whole pipeline is eventually consistent, not instant. Idempotent.
  for (let round = 0; round < 3; round++) {
    await cronApi.processProposalTransitions(request);
    await cronApi.drainBlockchainOps(request);
    await new Promise((r) => setTimeout(r, 500));
  }
}

/**
 * Verifiable on-chain finalization, called with the correct authorized actor.
 *
 * `finalizeSessionVerifiable` is `onlyOwner` on the VettingManager and the
 * owner is the backend service wallet (set in bootstrap/setup-stack.ts).
 * Older scenarios pass a panelist `Expert` here — that wallet is NOT the
 * owner and the call would revert with `OwnableUnauthorizedAccount`. We
 * therefore ignore the supplied wallet and always sign with the backend
 * owner wallet, which is the account the contract actually authorizes.
 *
 * The `expert` parameter is kept for backwards compatibility with existing
 * scenario call sites and is intentionally unused.
 */
export async function finalize(
  _expert: Expert,
  contracts: ContractHandles,
  sessionId: Hex,
): Promise<void> {
  const owner = backendOwnerWallet();
  await contracts.vettingManager.write.finalizeSessionVerifiable([sessionId], {
    account: owner.client.account,
  });
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
  await contracts.vettingManager.write.expireSession([sessionId], {
    account: expert.client.account,
  });
}
