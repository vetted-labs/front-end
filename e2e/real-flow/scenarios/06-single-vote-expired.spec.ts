// e2e/real-flow/scenarios/06-single-vote-expired.spec.ts
//
// Suite A — Scenario 06: single-vote-expired.
//
// Sad-path coverage for the "panel never reaches quorum" branch. One panelist
// commits a single vote, the other two never commit, the commit deadline
// passes, and the session is forcibly expired via `expireSession`. We assert
// that the on-chain phase flips to `Expired` and that the BE projects the
// outcome as `rejected` (per spec — `APPROVAL_THRESHOLD=60` on the 0-100 scale
// means a sub-quorum session is forced to `rejected`).
//
// See `01-approve-consensus.spec.ts` for the documented mismatches between the
// shipped ABI / BE routes and the original Suite A plan — they apply here too.

import { test, expect } from "../fixtures";
import {
  applyToGuildViaUI,
  expertCommit,
  advanceTime,
  fireExpertTransitions,
  expireSession,
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

test("single-vote-expired: only 1 expert commits, deadline passes, expireSession → Expired", async ({
  page,
  candidate,
  guild,
  experts,
  anvil,
  contracts,
  cleanState: _cleanState,
}) => {
  // Hoisted bindings so later steps can read what step 1 produced.
  let applicationId!: string;
  let sessionId!: Hex;

  await test.step("apply to guild via UI", async () => {
    const result = await applyToGuildViaUI(page, candidate, guild.id);
    applicationId = result.applicationId;
    sessionId = result.sessionId;
  });

  await test.step("only experts[0] commits (score 7)", async () => {
    await expertCommit(experts[0], contracts, sessionId, 7);
    // experts[1] and experts[2] intentionally never commit — that's the
    // whole point of this scenario.
  });

  await test.step("advance past commit deadline + fire transitions", async () => {
    await advanceTime(anvil, ONE_DAY_PLUS_ONE);
    await fireExpertTransitions(page.request);
  });

  await test.step("expireSession", async () => {
    await expireSession(experts[0], contracts, sessionId);
  });

  await test.step("assert on-chain phase = Expired", async () => {
    const session = (await contracts.vettingManager.read.sessions([
      sessionId,
    ])) as SessionTuple;
    expect(session[6]).toBe(SESSION_PHASE.EXPIRED);
  });

  await test.step("assert BE outcome = rejected", async () => {
    // The BE forces `rejected` for non-quorum / expired sessions because the
    // approval threshold (60 on a 0-100 scale) cannot be met without enough
    // reveals. The candidate-authenticated list endpoint surfaces the
    // `proposalOutcome` projection.
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
    // The candidate applications list renders status pills derived from
    // `proposalOutcome`. BE writes `rejected` for expired/non-quorum
    // sessions, so we match `/rejected/i` first.
    await page.goto(`/candidate/applications`, { waitUntil: "networkidle" });
    await expect(page.getByText(/rejected/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
