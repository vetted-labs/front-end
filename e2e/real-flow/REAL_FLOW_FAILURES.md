# Real-flow lane — failing tests handoff

**As of:** 2026-05-23 · branch merged to `main` (FE `a806ace`).
**Lane:** `e2e/real-flow/**` (real frontend + real backend + anvil, no mocks).
**Status:** fast UI lane is green (166/0/9). Real-flow latest full run =
**131 passed / 0 failed / 11 skipped** (142 total).

## How to run / reproduce
Stack must be up: anvil `:8545` (chain 11155111, contracts deployed + multicall3
`setCode`'d at `0xcA11…CA11`), e2e backend `:4100` (`vetted_e2e` DB,
`E2E_FIXTURE_ENABLED=true`), frontend `:3030` in E2E mode pointed at `:4100` with
all `NEXT_PUBLIC_CONTRACT_*` + anvil RPC env. Then:
```bash
npm run e2e:bootstrap -- 3        # 3 guilds × 10 staked experts + manifest
npm run e2e:real-flow             # full lane
# one spec:
BACKEND_URL=http://localhost:4100 PLAYWRIGHT_BASE_URL=http://localhost:3030 \
  npx dotenv -e .env.local -- npx playwright test \
  --config=e2e/real-flow/playwright.real-flow.config.ts <spec> --reporter=line
```

## Latest full-lane verification — 2026-05-23

The full real-flow lane is green with the current worktree:

```bash
BACKEND_URL=http://localhost:4100 PLAYWRIGHT_BASE_URL=http://localhost:3030 \
  npm run e2e:real-flow -- --reporter=line --retries=0
```

Result: **131 passed / 0 failed / 11 skipped** in ~8.9m.

Additional focused gates from the final hardening pass:

- Candidate auth group (`candidate-login-ui`, `candidate-signup-ui`) across
  review + platform projects -> **4 passed**.
- Company signup consumers (`job-to-hire`, `job-to-not-hired-slashing`, and the
  four hiring UI specs) across review/platform where applicable -> **10 passed**.
- Expert login smoke -> **2 passed**.
- Slashing misalignment panel -> **1 passed** with strict DB `-20/+10` deltas.
- Platform cross-role hire/not-hired group -> **2 passed**.
- Frontend `npm run typecheck` -> **passed**.
- Backend `npm run build` -> **passed**.

Root causes closed in the final pass:

- The test expert-pruning endpoint now restores mutable manifest baselines
  (`experts.reputation_score = 100`, `guild_memberships.reputation_in_guild = 0`)
  after reset. This prevents reputation-mutating scenarios from leaking into
  later slashing tests while preserving the exact `-20/+10` protocol assertions.
- Candidate/company signup helpers now guard against anonymous signup draft
  hydration clearing required fields after Playwright fills them.
- Expert login now tolerates the dashboard redirect winning a race against a
  Connect Wallet click during sequential identity tests.
- The volume harness treats already-finalized panels as a completed early
  finalization path instead of retrying stale reviewers after the first
  successful finalization.

---

