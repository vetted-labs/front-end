// e2e/real-flow/scenarios/03-partial-reveal.spec.ts
//
// Suite A — Scenario 03: partial-reveal.
//
// Exercises the no-show panelist path: three panelists commit high scores,
// but only two reveal before the reveal deadline expires. The session is
// finalized on-chain with a quorum of 2 high reveals, the BE projects an
// `approved` outcome (consensus from 2× 8s = 80 ≥ APPROVAL_THRESHOLD=60 on
// the 0-100 scale, per PT2), and the on-chain `aligned` / `misaligned`
// arrays in the `sessions(bytes32)` tuple flag the no-show panelist.
//
// Mirrors scenario 01's helper / expectation usage — see that file for a
// rundown of the known mismatches between the plan and the shipped ABI / BE
// surface (sessions tuple shape, candidate-authenticated outcome list, etc.).
//
// Runtime acceptance:
//   - All test.step()s pass.
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

test("partial reveal: 3 commit, 2 reveal high, 1 doesn't reveal → finalize → approved", async ({
  page,
  candidate,
  guild,
  experts,
  anvil,
  contracts,
  cleanState: _cleanState,
}) => {
  test.fixme(
    true,
    "DIV-010: on-chain commit-reveal session never created (DIV-001 HARD BLOCKER — createVettingSession is onlyOwner; backend signer != owner; commitVote reverts NotPanelMember)",
  );
  // Hoisted bindings so later steps can read what step 1 produced. We resolve
  // them inside the first `test.step` so any error inside the step is
  // attributed correctly in the trace viewer.
  let applicationId!: string;
  let sessionId!: Hex;

  // Two revealers score 8; the third panelist commits but never reveals.
  const scores = [8, 8, 8] as const;
  const panel = experts.slice(0, 3);
  // Index of the no-show panelist — commits but never reveals.
  const NO_SHOW = 2;
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

  await test.step("2 reveals (panelist 2 is a no-show)", async () => {
    for (let i = 0; i < panel.length; i++) {
      if (i === NO_SHOW) continue;
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

  await test.step("assert BE outcome = approved", async () => {
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
    expect(app?.proposalOutcome).toBe(REVIEW_OUTCOMES.APPROVED);
  });

  await test.step("assert on-chain no-show panelist did not reveal", async () => {
    // The candidate-authenticated list endpoint
    // (`/api/candidates/me/guild-applications`) does not project per-panelist
    // review state — only aggregate `proposalOutcome` / counts. So we fall
    // back to on-chain truth via `vettingManager.read.getVote(sessionId,
    // panelist)` which returns `(commitment, score, committed, revealed)`.
    // We assert the no-show panelist committed but never revealed, and the
    // other two both committed and revealed. This is the on-chain analogue
    // of the requested "auto-misaligned" check — the contract's
    // `PanelistAutoMisaligned` semantics derive from exactly this state
    // (committed && !revealed at finalize time).
    //
    // Sanity check on the session tuple: `revealCount` should reflect 2 of
    // the 3 commits actually being revealed.
    const session = (await contracts.vettingManager.read.sessions([
      sessionId,
    ])) as SessionTuple;
    expect(session[3]).toBe(3); // panelSize
    expect(session[5]).toBe(2); // revealCount

    type VoteTuple = readonly [Hex, number, boolean, boolean];
    for (let i = 0; i < panel.length; i++) {
      const vote = (await contracts.vettingManager.read.getVote([
        sessionId,
        panel[i].address,
      ])) as VoteTuple;
      const [, , committed, revealed] = vote;
      expect(committed).toBe(true);
      expect(revealed).toBe(i !== NO_SHOW);
    }
  });

  await test.step("UI spot-check", async () => {
    // The candidate dashboard exposes an applications list page (no per-id
    // detail route currently). The list renders status pills derived from
    // `proposalOutcome`, so an /approved/i match is the right smoke check.
    await page.goto(`/candidate/applications`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/approved/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
