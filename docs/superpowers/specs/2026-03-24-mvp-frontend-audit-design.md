# Frontend MVP Audit & Production Hardening — Design Spec

**Date:** 2026-03-24
**Goal:** Make all expert-facing flows production-ready for beta launch (1-2 month timeline)
**Approach:** Flow-by-flow (refactor + UX + error handling per flow), with a cross-cutting horizontal pass first
**Beta audience:** Mix of crypto-native experts and mainstream companies/candidates, expert flows are primary focus

---

## Current State Summary

### What We're Doing Well

**Architecture:**
- 94% thin page shells (53/56 pages correctly delegate to components)
- API layer: 26 namespaces, 1707 lines, auto token refresh, error sanitization, GET deduplication
- Auth context handles 3 user types cleanly (candidate, company, expert with wallet-only auth)
- Provider stack well-ordered (Wagmi -> Query -> RainbowKit -> Theme -> Auth)

**Code Quality:**
- `any` usage minimal — strong type discipline
- `extractApiError()` widely adopted for consistent error extraction
- 178+ toast calls across 52 files — users get feedback on errors
- 48 `loading.tsx` files in app directory — route-level loading covered
- 17 components using EmptyState component
- Custom hooks well-built: `useFetch`, `useApi`, `useMountEffect`, `useRequireAuth`, `useClientPagination`

**Design System:**
- 32 UI primitives in `components/ui/`
- Consistent theming with CSS variables, light/dark mode support
- Glass morphism, gradient buttons, page-enter animations
- Fonts properly configured (Inter, Bree Serif, Bricolage Grotesque)

**Recent Wins:**
- Commit-reveal voting system implemented
- SIWE wallet verification added
- useEffect enforcement via ESLint
- Phase 1 data fetching standardization done

### What Needs Fixing

**Code Health:**
- 21 components over 500 lines (largest: JobDetailView at 961L)
- ~217 inline type definitions that should be in `@/types`
- ~40% of components still using manual useState + useEffect instead of useFetch/useApi
- 2 fat page files (LinkedIn callback 217L, governance 110L)
- ~119 raw useEffect instances across 44 files vs 17 useMountEffect uses across 8 files

**UX Gaps:**
- No breadcrumbs — users can't see where they are in deep flows
- No multi-step progress indicators for wizards (expert application, guild application)
- Form validation only on submit, not on blur/change
- No "confirm in wallet" messaging during blockchain transactions
- No guided onboarding for first-time experts
- Sidebar active route highlighting may exist (`SidebarNavItem.tsx`) but needs verification
- `window.confirm()` used instead of custom modals in HiringDashboard

**Shared Component Issues:**
- Modal missing Escape key handler, focus trap, focus restoration, animations
- Button `isLoading` prop accepted but doesn't render spinner or disable
- Alert component uses hardcoded `red-800` instead of design tokens
- Inconsistent button sizes (h-9 vs h-10), icon sizes (w-4 vs w-5), typography (text-sm vs text-xs for labels)

**Accessibility:**
- ~13 aria-labels across 237 components (~0.5% coverage)
- No `role` attributes on custom tabs, dialogs, status indicators
- 7 total `onKeyDown` handlers
- No focus traps in modals
- No keyboard navigation in dropdowns or custom components
- Images missing alt text in several components

**Event Propagation (Frontend Side):**
- Hire outcome recording is fire-and-forget (`.catch(() => toast.warning())`)
- Notification polling stops permanently on first error (`failedRef.current = true`)
- No auto-refresh of expert notifications/earnings/reputation after key events
- 30-second polling delay for notifications (no immediate refetch after state changes)
- Guild membership not refreshed after expert admission

---

## Execution Plan

### Phase 0: Horizontal Pass — Cross-Cutting Fixes (~1 week)

These affect every flow. Fix once, benefit everywhere.

#### 0.1 Modal Infrastructure

**Files:** `src/components/ui/modal.tsx`, `src/components/ui/dialog.tsx`

| Change | Details |
|--------|---------|
| Escape key to close | Add `useEffect` with `keydown` listener for Escape key |
| Focus trap | Trap Tab/Shift+Tab within modal when open. Use a lightweight approach: query focusable elements, wrap Tab at boundaries |
| Focus restoration | Store `document.activeElement` on open, restore on close |
| Enter/exit animations | Add fade + scale transition (CSS transition or Tailwind `animate-` classes) |
| Backdrop click | Already works — verify consistent across Modal and Dialog |

