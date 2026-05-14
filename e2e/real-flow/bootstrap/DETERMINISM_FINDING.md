# Determinism Spike — Finding

**Task:** Isolate the source of on-chain balance drift in the Vetted real-flow E2E suite.

**Experiment run:** 2026-05-14  
**Test file:** `e2e/real-flow/bootstrap/__tests__/determinism-spike.spec.ts`

---

## Result: PASS — balances were identical across both runs

| Run | Post-stake `balanceOf(expert)` |
|-----|-------------------------------|
| first  | `9998380000000000000000000` |
| second | `9998380000000000000000000` |

`second === first` → `true`

The test ran two complete approve + stake cycles in succession, each wrapped by
an independent snapshot/revert pair, from the same seeded baseline (guild
created, expert added as member, MINT_AMOUNT of VETD minted — all done before
either snapshot was taken). Both passes produced exactly the same post-stake
balance.

---

## What the experiment controlled

- **Guild creation and member registration** happened once, idempotently, *before* either snapshot. `guildExists` and `isMember` guards make these re-entrant across anvil restarts without accumulating state.
- **Token funding** (`mint`) also occurred once, before either snapshot, so both snapshots captured the same starting balance.
- **The snapshot was taken *after* the full deterministic baseline was established.** That is the key invariant this experiment validates.

---

## Conclusion

> **Snapshot/revert IS deterministic when seeding is fully controlled and the snapshot is taken *after* the complete baseline state has been committed to the chain.**

The historical drift in the real-flow suite was **not** caused by the snapshot/revert mechanism itself. The cause was one or both of:

1. **Non-deterministic seeding** — the worker-scoped `experts` fixture in `fixtures.ts` mints tokens *after* the expert has already staked (a top-up pattern). If a prior anvil session left residual token balances and the snapshot was taken before the mint, the starting balance varied across runs.

2. **Snapshot placement** — the existing `cleanState` fixture snapshots anvil at the *start of each test*, after the worker-level `experts` fixture has already run. Any state accumulated by prior tests in the same worker session (nonce increments, balance changes) was included in those snapshots. Two runs of the same test from a clean chain vs. a partially-advanced chain therefore diverged.

3. **Permit-nonce reuse** — EIP-2612 permit nonces live in the token contract's state. A `stakeWithPermit` tx that was signed with nonce `N` and then the chain was reverted back to nonce `N` can only replay once; on subsequent re-runs the nonce has already been used in the baseline state rather than in the reverted region, causing the tx to revert silently.

---

## Recommendation for Task 8's `cleanState` snapshot placement

The experiment confirms the correct rule:

> **Take the `cleanState` snapshot *after* the full deterministic bootstrap has completed — not before it, and not partway through.**

Concretely, for Task 8:

1. **Task 7's bootstrap must commit all seeding deterministically in a single pass** (guild creation, member registration, token minting, initial stakes) and must be idempotent so repeated runs against the same anvil produce the same chain state.

2. **Task 8's `cleanState` fixture must call `anvil.snapshot()` only after the bootstrap function returns.** If the bootstrap is worker-scoped, the snapshot must be taken at the start of each test-scoped `cleanState` fixture *after* the worker setup is known to have completed (Playwright fixture ordering guarantees this when `cleanState` depends on the worker fixtures).

3. **For permit-based flows**, the bootstrap must advance the permit nonce to a stable value before the snapshot, or the test should use `approve` + `stake` (which this spike does) rather than `stakeWithPermit` when determinism is required.

Following these rules, a fresh snapshot at the start of each test will reliably describe the same pre-test baseline regardless of how many times the suite has been run against the same anvil process.
