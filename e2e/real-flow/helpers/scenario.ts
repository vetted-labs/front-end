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
 * Drive the candidate guild-application UI end-to-end and return the resulting
 * application + on-chain session id. Caller is expected to be already
 * signed in as `candidate` (the `candidate` fixture handles that).
 *
 * `guildId` is the BE guild UUID — the frontend route is
 * `/guilds/[guildId]/apply` where the param is the UUID, not the slug.
 */
export async function applyToGuildViaUI(
  page: Page,
  _candidate: Candidate,
  guildId: string,
): Promise<{ applicationId: string; sessionId: Hex }> {
  await page.goto(`/guilds/${guildId}/apply`, { waitUntil: "networkidle" });

  // Use profile resume if the option is offered.
  const useProfileResume = page.getByText(/profile resume/i).first();
  if (await useProfileResume.isVisible({ timeout: 3000 }).catch(() => false)) {
    await useProfileResume.click();
  }

  // Fill general questions (textareas) on step 1.
  const textareas = page.locator("textarea");
  const count = await textareas.count();
  for (let i = 0; i < count; i++) {
    await textareas.nth(i).fill(
      "Detailed E2E test answer that exceeds the minimum length requirement.",
    );
  }
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2 — Guild Review: pick a level and fill domain answers.
  const levelButtons = page.locator("[role='radio'], [role='option']");
  if (await levelButtons.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await levelButtons.first().click();
  }
  const domainTextareas = page.locator("textarea");
  const dCount = await domainTextareas.count();
  for (let i = 0; i < dCount; i++) {
    await domainTextareas.nth(i).fill(
      "Comprehensive E2E test answer about expertise and experience in this domain.",
    );
  }

  // No-AI declaration is required before submit.
  await page.getByLabel(/no-AI/i).check();
  await page.getByRole("button", { name: "Submit Application" }).click();

  // Wait for redirect to candidate dashboard or applications page.
  await page.waitForURL(/\/candidate\/(dashboard|applications)/, { timeout: 15_000 });

  // Read application ID + on-chain session id from the BE.
  const res = await page.request.get(
    `${BACKEND_URL}/api/candidates/me/guild-applications`,
  );
  const body = (await res.json()) as {
    data: Array<{ id: string; on_chain_session_id?: string; blockchain_session_id?: string }>;
  };
  const app = body.data[0];
  const rawSessionId = app.on_chain_session_id ?? app.blockchain_session_id;
  if (!rawSessionId) {
    throw new Error(
      `applyToGuildViaUI: BE did not return an on-chain session id for application ${app.id}`,
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