#### 0.2 Button Loading State

**File:** `src/components/ui/button.tsx`

| Change | Details |
|--------|---------|
| Render spinner when `isLoading` | Show `Loader2` icon with `animate-spin` when `isLoading={true}` |
| Disable when loading | Add `disabled={isLoading}` to prevent double-submit |
| Audit all forms | Find every form submission and ensure the submit button passes `isLoading` from the API state |

#### 0.3 Form Validation Pattern

Establish a reusable pattern for field-level validation. Create a `useFieldValidation(rules)` hook that returns `{ error, validate, onBlur }` and integrates with the existing `FormField` wrapper component. Per-form adoption of this pattern happens in Phase 1/2/3 as each flow is touched — Phase 0 only builds the pattern and applies it to one form as proof of concept.

| Change | Details |
|--------|---------|
| Create `useFieldValidation` hook | Returns `{ error, validate, onBlur }` — integrates with `FormField` component for inline error display |
| Create `ui/confirmation-modal.tsx` | Styled confirmation dialog to replace `window.confirm()` (needed in Phase 0 for HiringDashboard and Phase 2 for endorsement staking) |
| Validate on blur | Fields validate when user tabs/clicks away, not just on submit |
| Auto-focus first error | On submit with errors, focus the first invalid field |
| Inline error messages | Show error below the field immediately, not just at top of form |
| Remove `window.confirm()` | Replace with confirmation-modal in `HiringDashboard.tsx` (line 74) |

#### 0.4 Accessibility Baseline

| Change | Details |
|--------|---------|
| aria-labels on all icon buttons | NotificationBell, sidebar toggle, close buttons, action icons |
| `role="dialog"` on modals | Add to Modal and Dialog components with `aria-modal="true"` |
| `role="tab"` / `role="tabpanel"` | Add to all custom tab implementations |
| `role="status"` | Add to loading spinners, status badges |
| `alt` text on images | Audit all `<img>` / `<Image>` tags |
| Keyboard navigation | Arrow keys in tab groups, Enter to activate buttons |

#### 0.5 Navigation Context

| Change | Details |
|--------|---------|
| Sidebar active state | Verify `SidebarNavItem.tsx` already implements active state via `usePathname()`. If working, no changes needed. If broken/incomplete, fix it. |
| Breadcrumb component | Create `src/components/ui/breadcrumb.tsx` — used in PageShell |
| Add breadcrumbs to deep pages | Expert applications, guild detail, proposal detail, etc. |

#### 0.6 Event Propagation Hardening (Frontend Side)

**Files:** `src/lib/hooks/useApplicationStatusUpdate.ts`, `src/lib/hooks/useNotificationCountPolling.ts`

| Change | Details |
|--------|---------|
| Await hire outcome | Change from fire-and-forget to awaited with proper error handling + retry option |
| Resilient polling | Remove `failedRef.current = true` stop-on-first-error. Add exponential backoff: retry after 5s, 10s, 30s, 60s, then cap at 60s |
| Immediate refetch after key events | After status change / review submit / guild action, dispatch `window.dispatchEvent` to trigger immediate notification + relevant data refetch |
| Create `ui/transaction-status.tsx` | Shared component for wallet signing -> submitted -> confirmed feedback. Used in 4+ flows (commit-reveal, endorsement staking, withdrawals, guild staking) — justifies the abstraction per YAGNI rule. |

**Event dispatch design:**

| Event Name | Dispatched By | Listened By | Payload |
|------------|--------------|-------------|---------|
| `vetted:notification-refresh` | useApplicationStatusUpdate, ReviewSubmitSection, GuildApplicationFlow | useNotificationCountPolling | none (triggers immediate poll) |
| `vetted:reputation-refresh` | useApplicationStatusUpdate (on hire outcome) | ReputationPage, EarningsPage | none |
| `vetted:guild-membership-refresh` | GuildApplicationFlow, expert admission notification handler | "My Guilds" components | none |
| `vetted:endorsement-refresh` | EndorsementModal (after staking), hire outcome handler | MyActiveEndorsements, EndorsementMarketplace | none |

