# Mocked-Lane Triage — `e2e/*.spec.ts`

> **Date:** 2026-05-14 · **Captured against front-end commit `b319dc8`**
> Part of E2E Test Hardening Workstream A (Task 12). Triage produced by 4 parallel read-only subagent reviews.

## Purpose

The `e2e/*.spec.ts` "mocked lane" (43 files) uses `page.route()` to mock the API/chain — it proves "the component renders what the mock returned", not that flows work. This triage classifies each file:

- **delete** — pure render-smoke (asserts only that headings/elements render after a mock), no meaningful interaction or regression value.
- **keep+upgrade** — has real regression value, but `test.step()` labels are cosmetic single-`Verify:` wrappers that must be re-segmented into human-readable phases (per `e2e/PLAYWRIGHT_TEMPLATE.md`).
- **keep** — already valuable AND already reasonably self-describing.

> ⚠️ **HUMAN REVIEW GATE:** every `delete` verdict below must be confirmed by a human reviewer before the file is removed. Deletions and step-upgrades are executed in a follow-up subagent wave, one commit per batch, only after sign-off. This document is the tracking record; the `Status` column tracks execution.

## Summary

| Verdict | Count | Files |
|---|---|---|
| **delete** | 13 | browse-jobs, candidate-dashboard, candidate-full-flow, candidate-messaging, candidate-notifications, company-full-flow, expert-dashboard, expert-endorsements, expert-guild-detail, expert-navigation-benchmark, expert-pages, public-pages, slashing-endorsements |
| **keep+upgrade** | 29 | (all not listed elsewhere) |
| **keep** | 1 | expert-session |

## Triage table

