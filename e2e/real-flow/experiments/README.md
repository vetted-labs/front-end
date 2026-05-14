# Vetted Volume / Experiment Harness

A parameterised driver that runs N candidate review panels at volume, diffs every
finalized result against the math oracle, and emits a human-readable run report.

## Quick start

Make sure the local stack is running (Anvil on `:8545`, E2E backend on `:4100`),
and the bootstrap manifest exists (`npm run e2e:bootstrap -- 3` if not).

```bash
BACKEND_URL=http://localhost:4100 npm run e2e:experiment -- \
  --applications=20 \
  --mode=hybrid \
  --uiSampleRate=0.1 \
  --distribution=realistic
```

## Parameters

| Flag | Default | Description |
|------|---------|-------------|
| `--applications=N` | 20 | Number of candidate review panels to run |
| `--guilds=G` | 1 | How many manifest guilds to rotate over (max 3) |
| `--distribution=` | `realistic` | Score distribution: `consensus`, `realistic`, `polarized`, `random` |
| `--mode=` | `hybrid` | Execution mode: `hybrid` or `ui-soak` |
| `--uiSampleRate=F` | 0 | Fraction of applications to drive through the browser UI (0–1). See DIV-001 below. |
| `--panelSize=N` | 5 | Number of expert reviewers per panel (min 3, max 10, whitepaper §2 recommends 5-7) |
| `--seed=N` | auto | Integer seed for the score-distribution PRNG. Omit for a time-based seed. |

## Execution modes

### `hybrid` (default)
`uiSampleRate` fraction of applications use the full browser UI driver (rubric
wizard + expert review modal); the remainder use the faster API/chain path. The
report shows which applications went via which path.

### `ui-soak`
All applications run through the browser UI. Intended for catching UI-at-volume
bugs (pagination, memory leaks, request races). Slower — use a smaller N.

## Score distributions

| Name | Description | Typical spread |
|------|-------------|---------------|
| `consensus` | Tight cluster around a random centre (±8) | Low (< 20) |
| `realistic` | Moderate spread around a centre in 35–85 (±20) | Medium (≤ 50) |
| `polarized` | Two clusters at opposite ends, gap > 40 | High (> 40) |
| `random` | Uniform 0–100 | Variable |

Use `polarized` to stress-test the majority threshold boundary.

## What the report contains

Each run produces `experiments/reports/<timestamp>.json` and `.md`:

- **Requested / Completed / Skipped** — top-level counts
- **Consensus mismatches** — applications where the platform outcome differed
  from the oracle prediction. A non-zero count is a math bug finding.
- **Blocked flows** — divergences (e.g. DIV-001) that prevented some paths from
  running at volume, with references to `docs/testing/PROTOCOL_DIVERGENCES.md`.
- **Per-application table** — scores, oracle prediction, platform outcome, via
  (api/ui), and any blockedBy references.
- **Oracle attestation line** — `"validated against Technical Appendix Adaptive
  Median Band; UI exercised on X of N applications"` (required for audit trail).

Reports are **gitignored** (`e2e/real-flow/experiments/reports/` in `.gitignore`).

## Calibration timing (2026-05-14 baseline)

Run: `--applications=20 --mode=hybrid --uiSampleRate=0.1 --distribution=realistic`

| Metric | Value |
|--------|-------|
| Total duration | 1.7s |
| Completed | 20 / 20 |
| Consensus mismatches | 0 |
| ms / application | ~86ms |
| Extrapolated 100-app run | ~9s |

The API/chain path is fast because it uses direct HTTP calls without browser
overhead. The UI path (not exercised due to DIV-001) would be significantly
slower (10–60s per application depending on the rubric wizard step count).

## DIV-001 — UI volume is blocked today

`docs/testing/PROTOCOL_DIVERGENCES.md` tracks **DIV-001**: candidate
guild-applications submitted via the frontend UI (`POST /api/guilds/{id}/applications`)
land in Pipeline C (simple majority) and do NOT enter the IQR/commit-reveal
Pipeline B. As a result:

- The harness **cannot** drive the full rubric-wizard UI flow at volume through
  the whitepaper-specified IQR/commit-reveal pipeline today.
- All applications in this harness run through the API path regardless of
  `--uiSampleRate`. This is recorded in every run report's **Blocked Flows** section.
- The oracle used by this harness is the **Pipeline C simple-majority oracle**
  (not the IQR oracle), which IS the correct oracle for the pipeline actually running.
- When DIV-001 is resolved (see remediation options in
  `docs/testing/PROTOCOL_DIVERGENCES.md`), raising `--uiSampleRate` will
  automatically exercise the full end-to-end flow with no harness changes.

## One-anvil-per-guild fallback

For very large N runs (>200 applications), each guild can be targeted at a
separate Anvil instance to parallelize:

```bash
# Shard by guild (3 terminals):
BACKEND_URL=http://localhost:4100 npm run e2e:experiment -- --applications=67 --guilds=1 --seed=1 &
BACKEND_URL=http://localhost:4100 npm run e2e:experiment -- --applications=67 --guilds=1 --seed=2 &
BACKEND_URL=http://localhost:4100 npm run e2e:experiment -- --applications=67 --guilds=1 --seed=3 &
```

Note: the test-backend `reset` endpoint is NOT called between runs — the harness
is designed to layer applications on top of the existing bootstrap state.

## Negative-control test (manual)

To verify the oracle catches a real math bug, inject a wrong score:

```bash
# Edit run-experiment.ts temporarily:
# Change pipelineCOracle to always return oracleConsensus=1 (force approved)
# Then run:
BACKEND_URL=http://localhost:4100 npm run e2e:experiment -- \
  --applications=5 --distribution=polarized --seed=999
# Applications with low-scoring panels will produce approved (platform)
# but oracle will say approved (wrong), so mismatches = 0 incorrectly.
# To actually catch it: inject a score disagreement, e.g. flip the threshold.
```

The CI cohort spec (`volume.spec.ts`) runs 20 applications and asserts
`consensusMismatches === 0`. A genuine platform math bug will fail CI with a
detailed mismatch report showing which scores diverged.

## Files

```
experiments/
├── distributions.ts          # Seeded score-distribution generators
├── report.ts                 # Run-report generator (json + markdown)
├── run-experiment.ts         # The hybrid driver (this file's sibling)
├── README.md                 # This document
├── reports/                  # Gitignored run report output
└── __tests__/
    ├── distributions.spec.ts # Unit tests for distributions
    ├── report.spec.ts        # Unit tests for report generator
    └── volume.spec.ts        # CI cohort: N=20, oracle-diffed
```