Components dispatch events via `window.dispatchEvent(new Event('vetted:notification-refresh'))`. Listeners use `useEffect` with `window.addEventListener` (legitimate raw useEffect use — subscribing to DOM events).

---

### Phase 1: Tier 1 Flows — Must Be Bulletproof (~2-3 weeks)

#### 1.1 Expert Onboarding Flow

**Current state:** ExpertApplicationForm.tsx (796L), manual auth checking, no progress indicator, no wallet state messaging

**Refactor:**

| Task | Details |
|------|---------|
| Split ExpertApplicationForm | Extract: `ExpertApplicationProgress.tsx` (step indicator using `ui/step-progress.tsx`), per-section components (`ProfessionalBackgroundSection.tsx`, `SkillsSection.tsx`, etc. — split by form section to avoid creating another 500L file), `WalletVerificationStep.tsx` (wallet connect + SIWE) |
| Add step progress indicator | Show "Step 2 of 6 — Professional Background" with progress bar |
| Add "what is an expert?" intro | Before the form, show a brief explanation of the expert role, guild system, and earning potential |
| Wallet state messaging | "Please confirm the signature in your wallet...", "Verifying your wallet address...", "Wallet verified!" |
| Recovery from wallet disconnect | If wallet disconnects mid-form, show clear reconnect prompt without losing form data |
| Replace manual auth check | Use `useRequireAuth` instead of manual useEffect + isConnected check |
| Move inline types to `@/types/expert.ts` | Consolidate any local interfaces |

**UX improvements:**
- Save form progress to localStorage (nontrivial: needs serialization, stale data handling, clearing on submit, versioning if form fields change — allocate as a dedicated task)
- Show which fields are required vs optional
- Add contextual help tooltips for expert-specific fields (guild preference, expertise areas)

#### 1.2 Guild Membership Flow

**Current state:** GuildDetailView.tsx (797L), GuildApplicationFlow.tsx (738L), ReviewGuildApplicationModal.tsx (915L)

**Refactor:**

| Task | Details |
|------|---------|
| Split GuildDetailView | Note: `GuildHeader.tsx` already exists at `src/components/guild/GuildHeader.tsx` (133L) — reuse and extend it. Extract new: `GuildStatsPanel.tsx`, `GuildMembersList.tsx`, `GuildApplicationCTA.tsx` |
| Split GuildApplicationFlow | Note: `StepIndicator.tsx` already exists at `src/components/guild/application-steps/StepIndicator.tsx` (97L) — promote to `ui/step-progress.tsx` or reuse directly. Extract: `GuildApplicationSteps.tsx`, `StakingExplanation.tsx` |
| Split ReviewGuildApplicationModal | Extract: `ReviewApplicationTabs.tsx`, `ReviewScoresPanel.tsx`, `ReviewSubmitSection.tsx` |
| Add staking explainer | Before staking step, explain what staking means, risks, and how much is required |
| Post-submission status clarity | After guild application submit, show clear status: "Your application is under review by guild members. You'll be notified when voting concludes." |
| Move inline types | Consolidate to `@/types/guild.ts` and `@/types/guildApplication.ts` |

**UX improvements:**
- Show "Why join this guild?" — member count, earning potential, active reviews
- Application progress steps visible throughout the flow
- Clear deadline communication: "Voting ends in X days"

#### 1.3 Candidate & Expert Vetting Flow (Core — Most Time Here)

**Current state:** ApplicationsPage.tsx (746L), JobDetailView.tsx (961L), commit-reveal implemented but may confuse non-crypto users

**Refactor:**

| Task | Details |
|------|---------|
| Split JobDetailView | Extract: `JobHeader.tsx`, `JobApplicationModal.tsx`, `JobRequirements.tsx`, `RelatedJobs.tsx` |
| Split ApplicationsPage | Extract: `ApplicationsFilters.tsx`, `ApplicationCard.tsx`, `ReviewStatusBadge.tsx` |
| Move inline types | Consolidate to `@/types/application.ts` and `@/types/review.ts` |

**UX improvements — this is the most critical:**

