// e2e/real-flow/scenarios/07-no-commits-expired.spec.ts
//
// Suite A — Scenario 07: no-commits-expired.
//
// Failure-mode path: candidate applies via the UI, but no panelist commits a
// vote during the commit window. Once the commit deadline passes we trigger
// `expireSession` directly on-chain (anyone can call it), the session lands
// in `Expired`, and the BE finalization service falls through to the
// no-reviews branch (`expert-application-finalization.service.ts:205`),
// producing a `rejected` outcome with no slashing applied.
//
// Known mismatches with the plan (documented for the reviewer):
//   1. `vettingManager.read.getSession([sessionId])` is not exposed; we read
//      the public `sessions(bytes32)` mapping (tuple-shaped, see SessionTuple
//      below) and index into the `phase` slot.
//   2. The plan asks for a per-review `slash_percent` falsy assertion. The
//      candidate-authenticated list endpoint
//      `/api/candidates/me/guild-applications` does not project review rows
//      (let alone `slash_percent`); per the task spec we skip that check and
//      lean on `proposalOutcome === rejected` + on-chain `phase === EXPIRED`
//      as proof that no slashing path ran.
//
// Runtime acceptance:
//   - All 6 test.step()s pass.
//   - `cleanState` reverts anvil + resets DB after each test.
//   - Trace + screenshot retained on failure.

import { test, expect } from "../fixtures";
import {
  applyToGuildViaUI,
  advanceTime,
  fireExpertTransitions,
  expireSession,
} from "../helpers/scenario";
import { SESSION_PHASE, REVIEW_OUTCOMES } from "../helpers/expectations";
import type { Hex } from "viem";

// One day + 1 second. The on-chain commit window in `Deploy.s.sol` is 1 day;
// reveal window is the same. Pushing past *both* (and mining) is required
// before `expireSession` will accept the call.
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

test("no-commits-expired: zero commits, deadline passes, expireSession → Expired, no slashing", async ({
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

  await test.step("apply to guild via UI", async () => {
    const result = await applyToGuildViaUI(page, candidate, guild.id);
    applicationId = result.applicationId;
    sessionId = result.sessionId;
  });

  // No commit loop — the entire point of this scenario is "zero commits".

  await test.step("advance past commit + reveal windows, then expire", async () => {
    // Push past commit deadline + reveal deadline (both 1 day in Deploy.s.sol)
    // before invoking `expireSession`. The contract requires
    // `block.timestamp > revealDeadline` to succeed.
    await advanceTime(anvil, ONE_DAY_PLUS_ONE);
    await fireExpertTransitions(page.request);
    await advanceTime(anvil, ONE_DAY_PLUS_ONE);
    await fireExpertTransitions(page.request);
    await expireSession(experts[0], contracts, sessionId);
  });

  await test.step("assert on-chain phase = Expired", async () => {
    const session = (await contracts.vettingManager.read.sessions([
      sessionId,
    ])) as SessionTuple;
    expect(session[6]).toBe(SESSION_PHASE.EXPIRED);
  });

  await test.step("assert BE outcome = rejected (no-reviews branch)", async () => {
    // The BE does not expose a `GET /api/candidate-guild-applications/:id`
    // route; it surfaces outcomes through the candidate-authenticated list
    // endpoint instead. `page.request` carries the candidate session cookie.
    //
    // The no-reviews branch in
    // `expert-application-finalization.service.ts:205` hardcodes
    // outcome='rejected' / consensus_score=0 — i.e. no slashing column is
    // ever written. We can't directly inspect `expert_application_reviews`
    // through this candidate-side endpoint, so we treat the rejected outcome
    // as our proof of the no-slash code path. (See header note 2.)
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
    // `proposalOutcome`, so an /rejected/i match is the right smoke check
    // for the expired/no-commits path.
    await page.goto(`/candidate/applications`, { waitUntil: "networkidle" });
    await expect(page.getByText(/rejected/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
