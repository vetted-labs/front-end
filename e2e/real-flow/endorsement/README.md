# Suite B — Endorsement Real-Flow E2E

Suite B exercises the endorsement bidding lifecycle (bid → hire → reward / refund / forfeit / dispute / retention) end-to-end across BE + anvil + (where practical) UI. It deliberately departs from Suite A's "click everything in the UI" pattern — read the notes below before adding scenarios.

See the top-level `e2e/real-flow/README.md` for shared setup (anvil boot, BE seed, base env vars). The notes here are Suite-B-specific.

## 1. Why bids are placed via viem, not UI

Driving four wallets through RainbowKit + WalletConnect inside Playwright is fragile: wallet popups, signature prompts, and account-switching desync the test runner. Suite B bypasses the UI for `placeBid` and instead calls `EndorsementBidding.placeBid` directly through viem using anvil's deterministic accounts. This keeps scenarios deterministic and fast, at the cost of not exercising the bid-submission UI itself (covered separately in component tests).

## 2. BE/contract divergence (the most important note)

The BE **never** calls these `EndorsementBidding` methods:

- `distributeRewards`
- `slashEndorsements`
- `finalizeJob`
- `reclaimExpiredBids`
- `reclaimFinalizedBids`

Reward distribution flows through the `pending_blockchain_ops` outbox, which a worker drains by calling `RewardDistributor.distributeSingleReward` (a separate contract). Slashing is **BE-side only** — a `slashing_records` row is inserted and `endorsements.status` is set to `'slashed'`. There is no on-chain stake reduction.

Practical consequence for assertions:

- "Rewards were distributed" must be asserted by inspecting `pending_blockchain_ops` state + `RewardDistributor` events, **not** `EndorsementBidding` events.
- "Endorsement was slashed" must be asserted in BE tables, not on-chain.

## 3. Dismissed disputes do NOT restore forfeited rewards

Per `hire-accountability.service.ts:660-675`, only a `'resolved_upheld'` dispute resolution mutates rewards (and only forfeits-if-not-already-forfeited). A `'resolved_dismissed'` outcome is **reputational-only** — already-forfeited rewards stay forfeited.

Scenario 05's expected outcome (rewards remain forfeited after dismissal) reflects current code, not whitepaper aspiration. If product wants money returned on dismissal, that is a BE PR — do not "fix" the test to mask the divergence.

## 4. `createJob` is required before any `placeBid`

`EndorsementBidding.placeBid` requires a job to exist on-chain. The endorsement helper exposes:

```ts
createJob(creator, contracts, jobId);
```

The `creator` (typically anvil account 5) **must** be distinct from the bidders (`experts[0..3]`) — see `EndorsementBidding.sol:678 CreatorCannotBid`. Scenarios 03 and 08 demonstrate the pattern.

## 5. `applyToGuildViaUI` does not link the application to a Job

A plain guild apply leaves `candidate_guild_applications.job_id` NULL. Suite B scenarios that need an on-chain job synthesize a fresh `jobId` UUID and call `createJob` directly — they do **not** rely on the guild application to provide one.

## 6. Required env vars (in addition to top-level README)

| Var                                | Purpose                                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E2E_COMPANY_TOKEN`                | JWT for the test company. Mint via `POST /api/test/seed/company`.                                                                                 |
| `E2E_EXPERT_TOKENS`                | JSON array of expert JWTs. Alternatively set `E2E_EXPERT_TOKEN_0` … `E2E_EXPERT_TOKEN_3` per expert. Mint via `POST /api/test/seed/expert-token`. |
| `ENDORSEMENT_RETENTION_SECONDS=5`  | Short retention window so scenarios 04 + 07 finish in seconds, not days.                                                                          |
| `ENDORSEMENT_CHALLENGE_SECONDS=10` | Short dispute challenge window.                                                                                                                   |

## 7. Soft-pass UI assertions

Several scenarios soft-pass on UI spot-checks because the affected pages authenticate via wagmi `useAccount()` and Playwright has no injected wallet. The data assertions still run against BE/DB; the UI check just logs and continues.

Affected scenarios:

- **02** — slashing-records UI check (BE assertion is authoritative).
- **05** — dispute-detail page (BE assertion is authoritative).
- **06** — dispute-detail page (BE assertion is authoritative).

Each spec's header comment documents its specific soft-pass surface. When adding a new scenario, prefer BE/DB assertions for anything that requires a connected wallet, and only soft-pass the UI layer.