| Improvement | Details |
|-------------|---------|
| First-time reviewer guide | On first assignment, show an overlay/tooltip walkthrough: "Here's how vetting works: 1) Review the candidate profile, 2) Score using the rubric, 3) Commit your vote (blind), 4) Reveal your vote after all experts have voted" |
| Commit vs reveal explanation | Inline explainer: "Why two steps? Blind voting prevents experts from copying each other's scores. Your vote is encrypted until the reveal phase." |
| Deadline warnings | Show countdown: "Commit deadline: 2 days 4 hours". Change to red/urgent styling when < 24 hours. Show warning banner when < 6 hours. |
| "Your vote is locked" confirmation | After commit, show clear confirmation: "Vote committed! You'll need to reveal it between [date] and [date]." |
| Missed reveal window handling | If reveal deadline passed without reveal, show: "You missed the reveal window. Your vote will not count toward consensus. This affects your reputation score." |
| Visual state distinction | Clear visual difference between: Needs Review (blue/action), Committed (yellow/waiting), Revealed (green/done), Finalized (gray/complete) |
| Review rubric clarity | Show rubric criteria with descriptions before expert starts scoring. Show what each score level means. |
| Consensus result display | After finalization, show: your score vs consensus, whether you aligned with majority, reputation impact |

**Error handling:**
- If commit transaction fails on-chain: "Transaction failed. Please try again." with retry button
- If reveal transaction fails: urgent messaging since reveal window is time-bounded
- If candidate data fails to load: graceful fallback with retry, not blank screen

---

### Phase 2: Tier 2 Flows — Must Work Well (~1-2 weeks)

#### 2.1 Reputation & Earnings

| Task | Details |
|------|---------|
| Reputation explainer | Add "How is reputation calculated?" section with breakdown. Values come from backend `reputation.service.ts` event types: VOTE_WITH_MAJORITY (+1), SUCCESSFUL_ENDORSEMENT (+2), VOTE_AGAINST_MAJORITY (-2), POOR_ENDORSEMENT (-2), INACTIVITY (-1), HARMFUL_BEHAVIOR (-5 to -10). Verify current values with backend before hardcoding. |
| Earnings attribution | Show which reviews/endorsements earned what amount |
| Withdrawal chain messaging | "Initiating withdrawal...", "Waiting for wallet signature...", "Transaction submitted...", "Withdrawal confirmed!" |
| Leaderboard context | Explain what the numbers mean, what rank tiers exist |

#### 2.2 Endorsements

| Task | Details |
|------|---------|
| Risk warning before staking | Use `ui/confirmation-modal.tsx` (created in Phase 0): "You are about to stake X tokens on [candidate]. If they are not hired, your stake may be partially slashed. Proceed?" |
| Endorsement lifecycle messaging | Show clear states: Active -> Candidate Hired (reward pending) -> Reward Confirmed / Candidate Not Hired -> Slashing -> Appeal Window |
| Transaction feedback | Use `ui/transaction-status.tsx` (created in Phase 0): signing -> submitted -> confirming -> confirmed |
| Accountability outcome clarity | Link outcomes back to specific endorsements: "Your endorsement of [candidate] for [job] resulted in +X tokens reward" |
| Migrate EndorsementMarketplace hooks | Convert 3 raw useEffect calls to useFetch/useMountEffect |

#### 2.3 Notifications

| Task | Details |
|------|---------|
| Deadline-aware notifications | Notifications for: commit deadline approaching, reveal deadline approaching, guild vote ending |
| Notification grouping | Group by type or by flow (all notifications about one application together) |
| Mark all as read | Add "Mark all as read" button to NotificationsPage |
| Polling resilience | Already covered in Phase 0.6, but verify notifications page also uses resilient polling |

---

### Phase 3: Tier 3 + Final Polish (~1 week)

#### 3.1 Governance

| Task | Details |
|------|---------|
| Split CreateProposalForm (715L) | Extract steps into sub-components |
| Extract governance page.tsx | Move logic from fat page to component |
| Basic error handling pass | Ensure no crashes, correct vote tallying, form validation |

#### 3.2 Leaderboard

| Task | Details |
|------|---------|
| Add explanatory context | What metrics are shown, what they mean, how to improve rank |

#### 3.3 Type Consolidation (Scoped to Expert Flows)

Scoped to Tier 1 and Tier 2 expert-flow components only. Full codebase type consolidation is post-beta.

