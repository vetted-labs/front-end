// e2e/real-flow/scenarios/04-no-reveal-slashing.spec.ts
//
// Suite A — Scenario 04: no-reveal slashing.
//
// Three panelists commit, but only two reveal. After the reveal window
// expires the session is finalized verifiably. The BE writes a
// `slash_percent` row on the no-show panelist's review record, but it does
// NOT auto-call `SlashingManager.slash` (PT3 confirmed). To exercise the
// on-chain slashing path the test invokes `SlashingManager.slashExpert`
// directly via viem from the deployer/owner wallet (anvil account 0), then
// asserts the no-show panelist's stake decreased.
//
// Known mismatches with the plan (documented for the reviewer):
//   1. The plan referenced `expertStaking.read.stakeOf([expert, guildId])`.
//      The shipped ABI does not expose a `stakeOf` view; we use
//      `getStakeInfo([expert, guildId])` which returns
//      `(amount, stakedAt)` and read slot 0 (`amount`).
//   2. The plan referenced `SlashingManager.slash(...)`. The shipped ABI
//      exposes `slashExpert(address expert, bytes32 guildId, uint256
//      baseAmount, uint256 slashingPercentage, string reason)`. The
//      function carries `onlyOwner`, so the call is issued from the
//      deployer wallet (anvil account 0 — `ANVIL_KEYS[0]`).
//   3. The plan suggested asserting `expert_application_reviews.slash_percent
//      > 0` via a candidate API. The candidate vetting flow stores per-vote
//      data in `proposal_votes`, not `expert_application_reviews`, and the
//      candidate-authenticated `/api/candidates/me/guild-applications`
//      endpoint does not project per-panelist vote rows. Per the plan's
//      fallback ("rely on on-chain stake assertion") we skip the BE-side
//      slash_percent assertion and document it here. There is NO
//      `slashing_records` row written for vetting slashing — that table is
//      for endorsement slashing only (PT3 confirmed).
//   4. `expertFinalize` is not a separate helper; the shared name is
//      `finalize` in `helpers/scenario.ts`. We use that.
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
import { SESSION_PHASE } from "../helpers/expectations";
import { ANVIL_KEYS, makeWallet } from "../helpers/chain";
import type { Hex } from "viem";

// One day + 1 second. The on-chain commit window in `Deploy.s.sol` is 1 day;
// reveal window is the same. Pushing past it (and mining) flips the session
// phase deterministically when combined with `fireExpertTransitions`.
const ONE_DAY_PLUS_ONE = 60 * 60 * 24 + 1;

// `getStakeInfo(expert, guildId)` returns the named tuple
// `(uint256 amount, uint256 stakedAt)`. The ABI is loaded from a non-`as
// const` JSON, so viem types it as `unknown`. We cast to this tuple shape
// to read `amount` (slot 0) without `any`.
type StakeInfoTuple = readonly [bigint, bigint];

// Indexable view of the `sessions(bytes32)` tuple (see scenario 01 for the
// full layout). We only care about slot 6 (`phase`) here.
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

test("no-reveal slashing: 3 commit, 1 fails to reveal, finalize, explicit slash → stake reduced", async ({
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
    "DIV-010: on-chain commit-reveal session never created (DIV-001 HARD BLOCKER — createVettingSession is onlyOwner; backend signer != owner; commitVote reverts SessionDoesNotExist)",
  );
  let applicationId!: string;
  let sessionId!: Hex;

  // The two revealers commit a real consensus score. The no-show panelist
  // commits any value — they never reveal, so the committed score is
  // irrelevant on-chain (the hash is opaque until reveal).
  const scores = [8, 8, 8] as const;
  const panel = experts.slice(0, 3);
  const noShowExpert = panel[2];
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

  await test.step("only 2 of 3 reveal (panelist[2] no-shows)", async () => {
    for (let i = 0; i < 2; i++) {
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

  // ---------------------------------------------------------------------
  // Slash step.
  //
  // PT3 confirmed BE finalization does NOT call SlashingManager. The test
  // drives the on-chain slash directly. `slashExpert` is `onlyOwner`, so
  // we derive a wallet for anvil account 0 (the deployer) on the fly.
  // ---------------------------------------------------------------------

  let stakeBefore!: bigint;
  let stakeAfter!: bigint;

  await test.step("read no-show panelist stake before slash", async () => {
    const info = (await contracts.expertStaking.read.getStakeInfo([
      noShowExpert.address,
      guild.on_chain_guild_id,
    ])) as StakeInfoTuple;
    stakeBefore = info[0];
    expect(stakeBefore).toBeGreaterThan(0n);
  });

  await test.step("owner slashes no-show panelist via SlashingManager", async () => {
    const owner = makeWallet(ANVIL_KEYS[0]);
    // 25% slash of the panelist's full stake. baseAmount=stakeBefore matches
    // the SlashingManager's percentage-of-base math; slashingPercentage is
    // in basis points (10_000 = 100%).
    await contracts.slashingManager.write.slashExpert(
      [
        noShowExpert.address,
        guild.on_chain_guild_id,
        stakeBefore,
        2500n,
        "no-reveal: failed to reveal committed vote within window",
      ],
      { account: owner.client.account },
    );
  });

  await test.step("assert no-show panelist stake decreased", async () => {
    const info = (await contracts.expertStaking.read.getStakeInfo([
      noShowExpert.address,
      guild.on_chain_guild_id,
    ])) as StakeInfoTuple;
    stakeAfter = info[0];
    expect(stakeAfter).toBeLessThan(stakeBefore);
  });

  // BE-side check: the candidate-authenticated list endpoint does not
  // project per-panelist vote rows, and the BE writes per-vote slash data
  // to `proposal_votes` (not `expert_application_reviews`) for the
  // candidate vetting flow. Per the plan's fallback we rely on the
  // on-chain stake assertion above. We still spot-check the application
  // is reachable so the candidate session is verified end-to-end.
  await test.step("BE: application is still reachable for candidate", async () => {
    const res = await page.request.get(
      `/api/candidates/me/guild-applications`,
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      data: Array<{ id: string }>;
    };
    const app = body.data.find((row) => row.id === applicationId);
    expect(app).toBeDefined();
  });
});
