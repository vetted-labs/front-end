# Expert Onboarding Tour Handoff

## Scope

Implements the Session 3 expert first-run walkthrough from:

`/Users/svendaneel/Desktop/vetted/docs/beta-hardening-sessions/03-expert-first-run-walkthrough.md`

This lane owns approved-expert onboarding, dashboard checklist, replay/dismiss persistence, stable tour targets, and scoped first-run copy fixes. It does not own backend behavior or broad review-flow routing changes.

## Current Behavior

- Approved experts on `/expert/dashboard` get a one-time, dismissible 7-step guided tour.
- The tour can be replayed from the dashboard header or checklist.
- The checklist is dismissible and replayable; skip/done does not fake checklist completion.
- Tour and checklist state persist per expert identity:
  - `vetted:expert-onboarding-tour:v1:${expertId}`
  - wallet fallback: `vetted:expert-onboarding-tour:v1:${walletAddress.toLowerCase()}`
- Wallet fallback state migrates into the expert-id key once both identities are known.
- Non-E2E shell/onboarding progress uses backend-verified profile status and expert id, not stale localStorage.
- Dashboard onboarding requires wallet verification for the active wallet via `isVerifiedFor(address)`.
- Expert application wallet verification is scoped to the active wallet; a verified wallet or pending signature from wallet A does not satisfy wallet B.
- Non-E2E backend profile verification fails closed when the loaded profile is missing `status` or `id`.
- `firstReviewOpened` is no longer inferred from URL shape. It is recorded only after:
  - an assigned voting detail page loads and is not stake-locked, or
  - the `/expert/voting` review modal opens with a selected application, or
  - a guild review modal opens with a selected application.
- `commitRevealViewed` is recorded only from the primary tour step or the visible dashboard explainer action. Checklist activation only scrolls/focuses the explainer.

## Tour Steps

1. Dashboard overview: `expert-dashboard-overview`
2. Expert navigation: `expert-sidebar` / `expert-mobile-nav`
3. Review queue: `expert-review-queue`
4. Staking requirement: `expert-staking-status`
5. Commit/reveal: `expert-commit-reveal` with review queue fallback
6. Notifications: `expert-notifications`
7. Rewards/reputation: `expert-rewards-summary`

## Changed Files

Core onboarding:

- `src/lib/expert-onboarding-tour.ts`
- `src/lib/hooks/useExpertOnboardingTour.ts`
- `src/lib/expert-onboarding-route-markers.ts`
- `src/components/expert/onboarding/*`
- `src/components/EnhancedExpertDashboard.tsx`
- `src/app/expert/layout.tsx`

Targets and progress signals:

- `src/components/dashboard/ReviewQueue.tsx`
- `src/components/dashboard/RankProgress.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/MobileTopBar.tsx`
- `src/components/layout/NotificationBell.tsx`
- `src/components/GuildDetailView.tsx`
- `src/components/expert/VotingApplicationPage.tsx`
- `src/lib/api.ts`
- `src/lib/hooks/useWalletVerification.ts`

Copy fixes:

- `src/components/expert/CommitRevealExplainer.tsx`
- `src/components/guild/review/ReviewSuccessStep.tsx`
- `src/components/expert/FirstTimeReviewerGuide.tsx`
- `src/components/expert/DeadlineWarningBanner.tsx`
- `src/components/expert/ReviewSubmitStep.tsx`

Tests/browser QA:

- `src/__tests__/expert-onboarding-tour.test.ts`
- `src/__tests__/expert-onboarding-tour-ui.test.tsx`
- `src/__tests__/expert-onboarding-route-markers.test.ts`
- `src/__tests__/wallet-verification.test.tsx`
- `e2e/expert-onboarding-tour.spec.ts`

## Verification

Passing:

```bash
npm test -- src/__tests__/expert-onboarding-route-markers.test.ts src/__tests__/expert-onboarding-tour.test.ts src/__tests__/expert-onboarding-tour-ui.test.tsx src/__tests__/wallet-verification.test.tsx
```

Result: 58 tests passed.

Passing:

```bash
npm run typecheck -- --pretty false
```

Passing:

```bash
npx playwright test e2e/expert-onboarding-tour.spec.ts --project=chromium
```

Result: 8 browser tests passed. Screenshots refreshed:

- `output/playwright/expert-dashboard-tour-desktop.png`
- `output/playwright/expert-dashboard-tour-mobile.png`

Scoped lint exits 0:

```bash
npm run lint -- src/lib/expert-onboarding-route-markers.ts src/lib/hooks/useExpertOnboardingTour.ts src/lib/hooks/useWalletVerification.ts src/lib/api.ts src/components/EnhancedExpertDashboard.tsx src/components/GuildDetailView.tsx src/components/expert/VotingApplicationPage.tsx src/components/dashboard/ReviewQueue.tsx src/components/dashboard/RankProgress.tsx src/components/layout/AppSidebar.tsx src/components/layout/MobileTopBar.tsx src/components/layout/NotificationBell.tsx src/app/expert/layout.tsx src/components/expert/CommitRevealExplainer.tsx src/components/guild/review/ReviewSuccessStep.tsx src/components/expert/FirstTimeReviewerGuide.tsx src/components/expert/DeadlineWarningBanner.tsx src/components/expert/ReviewSubmitStep.tsx src/__tests__/expert-onboarding-route-markers.test.ts src/__tests__/expert-onboarding-tour.test.ts src/__tests__/expert-onboarding-tour-ui.test.tsx src/__tests__/wallet-verification.test.tsx e2e/expert-onboarding-tour.spec.ts
```

Known lint output: two pre-existing `GuildDetailView` hook-dependency warnings remain.

## Review Gate Notes

Reviewer/devil passes found and this lane fixed:

- stale local approved status could show privileged chrome;
- unverified wallet could reveal the tour after closing the verification modal;
- wallet verification state was not scoped to the active wallet;
- expert application flow reused stale wallet verification after wallet switches;
- malformed backend expert profiles with missing `status` or `id` did not fully fail closed;
- `firstReviewOpened` was over-marked from URL shape;
- `/expert/voting` review modal opens did not mark `firstReviewOpened`;
- stake-locked direct review pages could mark `firstReviewOpened`;
- direct voting detail initially lost reviewer flags in `getDetails`;
- E2E layout progress was blocked by non-E2E fail-closed profile status logic;
- commit/reveal could be completed from checklist activation alone;
- mobile/desktop target selection and target/panel overlap needed coverage.

## Residual Risk

- Browser QA is seeded/mocked. Staging should still verify real wallet verification timing, real assigned review payloads, notification counts, and real rewards/reputation data.
- The dev server prints Next/Turbopack and Lit dev-mode warnings during Playwright runs; they are environment warnings, not onboarding test failures.
