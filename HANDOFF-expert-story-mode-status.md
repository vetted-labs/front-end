# Expert Story Mode Handoff

Date: 2026-04-29

## Current Status

Work is stopped. No local preview server is currently running on `3042` or `3043`.

The expert story mode implementation is mostly in place, but I would not call it fully product-ready yet because the final browser verification after the last hardening changes was blocked by Next dev-server cache/HMR issues. The unit, typecheck, and targeted lint checks passed after the final hardening changes.

## What Was Built

### Route-based story mode

- Added a story entry route under `src/app/story-lab/`.
- Story launches into real expert routes instead of a detached mock page.
- Current route arc:
  - `/expert/dashboard`
  - `/expert/guilds`
  - `/expert/guild/story-lab-engineering-guild`
  - `/expert/voting`
  - review modal steps on the real voting page
  - `/expert/notifications`
  - `/expert/earnings`
  - `/expert/reputation`
  - `/expert/endorsements`
  - `/expert/governance`
  - back to dashboard completion

### Story driver

- Added `ExpertStoryLabDriver`.
- No skip or close control is shown.
- Story advances only when the exact primary tour target is visible.
- Fallback targets may still help diagnose a missing section, but they no longer unlock progress.
- The driver uses a portaled modal overlay.
- The app shell behind the mandatory tour is marked `inert` and `aria-hidden` while story mode is open.
- Keyboard focus is kept inside the story driver.

### Synthetic story data

- Added deterministic story fixtures:
  - story Engineering guild
  - fake expert application for Maya Chen
  - fake notification result
  - fake earnings reward
  - fake reputation gain
  - fake endorsement candidate Riley Park
  - fake governance proposal
- Replaced runtime `Date.now()` story fixture timestamps with fixed ISO timestamps to reduce flake/hydration noise.
- Story guild data is injected even when the real expert has no guilds.

### Safety hardening

- Added a central API guard in `src/lib/api.ts`:
  - If `storyLab=expert` or `storyLabComplete=expert` is in the URL, non-read API mutations are blocked.
  - The only allowed story-mode mutation is `/api/experts/me/onboarding-state`.
- Guild feed fetching is skipped for the synthetic story guild so story mode does not call the real backend for fake guild posts.
- Direct completion deep links do not mark onboarding complete unless the story driver set the session completion flag.

### Expert first-run integration

- First-run approved experts are redirected into the story route instead of seeing the old static dashboard modal.
- The old dashboard-only story/practice modal path was removed from `EnhancedExpertDashboard`.
- Production story-preview auth bypass was restricted:
  - local/dev/E2E can use local story preview behavior
  - production still requires backend expert profile verification

### Auth/session cleanup from this work stream

- Expert wallet login no longer clears expert auth just because the wallet is disconnected.
- Expert auth state prefers the authenticated expert session instead of forcing immediate MetaMask connection on login page.
- The original “verify expert before wallet login” behavior was removed from the login path.

## Files Most Directly Touched For Story Mode

- `src/app/expert/layout.tsx`
- `src/app/story-lab/`
- `src/components/expert/story-lab/`
- `src/components/expert/applications/ApplicationsPage.tsx`
- `src/components/expert/NotificationsPage.tsx`
- `src/components/expert/EarningsPage.tsx`
- `src/components/expert/ReputationPage.tsx`
- `src/components/EndorsementMarketplace.tsx`
- `src/components/governance/GovernancePage.tsx`
- `src/components/governance/LiveVoteBanner.tsx`
- `src/components/guilds/GuildsOverview.tsx`
- `src/components/GuildDetailView.tsx`
- `src/components/guild/GuildFeedTab.tsx`
- `src/components/layout/AppShell.tsx`
- `src/lib/api.ts`
- `src/contexts/AuthContext.tsx`
- `src/lib/hooks/useExpertAccount.ts`
- `src/__tests__/expert-story-lab.test.ts`
- `e2e/expert-story-lab.spec.ts`

The worktree has many other modified/untracked files that were already part of the broader branch/session. Do not assume every dirty file was caused by the story-mode work.

## Verification Done

After the final hardening changes:

- `npm run typecheck`
  - passed
- `npm test -- --run src/__tests__/expert-story-lab.test.ts`
  - passed: 12 tests
- targeted lint over changed story/safety files
  - passed

Before the final hardening changes:

- `PLAYWRIGHT_BASE_URL=http://localhost:3042 npx playwright test e2e/expert-story-lab.spec.ts --project=chromium --retries=0`
  - passed: 4/4 tests

After the final hardening changes:

- Full Playwright rerun was not completed.
- The blocker was local Next dev-server instability, not a known app assertion failure:
  - webpack dev server produced missing `.next/server/vendor-chunks/*` and manifest errors
  - Turbopack on `3042` got stuck on stale HMR `/error` pings
  - Turbopack on `3043` started cleanly, but work was stopped before a full browser check

## Reviewer Feedback Addressed

Expert reviewer / devil’s advocate feedback that was fixed:

- primary target must be required for progression
- story fixtures should not use runtime timestamps
- story mode should centrally block backend mutations
- forced overlay should isolate the app behind it for keyboard/screen-reader safety
- story guild should be deterministic for users with empty guild lists
- production should not bypass backend expert verification just because story params exist

## What Is Left

### Must do before calling this done

1. Restart clean preview and manually inspect the product:
   ```bash
   NEXT_PUBLIC_E2E_MODE=true npx dotenv -e .env.local -- npx next dev --turbopack --port 3043
   ```
   Then open:
   ```text
   http://localhost:3043/story-lab/expert
   ```

2. Rerun the full story Playwright test after the clean server is stable:
   ```bash
   PLAYWRIGHT_BASE_URL=http://localhost:3043 npx playwright test e2e/expert-story-lab.spec.ts --project=chromium --retries=0
   ```

3. Confirm the final hardening change did not break the browser flow:
   - app shell should be inert while the overlay is open
   - every step should show `Target visible`
   - no skip/close controls
   - Finish should disappear the story UI
   - no real mutating API calls should be made

### Product improvements still worth doing

1. Endorsements and governance still mostly explain where those pages live, not the full action mechanics.
   - Better next step: add read-only detail/action steps for endorsement and governance vote surfaces.

2. The story is functional but still needs UX review from an actual first-time user.
   - Watch if they understand: guild -> review -> consensus -> reward -> reputation -> endorsement -> governance.

3. The global sidebar hydration warning remains outside this story implementation.
   - It showed up as `Home` vs `Application` in AppSidebar during tests.
   - Tests filtered it, but it should be fixed separately.

4. Clean up local generated artifacts after confirming nothing important is inside them:
   - `.next.story-lab-bak-*`
   - Playwright HTML report/output folders if not needed

### Caution

The central API guard intentionally blocks almost all mutations while `storyLab=expert` is in the URL. If future story steps need a safe local-only action, add a deliberate allowlist/mock path. Do not loosen the guard broadly.

## Fast Resume Plan

1. Start clean preview on `3043`.
2. Open `/story-lab/expert` and manually click through the full story.
3. Run the Playwright story spec on `3043`.
4. If green, ask for one product review pass focused only on clarity of the story arc.
5. Add endorsement/governance action-surface steps only if the story still feels too shallow there.
