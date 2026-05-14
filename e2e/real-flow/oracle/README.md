# Vetted Math Oracle

Independent TypeScript re-implementation of the Vetted protocol math.

**Ground truth:** `backend/docs/technical-whitepaper.md` (Technical Appendix). This oracle is anchored to the *appendix*, not to the codebase or on-chain contracts. Its purpose is to be the independent reference against which the actual platform output is diffed in E2E scenarios.

> **Quartile method note:** `computeConsensus()` uses **inclusive-halves** quartiles — the median element is included in both halves when n is odd (`sorted.slice(0, Math.ceil(n/2))` / `sorted.slice(Math.floor(n/2))`). This is the method demonstrated by the **CEO Consensus Scenarios document** (2026-05-14), which is the authoritative spec for the quartile method — all 10 of its scenarios are only reproducible with inclusive-halves. The backend's `VotingConsensusService.calculateIQR()` uses exclusive-halves and therefore diverges from the spec — tracked as **DIV-003** in `docs/testing/PROTOCOL_DIVERGENCES.md`. See `__tests__/ceo-consensus-scenarios.spec.ts` for the authoritative 10-scenario regression suite.

---

## Export Map

| Export | Module | Technical Appendix § |
|---|---|---|
| `computeConsensus(scores)` | `consensus.ts` | §4 "Consensus Determination", §7 "Candidate Score" |
| `ScoreClassification`, `ConsensusResult` | `consensus.ts` | §4 |
| 10-scenario CEO regression suite | `__tests__/ceo-consensus-scenarios.spec.ts` | CEO Consensus Scenarios doc (2026-05-14) — authoritative spec for the IQR quartile method |
| `reviewSlash(input)` | `slashing.ts` | §4 "Slashing Mechanics", §3 "Reputation Point Schedule" |
| `ReviewSlashInput`, `ReviewSlashResult` | `slashing.ts` | §4 |
| `tierOf(reputation)` | `rewards.ts` | §3 "Tier Thresholds" |
| `tierWeight(tier)` | `rewards.ts` | §3 "Vetting Reward Distribution" |
| `distributeReward(participants, pool)` | `rewards.ts` | §3 (PRIMARY — has worked examples A/B/C) |
| `rewardWeightLog2(reputation, avg, ε)` | `rewards.ts` | §7 (DIVERGENT — see contradictions below) |
| `Tier`, `RewardParticipant`, `RewardShare`, `RewardDistribution` | `rewards.ts` | §3 |
| `endorsementPayout(finalCompensation)` | `endorsement.ts` | §4 "Endorsement Outcome Matrix" |
| `notHiredSlash(stake)` | `endorsement.ts` | §4 "Critical Slashing Events" |
| `performanceSlash(lockedHalf, severity)` | `endorsement.ts` | §4 "Slashing Severity Scale" |
| `PERFORMANCE_SEVERITIES`, `PerformanceSeverity`, `EndorsementPayout` | `endorsement.ts` | §4 |

---

## Documented Appendix Contradictions

These are places where the Technical Appendix contradicts itself. The oracle does NOT silently resolve them — it implements one model as primary and exposes the other for comparison. Cross-reference: `docs/testing/WHITEPAPER_RECONCILIATION.md` §6.

### Contradiction A — Reward Weighting: §3 tier-weight vs §7 log2

- **§3 formula (PRIMARY):** `Reward_i = (m_i / Σm_j) × P`, where `m_i` is the tier weight (1.00 / 1.25 / 1.50). This is the form the appendix provides with **worked examples** (Examples A, B, C), making it the internally-consistent, verifiable model.
- **§7 formula (ALTERNATIVE, exposed as `rewardWeightLog2`):** `W_i = log2(R_i / R̄ + ε)`. This is a reputation-ratio log-weight formula with no matching worked examples. It produces different results than §3 for all non-uniform reputation distributions.
- **Oracle decision:** `distributeReward()` uses §3. `rewardWeightLog2()` exposes §7 for comparison only.

### Contradiction B — Candidate Score: §2/§4 "Adaptive Median Band" vs §7 "simple majority"

- **§4 / §7 "Candidate Score" (oracle implements):** Adaptive Median Band using IQR — `computeConsensus()` above.
- **§2 early mention:** A simpler "simple majority" framing appears in §2. The more detailed §4 spec with the IQR algorithm supersedes it.
- **Oracle decision:** Implements the §4 IQR algorithm. The §2 framing is considered an overview simplification.

---

## Running the Tests

All oracle tests are pure-function tests. They do NOT require Anvil, a backend, or a running frontend.

Run all oracle tests:
```bash
cd /path/to/front-end
npx playwright test e2e/real-flow/oracle/__tests__/ \
  --config=e2e/real-flow/playwright.real-flow.config.ts \
  --project=smoke \
  --reporter=line
```

Run a single module's tests:
```bash
npx playwright test e2e/real-flow/oracle/__tests__/consensus.spec.ts \
  --config=e2e/real-flow/playwright.real-flow.config.ts \
  --project=smoke \
  --reporter=line
```

Expected: 27 tests pass (5 consensus + 10 CEO consensus scenarios + 3 slashing + 5 rewards + 4 endorsement).

The `reuseExistingServer: true` flag in the Playwright config means these tests won't block on a missing frontend server — they run against pure TypeScript functions.