| File | Tests | Verdict | Rationale | Status |
|---|---|---|---|---|
| `appeal-flow.spec.ts` | 4 | keep+upgrade | Real interactions (form open/close, char-count validation gating submit, cancel toggle, existing-appeal branch); cosmetic single-step wrappers. | pending |
| `browse-jobs.spec.ts` | 5 | delete | All assert only a search input / `body` visible; one checks `status() < 500`. Pure render-smoke. | pending |
| `bug-regressions.spec.ts` | 9 (6 active) | keep+upgrade | Exercises a real reported bug (stale expert wallet bleeds into candidate session), asserts localStorage transitions; cosmetic steps. | pending |
| `candidate-applications.spec.ts` | 4 | keep+upgrade | Real interaction (Browse Jobs → URL change), error-toast-absence, empty-state copy; cosmetic steps. | pending |
| `candidate-dashboard.spec.ts` | 6 | delete | Only asserts headings/stat labels/links visible after signup; no interactions. | pending |
| `candidate-full-flow.spec.ts` | 4 | delete | Nav tests assert only `bodyText.length > 50`; "full flow" label misleading. | pending |
| `candidate-guild-application.spec.ts` | 9 | keep+upgrade | Thorough multi-step form coverage (validation, answer preservation, conditional steps, min-length); cosmetic steps. | pending |
| `candidate-guild-tracking.spec.ts` | 5 | keep+upgrade | Asserts grouping logic, status buckets, ARIA names from known fixtures; cosmetic steps. | pending |
| `candidate-job-application.spec.ts` | 3 | keep+upgrade | Genuine two-context cross-role flow + Browse Jobs nav; cross-role test needs phase segmentation, stats test fragile. | pending |
| `candidate-messaging.spec.ts` | 3 | delete | Only asserts heading / empty-state / no-500. No messaging interaction. | pending |
| `candidate-notifications.spec.ts` | 4 | delete | Only asserts headings/filter labels/empty-state visible. No tab-switch or filter behavior. | pending |
| `candidate-profile.spec.ts` | 6 | keep+upgrade | Tab navigation, empty-state CTA + URL assert, API-500 detection; cosmetic single-step wrappers. | pending |
| `commit-reveal-voting.spec.ts` | 7 | keep+upgrade | Full commit-reveal phase state machine + localStorage auto-fill + lost-nonce warning; cosmetic steps. | pending |
| `company-auth.spec.ts` | 6 | keep+upgrade | Signup→dashboard redirect, token storage, duplicate-email/invalid-cred errors, role toggle; cosmetic steps. | pending |
| `company-dashboard.spec.ts` | 7 | keep+upgrade | Unauthenticated redirect, empty-state CTA + URL nav, API-500 detection; cosmetic steps. | pending |
| `company-full-flow.spec.ts` | 3 | delete | Render-smoke; content already covered by company-dashboard + company-profile specs. | pending |
| `company-job-posting.spec.ts` | 4 | keep+upgrade | Fills + submits multi-section job form end-to-end, required-field validation, back-nav; cosmetic steps. | pending |
| `company-profile.spec.ts` | 8 | keep+upgrade | Edit/save/cancel cycle with success assert, unauthenticated redirect, a documented bug workaround; cosmetic steps. | pending |
| `expert-dashboard.spec.ts` | 5 | delete | Pure render-smoke behind full mocks: stat-card labels + headings visible. | pending |
| `expert-earnings.spec.ts` | 5 | keep+upgrade | Unauthenticated-redirect (401→connect-wallet) + time-range filter refetch counter are real; 3/5 are render-smoke; cosmetic steps. | pending |
| `expert-endorsements.spec.ts` | 4 | delete | Render-smoke: navigate + assert heading/badge visible. No interaction or state change. | pending |
| `expert-guild-detail.spec.ts` | 4 | delete | Entire describe block is `.skip(...)` with a TODO (mocks don't intercept reliably); also render-smoke. | pending |
| `expert-login.spec.ts` | 6 | keep+upgrade | Tab-switch interaction + UI contracts (Expert tab hides email, signup excludes Expert tab, Apply link nav); cosmetic steps. | pending |
| `expert-navigation-benchmark.spec.ts` | 2 | delete | Not a regression test — a perf timing harness; only assertion is "loop iterated". | pending |
| `expert-navigation-flow.spec.ts` | 2 | keep+upgrade | Sidebar link completeness + client-side nav with URL asserts; cosmetic steps. | pending |
| `expert-onboarding-tour.spec.ts` | 2 | keep+upgrade | High-value: story modal non-dismissable, deep-link redirect back to story; cosmetic steps. | pending |
| `expert-pages.spec.ts` | 6 | delete | Pure render-smoke; several assertions un-falsifiable (`hasForm || hasWalletWarning`). | pending |
| `expert-profile.spec.ts` | 5 | keep+upgrade | Meaningful no-error-toast assertion + mock data → stat cards/headings contract; collapse into fewer focused tests. | pending |
| `expert-reputation.spec.ts` | 6 | keep+upgrade | Verifies specific computed values (score 350, tier, gains/losses, alignment %) + disconnected state; cosmetic steps. | pending |
| `expert-route-protection.spec.ts` | 4 | keep+upgrade | Role-based routing (unauthenticated/cross-role redirects, no-crash, wallet-disconnected state); cosmetic steps. | pending |
| `expert-session.spec.ts` | 5 | keep | Cross-role session isolation via live helper calls + multi-key localStorage invariants; relatively self-describing. | pending |
| `expert-story-lab.spec.ts` | 7 | keep+upgrade | Highest-value in batch: all 15 story-lab steps, URL transitions, aria/inert, leak detector; 300+-line single steps need segmentation. | pending |
| `expert-voting-detail.spec.ts` | 9 | keep+upgrade | Distinct UI states (open/staking-not-met/already-voted/finalized/history) + real button interaction + vote-API assertion; cosmetic steps. | pending |
| `expert-voting-flow.spec.ts` | 4 | keep+upgrade | Role-gated voting page across mock states (unvoted/voted/profile/score); cosmetic steps. | pending |
| `expert-voting-queue.spec.ts` | 8 | keep+upgrade | Meaningful state variants (staking warning, empty, filter tabs, assigned badge, per-card lock); cosmetic steps. | pending |
| `navigation.spec.ts` | 8 | keep+upgrade | Cross-role auth-guard redirects, login↔signup nav, homepage console-error assert; cosmetic steps. | pending |
| `negative-tests.spec.ts` | 7 | keep+upgrade | High-value error-path coverage; one test has a vacuous `expect(true).toBeTruthy()` to fix; cosmetic steps. | pending |
| `public-pages.spec.ts` | 8 | delete | Pure render-smoke: navigate + assert heading/`body` visible; low-value assertions. | pending |
| `slashing-endorsements.spec.ts` | 2 | delete | Only asserts a heading visible + no error toasts; nothing slashing-related despite the name. | pending |
| `slashing-finalization.spec.ts` | 4 | keep+upgrade | Verifies slashing-tier banners, exact rep changes, slash %, IQR stats from mocked payloads; cosmetic steps. | pending |
| `slashing-reputation.spec.ts` | 6 | keep+upgrade | Specific numeric display invariants (score, tier, gains/losses, timeline) from a mock fixture; cosmetic steps. | pending |
| `slashing-vote-weight.spec.ts` | 4 | keep+upgrade | Concrete derived-value rule (1500 rep → 2.50× weight, tier label) + no-error guard; cosmetic steps. | pending |
| `staking-ui.spec.ts` | 4 | keep+upgrade | Enabled/disabled state boundary of vote button under two staking conditions; cosmetic steps. | pending |

## Next steps (follow-up, gated on human sign-off)

1. **Human reviewer confirms the 13 `delete` verdicts.** A few are worth a second look: `expert-guild-detail` (already `.skip`-ped — safe), `expert-navigation-benchmark` (perf harness — consider moving rather than deleting), `candidate-full-flow`/`company-full-flow` (the "full flow" naming may matter to Auto Mate even if shallow).
2. **Delete wave:** remove confirmed files, one commit per batch, update `Status` → `deleted`.
3. **Upgrade wave:** re-segment the 29 `keep+upgrade` files' `test.step()` labels into human-readable phases per `e2e/PLAYWRIGHT_TEMPLATE.md`, one commit per batch, update `Status` → `upgraded`. Also fix the vacuous `expect(true).toBeTruthy()` in `negative-tests.spec.ts`.