## Historical finding
**Most candidate-review failures pass in isolation but fail in the full sequential
run** — this is a **cross-test isolation problem**, not per-test bugs. e.g.
`candidate-guild-review-ui.spec.ts:16` passes alone (verified, ~10s) but fails when
the file's other tests run before it. The lane is `workers:1, fullyParallel:false`;
each test spawns the candidate page **plus N fresh per-reviewer browser contexts**
and takes anvil snapshots that accumulate. Symptoms: the review modal stops
auto-opening (`getByLabel('Close review modal')` times out), and `GuildWorkspacePage`
stops resolving the expert (its data fetch gates on a **live wagmi `isConnected`**
that doesn't reliably re-establish in a fresh context after several tests).
**Highest-leverage fix to investigate: proper per-test teardown of the extra browser
contexts (close them), and/or making `GuildWorkspacePage` resolve the expert from
the stored wallet (like `ApplicationsPage`/`useExpertAccount` does) instead of gating
on a live wagmi connection.** This likely clears most of the candidate-review set at once.

---

## Progress update — 2026-05-23

Implemented the shared context-registry cleanup, stored-wallet expert resolution
fallbacks, deterministic candidate-review deep-link handling, and Pipeline-B
assignment/session readiness bridges.

Fresh verification:

- Category A grouped command: `candidate-guild-review-ui.spec.ts`,
  `candidate-endorsement-ui.spec.ts`, `ui-review.smoke.spec.ts`,
  `review-wizard-states.smoke.spec.ts` -> **6 passed**.
- Category C grouped command: `job-to-hire-ui.spec.ts`,
  `job-to-not-hired-slashing-ui.spec.ts` -> **4 passed** across matching
  projects.
- Touched expert group: `concurrent-votes.spec.ts`,
  `expert-reward-claim-ui.spec.ts`, `expert-workspace-tabs-ui.spec.ts` ->
  **2 passed / 4 project-level skipped**.
- `concurrent-votes.spec.ts --project=platform --repeat-each=2` -> **2 passed**.
- Frontend unit regression files -> **9 tests passed**.
- Frontend `npm run typecheck` -> **passed**.
- Backend `npm run build` -> **passed**.

Superseded by the latest full-lane verification above.

### Category-B update — 2026-05-23

`vote-after-deadline` and `expert-stake-withdrawal` are now green across both
matching projects:

- `--project=review` grouped command -> **2 passed**.
- `--project=platform` grouped command -> **2 passed**.
- Frontend `npm run typecheck` -> **passed** after the category-B fixes.
- Backend `npm run build` -> **passed** after the forfeited-assignment query fix.
- Focused backend regression:
  `npm test -- src/features/proposals/__tests__/reviewer-selection.service.test.ts -t "should not return forfeited assignments as active proposals"`
  -> **1 passed / 18 skipped**.

Key root-cause fixes:

- Forfeited `proposal_reviewer_assignments` rows are no longer surfaced as
  active assigned work in reviewer selection, expert dashboard/profile counts,
  candidate proposal queries, or candidate review submission authorization.
- `vote-after-deadline` now asserts the current forfeiture invariant: the
  original non-committing reviewer has no active queue item, sees the forfeiture
  activity, cannot access the voting form, and direct vote API calls are
  rejected by commit-reveal/finalization gating.
- `expert-stake-withdrawal` now scopes guild selection inside the staking modal
  so it cannot click the background allocation chart, only clicks enabled
  close/done controls, and defaults to contract-direct `completeUnstake` after
  the anvil cooldown skip because the UI completion gate uses browser wall
  clock time (DIV-013). Set `DIV_013_ATTEMPT_UI=true` to probe the UI completion
  path explicitly.

Superseded by the latest full-lane verification above.

---

## Historical failures by category

### A) Candidate-review modal / workspace fragility (6 tests)
- `__tests__/candidate-guild-review-ui.spec.ts` (3: `:16`, `:103`, `:186`)
- `__tests__/candidate-endorsement-ui.spec.ts` (1)
- `__tests__/ui-review.smoke.spec.ts` (1)
- `__tests__/review-wizard-states.smoke.spec.ts` (1)

**Why:** review modal fails to open in the full run (see #1). `ui-review.smoke` and
`:16` are confirmed to pass individually. Two real opening paths exist and differ in
reliability: `/expert/voting?reviewAppId=…` (ApplicationsPage — resolves expert from
localStorage, **reliable**) vs the `/expert/guild/[id]` workspace queue
(GuildWorkspacePage — gates on live wagmi, **flaky in fresh contexts**). Prefer the
ApplicationsPage path. NOTE: the candidate review writes to
`candidate_guild_application_reviews` (single-shot Pipeline-C path), and with the
**temp 1-vote approval threshold** (see project memory `project_temp_approval_threshold`)
the candidate is `approved` after ONE review — so multi-reviewer loops must be
adaptive (stop when approved) and use the `submit-review` test fixture
(`POST /api/test/candidate-reviews/:id/submit-review`, added this session) for
extra reviewers rather than driving N UI contexts.

### B) Expert on-chain / state-timing (6 tests)
- `scenarios/expert/concurrent-votes.spec.ts` (2) — waits for `getByRole('button',{name:/^review$/i})`; the redesigned "Reviews" page (`ApplicationsPage`) needs the right tab selected first; concurrent login also contends on the single backend.
- `scenarios/expert/vote-after-deadline.spec.ts` (2) — waits for `getByTestId('review-queue-item-expired')`; the spec finalized via the **legacy** `candidate_guild_applications` path which doesn't set `candidate_proposals.finalized`, so the dashboard ReviewQueue (reads `candidate_proposals`) never shows the expired row. Fix: finalize via the commit-reveal cron path (`processProposalTransitions`).
- `scenarios/expert/expert-stake-withdrawal.spec.ts` (2) — `Withdraw` button stays disabled. Two issues: (1) the withdraw mode-toggle is gated on `currentStake`, which only loads **after** a guild is selected (deadlock — select guild first; modal already opens in withdraw mode); (2) **DIV-013**: the UI cooldown gate uses wall-clock `Date.now()`, which anvil `evm_increaseTime` can't advance — so the UI never sees the 7-day cooldown elapse. The contract's own `completeUnstake` (block.timestamp ≥ unlockTime) IS satisfiable, so fall back to a contract-direct `completeUnstake` for the on-chain assertion.

### C) Cross-role multi-actor (4 tests)
- `scenarios/cross-role/job-to-hire-ui.spec.ts` (2)
- `scenarios/cross-role/job-to-not-hired-slashing-ui.spec.ts` (2)

**Why:** these chain company → candidate → expert-review → endorsement → hire/slash.
They fail at the expert-review modal-open step (same root cause as category A). The
endorse-submit click can also be intercepted by a bottom-right "Couldn't load
earnings" Sonner toast (a `dismissToasts` helper before footer clicks was added to
`ui-endorsement-flow.ts`). Once category A's modal-open is stable, re-check these.

### D) Already FIXED this session (verify they hold in a clean full run)
- `scenarios/headline-candidate-guild-review.spec.ts` — was failing, now passes (commit-reveal panel + IQR).
- `__tests__/ui-review.smoke.spec.ts` and `candidate-guild-review-ui:16` — pass in isolation.

## Infrastructure fixed this session (rely on these)
- **pg pool/reset deadlock**: `/api/test/reset` was 503-ing from 6h-old zombie
  `TRUNCATE` txns; clearing stuck connections + backend restart fixed it. If reset
  starts timing out again, check `pg_stat_activity` for stuck `active` queries.
- **Expert-pool bloat**: repeated bootstraps left 50 experts/guild → random panel
  selection missed the manifest's 10. Fixed with `POST /api/test/seed/prune-experts`
  (restores expert + guild-membership graph to the manifest), wired into the
  `cleanState` fixture teardown. Keep guilds at exactly 10 manifest experts.
- **DIV-011/012** (createVettingSession onlyOwner): RESOLVED on this deploy — the
  backend wallet is the VettingManager owner AND a registered session creator.
- **7 backend seed endpoints** added (`/api/test/seed/governance-proposal|vote|
  message-thread|notifications|expert-notifications|applicants-for-job|approved-candidate`).
- **Review-modal toast intercept**: `dismissToasts()` added before footer Next/Submit
  clicks in `ui-review.ts` and `ui-candidate-review-flow.ts`.

## 11 skipped (intentional, `test.fixme`/`skip`)
Commit-reveal/endorsement protocol scenarios gated on documented DIV divergences;
some may now be un-skippable since DIV-011/012 resolved — re-evaluate.

## Key files
- Helpers: `e2e/real-flow/helpers/ui-candidate-review-flow.ts`, `ui-review.ts`,
  `ui-endorsement-flow.ts`, `ui-voting.ts`, `backend.ts`, `fixtures.ts` (cleanState).
- Backend test routes: `backend/src/routes/test/{candidate-reviews,seed-fixtures}.ts`.
- Product gating to review: `src/components/guild/GuildWorkspacePage.tsx`
  (`skip: !isConnected || !address`), `src/components/expert/applications/ApplicationsPage.tsx`
  (auto-open effect on `reviewAppId`).