| Task | Details |
|------|---------|
| Audit inline types in expert flows | Target components touched in Phases 1-2 (~50-80 inline types) |
| Consolidate to `@/types` | Move to `expert.ts`, `guild.ts`, `guildApplication.ts`, `application.ts`, `review.ts`, `governance.ts` |
| Remove duplicates | Deduplicate types that exist in multiple expert-flow components |

#### 3.4 Hook Adoption Pass (Scoped to Expert Flows)

Scoped to Tier 1 and Tier 2 flow components. Full codebase hook migration is post-beta.

| Task | Details |
|------|---------|
| Convert useState+useEffect to useFetch | Target expert-flow components still using manual pattern |
| Convert manual auth checks to useRequireAuth | Target remaining manual `useEffect + auth + redirect` patterns in expert routes |
| Convert manual pagination to useClientPagination | Find manual `.slice()` + `currentPage` state patterns in expert-flow lists |

#### 3.5 Final Accessibility Pass

Scoped to expert flows: onboarding, guild membership, vetting, reputation, endorsements.

| Task | Details |
|------|---------|
| Color contrast verification | WCAG AA compliance check on expert-flow pages (use browser devtools audit) |
| Screen reader testing | Test expert onboarding and vetting flows with VoiceOver. Pass = all form fields announced, all status changes announced, no dead ends. |
| Keyboard-only navigation test | Complete expert onboarding -> guild join -> review candidate flow with keyboard only. Pass = all interactive elements reachable via Tab, all actions triggerable via Enter/Space, all modals closable via Escape. |

#### 3.6 Visual Consistency Pass

| Task | Details |
|------|---------|
| Standardize button sizes | Pick one default (h-10) and apply consistently |
| Standardize icon sizes | Pick pattern (w-4 h-4 for inline, w-5 h-5 for standalone) |
| Fix hardcoded colors | Replace `red-800` etc. with design tokens (`destructive`) |
| Consistent spacing | Audit padding patterns, standardize mobile vs desktop |
| Add subtle shadows to cards | `shadow-sm` for depth on card components |

---

## Components to Create

| Component | Purpose | Created In | Notes |
|-----------|---------|------------|-------|
| `ui/confirmation-modal.tsx` | Replace `window.confirm()` with styled modal | Phase 0.3 | Used in Phase 0 (HiringDashboard) and Phase 2 (endorsement staking) |
| `ui/step-progress.tsx` | Multi-step progress indicator for wizards | Phase 0 | Check if `guild/application-steps/StepIndicator.tsx` (97L) can be promoted. Used in Phase 1.1 and 1.2 |
| `ui/transaction-status.tsx` | Wallet signing -> submitted -> confirmed feedback | Phase 0.6 | Used in 4+ flows: commit-reveal, endorsements, withdrawals, guild staking. Justifies abstraction per YAGNI. |
| `ui/breadcrumb.tsx` | Breadcrumb navigation for deep pages | Phase 0.5 | Integrated into PageShell |
| `ui/countdown-badge.tsx` | Deadline countdown with urgency styling | Phase 1.3 | Used in vetting flow deadline warnings |
| `expert/FirstTimeReviewerGuide.tsx` | Overlay walkthrough for first vetting assignment | Phase 1.3 | |
| `expert/CommitRevealExplainer.tsx` | Inline explanation of blind voting process | Phase 1.3 | |
| `expert/DeadlineWarningBanner.tsx` | Urgent banner when commit/reveal deadline is near | Phase 1.3 | |

## Components to Split

**Tier 1/2 (split as part of flow work):**

| Current Component | Lines | Split Into | Phase |
|-------------------|-------|------------|-------|
| `browse/JobDetailView.tsx` | 961 | `JobHeader`, `JobApplicationModal`, `JobRequirements`, `RelatedJobs` | 1.3 |
| `guild/ReviewGuildApplicationModal.tsx` | 915 | `ReviewApplicationTabs`, `ReviewScoresPanel`, `ReviewSubmitSection` | 1.2 |
| `GuildDetailView.tsx` | 797 | Reuse existing `GuildHeader`, extract `GuildStatsPanel`, `GuildMembersList`, `GuildApplicationCTA` | 1.2 |
| `ExpertApplicationForm.tsx` | 796 | `ExpertApplicationProgress`, per-section components (Professional, Skills, etc.), `WalletVerificationStep` | 1.1 |
| `expert/applications/ApplicationsPage.tsx` | 746 | `ApplicationsFilters`, `ApplicationCard`, `ReviewStatusBadge` | 1.3 |
| `guild/GuildApplicationFlow.tsx` | 738 | Reuse/promote `StepIndicator`, extract `GuildApplicationSteps`, `StakingExplanation` | 1.2 |
| `governance/CreateProposalForm.tsx` | 715 | Extract steps into sub-components | 3.1 |

