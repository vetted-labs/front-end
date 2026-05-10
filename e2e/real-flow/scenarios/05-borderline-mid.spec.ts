// e2e/real-flow/scenarios/05-borderline-mid.spec.ts
//
// Suite A — Scenario 05: borderline-mid.
//
// Mirrors the canonical commit-reveal loop from scenario 01 but with mid-band
// scores that fall just below the approval threshold. Three panelists commit
// 5/5/5, deadlines expire, panelists reveal, the session is finalized
// on-chain, and both BE and UI surface the resulting `rejected` outcome.
//
// Threshold note (per PT2):
//   APPROVAL_THRESHOLD = 60 on a 0-100 scale. The session aggregates raw
//   panelist scores (0-10) into a 0-100 consensus by averaging then scaling.
//   5/5/5 averages to 5/10 → consensus 50 < 60 → rejected.
//
// Known mismatches with the plan (documented for the reviewer):
//   1. The plan references `vettingManager.read.getSession([sessionId])`.
//      The shipped ABI exposes the public `sessions(bytes32)` mapping, which
//      returns a tuple of (guildId, commitDeadline, revealDeadline,
//      panelSize, commitCount, revealCount, phase, applicationHash). We use
//      `sessions` and index into the `phase` slot.
//   2. The plan reads BE outcome from `/api/candidate-guild-applications/
//      :applicationId`. That route does not exist in the backend. The BE
//      surfaces `proposalOutcome` via the candidate-authenticated list
//      endpoint `/api/candidates/me/guild-applications`. We hit that with
//      `page.request` (already candidate-authenticated by the fixture).
//   3. `applyToGuildViaUI` reads the on-chain session id from
//      `/api/candidates/me/guild-applications`, which does not currently
//      project `blockchain_session_id`. If the helper throws on missing
//      session id, the BE projection fix or a derived-id fallback is
//      tracked as a known concern in the task report — out of scope for
//      this spec file.
//
// Runtime acceptance (per plan):
//   - All 8 test.step()s pass.
//   - `cleanState` reverts anvil + resets DB after each test.
//   - Trace + screenshot retained on failure.

import { test, expect } from "../fixtures";
import {
  applyToGuildViaUI,
  expertCommit,
  expertReveal,
  advanceTime,
  fireExpertTransitions,
  finalize,
} from "../helpers/scenario";
import { SESSION_PHASE, REVIEW_OUTCOMES } from "../helpers/expectations";
import type { Hex } from "viem";

// One day + 1 second. The on-chain commit window in `Deploy.s.sol` is 1 day;
// reveal window is the same. Pushing past it (and mining) flips the session
// phase deterministically when combined with `fireExpertTransitions`.
const ONE_DAY_PLUS_ONE = 60 * 60 * 24 + 1;

// Indexable view of the `sessions(bytes32)` tuple. The ABI is loaded from a
// non-`as const` JSON, so viem types `read.sessions(...)` as `unknown`. We
// cast to this tuple shape to reach `phase` (slot 6) without `any`.
type SessionTuple = readonly [
  Hex, // guildId
  bigint, // commitDeadline
  bigint, // revealDeadline
  number, // panelSize
  number, // commitCount
  number, // revealCount
  number, // phase (enum SessionPhase)
  Hex, // applicationHash
];

test("borderline-mid: 5/5/5 reveals → consensus 50 < threshold 60 → rejected", async ({
  page,
  candidate,
  guild,
  experts,
  anvil,
  contracts,
  cleanState: _cleanState,
}) => {
  // Hoisted bindings so later steps can read what step 1 produced. We resolve
  // them inside the first `test.step` so any error inside the step is
  // attributed correctly in the trace viewer.
  let applicationId!: string;
  let sessionId!: Hex;

  const scores = [5, 5, 5] as const;
  const panel = experts.slice(0, 3);
  // Track nonces in a parallel array — `Expert` is intentionally narrow and
  // does not carry per-test commit state.
  const nonces: Hex[] = [];

  await test.step("apply to guild via UI", async () => {
    const result = await applyToGuildViaUI(page, candidate, guild.id);
    applicationId = result.applicationId;
    sessionId = result.sessionId;
  });

  await test.step("3 commits", async () => {
    for (let i = 0; i < panel.length; i++) {
      const { nonce } = await expertCommit(
        panel[i],
        contracts,
        sessionId,
        scores[i],
      );
      nonces[i] = nonce;
    }
  });

  await test.step("advance to reveal phase", async () => {
    await advanceTime(anvil, ONE_DAY_PLUS_ONE);
    await fireExpertTransitions(page.request);
  });

  await test.step("3 reveals", async () => {
    for (let i = 0; i < panel.length; i++) {
      await expertReveal(
        panel[i],
        contracts,
        sessionId,
        scores[i],
        nonces[i],
      );
    }
  });

  await test.step("advance + finalize", async () => {
    await advanceTime(anvil, ONE_DAY_PLUS_ONE);
    await fireExpertTransitions(page.request);
    await finalize(experts[0], contracts, sessionId);
  });

  await test.step("assert on-chain phase = Finalized", async () => {
    const session = (await contracts.vettingManager.read.sessions([
      sessionId,
    ])) as SessionTuple;
    expect(session[6]).toBe(SESSION_PHASE.FINALIZED);
  });

  await test.step("assert BE outcome = rejected", async () => {
    // The BE does not expose a `GET /api/candidate-guild-applications/:id`
    // route; it surfaces outcomes through the candidate-authenticated list
    // endpoint instead. `page.request` carries the candidate session cookie.
    const res = await page.request.get(
      `/api/candidates/me/guild-applications`,
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      data: Array<{ id: string; proposalOutcome: string | null }>;
    };
    const app = body.data.find((row) => row.id === applicationId);
    expect(app).toBeDefined();
    expect(app?.proposalOutcome).toBe(REVIEW_OUTCOMES.REJECTED);
  });

  await test.step("UI spot-check", async () => {
    // The candidate dashboard exposes an applications list page (no per-id
    // detail route currently). The list renders status pills derived from
    // `proposalOutcome`, so a /rejected/i match is the right smoke check.
    await page.goto(`/candidate/applications`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/rejected/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