**Additional expert-flow components over 500L (split or justify during flow work):**

| Current Component | Lines | Phase |
|-------------------|-------|-------|
| `guild/GuildMyStatsPage.tsx` | 645 | 1.2 |
| `endorsements/EndorsementTransactionModal.tsx` | 566 | 2.2 |
| `expert/ExpertProfile.tsx` | 542 | 1.1 |
| `guild/GuildMembershipApplicationsTab.tsx` | 544 | 1.2 |
| `guild/GuildRanksProgression.tsx` | 541 | 1.2 |
| `governance/GovernanceProposalDetailPage.tsx` | 567 | 3.1 |

**Out of scope for beta (non-expert flows):**
- `dashboard/CandidateDetailModal.tsx` (620L)
- `candidate/CandidateProfilePage.tsx` (605L)
- `browse/JobsListing.tsx` (595L)
- `auth/SignupPage.tsx` (506L)

## Files Requiring Hook Migration

Priority files (manual useState+useEffect -> useFetch/useApi):

- `src/app/expert/governance/page.tsx` — manual data fetching, should use useFetch
- `src/components/expert/applications/ApplicationsPage.tsx` — multiple useEffect
- `src/components/endorsements/EndorsementMarketplace.tsx` — multiple useEffect
- ~35 additional components identified in audit

## Fat Pages to Extract

| Page | Lines | Extract To | Phase |
|------|-------|------------|-------|
| `src/app/expert/governance/page.tsx` | 110 | Already has component, move remaining logic | 3.1 |
| `src/app/auth/linkedin/callback/page.tsx` | 217 | `src/components/auth/LinkedInCallbackFlow.tsx` | Post-beta (not expert flow) |

---

## Success Criteria

**For beta launch, each Tier 1 and Tier 2 expert flow must pass these checks:**

| # | Criterion | Done When |
|---|-----------|-----------|
| 1 | All critical paths have inline guidance and no dead ends | Every multi-step flow has a progress indicator, every action has a next-step prompt, no blank/confusing screens |
| 2 | Every user action shows feedback (loading, success, or error) | Every submit button passes `isLoading`, every API call has toast on success/error, verified by code review |
| 3 | Every API call in Tier 1/2 flows has retry or clear recovery messaging | No catch blocks with only `console.error`, every error shows actionable message to user |
| 4 | Blockchain interactions show wallet state at every step | `ui/transaction-status.tsx` used in all on-chain operations (commit, reveal, stake, withdraw) |
| 5 | Deadlines are visible and communicated with appropriate urgency | `ui/countdown-badge.tsx` used on all time-bound operations, < 24h turns yellow, < 6h turns red |
| 6 | Expert flows work with keyboard-only navigation | Tab reaches all interactive elements, Enter/Space triggers actions, Escape closes modals — tested on onboarding + vetting flow |
| 7 | No component in Tier 1/2 expert flows exceeds 500 lines | Verified with `wc -l` on all components in the flow |
| 8 | All types in Tier 1/2 flow components are in `@/types`, all data fetching uses `useFetch`/`useApi` | Grep for inline `interface`/`type` in flow components returns zero, grep for `useState.*isLoading` in flow components returns zero |

---

## Out of Scope

- WebSocket/SSE real-time updates (polling is sufficient for beta)
- Guided product tours (nice-to-have post-beta)
- i18n / localization
- Mobile native app
- Performance optimization (code splitting, lazy loading)
- E2E test suite expansion
- Company and candidate flow polish (focus is expert flows for beta)
- Messaging flows (CandidateConversationView, CompanyConversationView, CompanyMessagesInbox) — not expert-facing for beta
- LinkedIn callback page extraction (auth flow, not expert flow)
- Non-expert 500+ line component splits (CandidateDetailModal, CandidateProfilePage, JobsListing, SignupPage)
- Full codebase type consolidation and hook migration (scoped to expert flows only for beta)
