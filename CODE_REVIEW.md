# Code Review: Recent Changes

## Summary

Major refactoring: proposals → guild applications, expert wallet auth, candidate dashboard split, new voting flows. Feature work is solid but introduces patterns that violate CLAUDE.md guidelines.

**Overall: ~49 files modified, ~11 deleted, ~30 new files**

---

## Frontend Issues

### 1. CRITICAL: Duplicate Application Detail Pages

Two near-identical 500+ line pages handle application voting:

| Route | File | Lines | Features |
|-------|------|-------|----------|
| `/expert/guild/[guildId]/application/[applicationId]` | `src/app/expert/guild/[guildId]/application/[applicationId]/page.tsx` | 500 | Simple for/against voting, inline types, manual state |
| `/expert/voting/applications/[applicationId]` | `src/app/expert/voting/applications/[applicationId]/page.tsx` | 582 | Score slider, commit-reveal, staking checks, structured display |

**The first page is dead code** — grep confirms zero references to this route anywhere. It uses inline `ApplicationDetails` and `Vote` interfaces (lines 36-61) instead of the shared `GuildApplication` type. The second page is the one actually used by `VotingPage.tsx`.

**Fix:** Delete the guild route page entirely. Extract the voting route into `src/components/expert/ApplicationDetailView.tsx` (thin-shell pattern).

---

### 2. CRITICAL: Manual State Management Instead of `useFetch`/`useApi`

CLAUDE.md says: *"Use `useFetch`/`useApi` hooks from `lib/hooks/useFetch.ts` for loading/error state management."*

These components use manual `useState(isLoading)` + `try/catch`:

| Component | Lines |
|-----------|-------|
| `src/app/expert/guild/[guildId]/application/[applicationId]/page.tsx` | 92-108 |
| `src/app/expert/voting/applications/[applicationId]/page.tsx` | 93-114 |
| `src/components/candidate/CandidateApplications.tsx` | 38-54 |
| `src/components/candidate/CandidateDashboard.tsx` | 51-84 |
| `src/components/candidate/CandidateGuilds.tsx` | 49-61 |

**Fix:** Replace with `useFetch()` from `src/lib/hooks/useFetch.ts`. Example:
```tsx
// Before:
const [isLoading, setIsLoading] = useState(true);
const fetchData = async () => { try { setIsLoading(true); ... } finally { setIsLoading(false); } };

// After:
const { data, isLoading, error, refetch } = useFetch(
  () => candidateApi.getGuildApplications(),
  { skip: !auth.isAuthenticated }
);
```

---

### 3. HIGH: Helper Function Duplication (18 files)

**Time formatting** — `formatTimeRemaining()` / `getTimeRemaining()` / `formatTimeAgo()` duplicated in:
- `src/app/expert/guild/[guildId]/application/[applicationId]/page.tsx:149`
- `src/app/expert/voting/applications/[applicationId]/page.tsx:156`
- `src/components/guild/GuildApplicationsTab.tsx:25`
- `src/components/expert/VotingPage.tsx`
- `src/components/CommitRevealStatusCard.tsx`
- `src/components/CommitRevealPhaseIndicator.tsx`
- `src/components/governance/GovernanceProposalCard.tsx`
- `src/components/ExpertProfile.tsx`
- `src/components/EnhancedExpertDashboard.tsx`
- `src/components/candidate/CandidateGuilds.tsx:27`
- `src/lib/notification-helpers.ts:58`
- `src/app/expert/governance/[proposalId]/page.tsx`
- `src/app/expert/endorsements/disputes/[disputeId]/page.tsx`
- `src/lib/utils.ts`

**Status badge/color mapping** duplicated in:
- `src/components/candidate/CandidateDashboard.tsx:26` (`STATUS_CONFIG`)
- `src/components/candidate/CandidateApplications.tsx:56-88` (`getStatusColor` + `getStatusIcon`)
- `src/components/candidate/CandidateGuilds.tsx:21` (`STATUS_CONFIG`)
- `src/app/expert/guild/[guildId]/application/[applicationId]/page.tsx:163` (`getStatusBadge`)

**Fix:** Create `src/lib/formatters.ts` with `formatTimeRemaining()`, `getTimeRemainingInfo()`, `formatRelativeDate()`. Create `src/lib/status-helpers.ts` with `APPLICATION_STATUS_CONFIG` and `GUILD_APPLICATION_STATUS_CONFIG`. Update all files to import.

---

### 4. HIGH: `any` Types Throughout

CLAUDE.md says: *"Don't use `any` — use proper type narrowing."*

| File | Line | Variable | Fix |
|------|------|----------|-----|
| `CandidateDashboard.tsx` | 42 | `useState<any[]>([])` | `CandidateGuildApplication[]` |
| `CandidateDashboard.tsx` | 55 | `Promise.all` result `any[]` | Remove with `useFetch` |
| `CandidateDashboard.tsx` | 64 | `guildAppsData: any` | Type the response |
| `CandidateGuilds.tsx` | 40 | `useState<any[]>([])` | `CandidateGuildApplication[]` |
| `CandidateGuilds.tsx` | 53, 55 | `data: any`, `error: any` | Narrow types |
| `CandidateGuilds.tsx` | 158 | `app: any` in map | Use typed array |
| `CandidateApplications.tsx` | 42 | `data: any` | Type API response |
| Voting applications page | 42-43, 48 | `expertData`, `stakingStatus`, `crPhase` | `ExpertProfile`, `StakingStatus`, `CommitRevealPhase` |
| Guild application page | 69 | `expertProfile` as `any` | `ExpertProfile` |
| `VotingPage.tsx` | 86-87 | `expertData`, `stakingStatus` | Same as above |

**New types needed** in `src/types/`:
```ts
// src/types/guildApplication.ts
export interface CandidateGuildApplication {
  id: string;
  guildId?: string;
  guildName?: string;
  guild?: { id: string; name: string };
  jobTitle?: string;
  status: string;
  submittedAt?: string;
  createdAt?: string;
  reviewCount?: number;
  approvalCount?: number;
}

// src/types/blockchain.ts (new file)
export interface StakingStatus {
  meetsMinimum: boolean;
  stakedAmount?: string;
  minimumRequired?: string;
}

export interface CommitRevealPhase {
  phase: "direct" | "commit" | "reveal" | "tally";
  commitDeadline?: string;
  revealDeadline?: string;
  commitCount?: number;
  revealCount?: number;
  totalExpected?: number;
  userCommitted?: boolean;
  userRevealed?: boolean;
}
```

---

### 5. HIGH: Inline Type Definitions

`src/app/expert/guild/[guildId]/application/[applicationId]/page.tsx` defines `ApplicationDetails` and `Vote` interfaces inline (lines 36-61) when the shared `GuildApplication` type from `@/types/guildApplication.ts` covers the same data.

`src/components/expert/VotingPage.tsx` defines a `Proposal` interface inline that heavily overlaps with `GuildApplication`. Missing fields (`total_stake_for`, `votes_for_count`, `voting_phase`) should be added to the shared type.

---

### 6. MEDIUM: Fat Page Files (Not Thin Shells)

Both expert application detail pages have full component logic directly in `page.tsx` instead of being thin shells:
- `src/app/expert/guild/[guildId]/application/[applicationId]/page.tsx` (500 lines)
- `src/app/expert/voting/applications/[applicationId]/page.tsx` (582 lines)

CLAUDE.md: *"page.tsx (thin shell) → container component (data + logic) → presentational sub-components"*

---

### 7. MEDIUM: Inconsistent Error Handling

| Component | Pattern | Issue |
|-----------|---------|-------|
| `CandidateDashboard.tsx:80` | `console.error` only | No user feedback |
| `CandidateApplications.tsx:50` | `console.error` only | No user feedback |
| `CandidateGuilds.tsx:57` | Sets empty array silently | No user feedback |
| Voting page:110 | `toast.error()` | Correct |
| Guild application page:103 | Sets error state + `Alert` | Correct |

**Fix:** Standardize on `toast.error()` for transient errors, `Alert` component for persistent errors. Always show user feedback.

---

### 8. MEDIUM: Stale "Proposal" References

`src/lib/notification-helpers.ts` still uses `proposal_new` and `proposal_deadline` in switch cases (lines 28-30) despite the codebase renaming to "applications". Add `application_new`/`application_deadline` cases for forward compatibility.

---

### 9. LOW: Progress Bar Duplication

`src/components/guild/GuildApplicationsTab.tsx` has identical progress bar JSX at lines 134-147 and 234-247.

**Fix:** Extract `ReviewProgressBar` component:
```tsx
// src/components/guild/ReviewProgressBar.tsx
export function ReviewProgressBar({ completed, total }: { completed: number; total: number }) { ... }
```

---

## Backend Issues

### 1. `any[]` Types in `expert-guild.service.ts`

- Line ~283: `let candidates: any[] = []`
- Line ~303: `let recentActivity: any[] = []`

**Fix:** Define interfaces for the query results:
```ts
interface GuildCandidate {
  id: string;
  fullName: string;
  email: string;
  headline: string | null;
  experienceLevel: string | null;
  reputation: number;
  joinedAt: string;
}

interface GuildActivity {
  id: string;
  type: string;
  actor: string;
  details: string;
  target?: string;
  timestamp: string;
}
```

### 2. Silent Empty Catch Blocks in `expert-guild.service.ts`

Multiple `try { ... } catch { // table may not exist }` patterns swallow real errors silently. Examples at candidate members query, staking query, and activity query.

**Fix:** At minimum log at debug level, or check for the specific Postgres error code (`42P01` = undefined table):
```ts
} catch (error: any) {
  if (error?.code !== '42P01') {
    console.error('Unexpected error loading candidates:', error);
  }
}
```

### 3. Duplicate Notification Insert in `candidate-proposals.service.ts`

The notification insert for approved (lines ~485-500) and rejected (lines ~519-534) applications are nearly identical — same query structure, same columns.

**Fix:** Extract helper:
```ts
async function notifyReviewers(
  client: PoolClient,
  applicationId: string,
  excludeReviewerId: string,
  notification: { type: string; title: string; message: string; link: string; guildId: string; guildName: string }
) { ... }
```

---

## Positive Patterns (What's Done Well)

- All API calls use `apiRequest()` or domain API namespaces — no raw `fetch`
- New page routes follow thin-shell pattern (candidate pages are 1-6 lines)
- `useAuthContext()` used consistently
- Tailwind utilities only, no custom CSS
- Proper `"use client"` directives
- Types well-organized in `src/types/guildApplication.ts`
- Good extraction of `AuthPageLayout` and `AuthTabSelector` into reusable components
- `useSidebarConfig` hook handles hydration correctly
- `notification-helpers.ts` is well-structured
- Security: XSS prevention via `sanitizeErrorMessage()`, auth token refresh sync

---

## Recommended Implementation Order

1. **Shared utilities** (`formatters.ts`, `status-helpers.ts`) — zero risk, only adds files
2. **Delete dead route** + extract component — verify Route A is truly dead, test voting flow
3. **Replace manual state** with `useFetch` — each component self-contained
4. **Remove `any` types** — add shared types, update components
5. **Small fixes** — progress bar extraction, notification helpers, inline type cleanup
6. **Backend fixes** — types, catch blocks, notification helper

## Verification

After changes:
```bash
# Frontend
npm run build    # Zero TypeScript errors
npm run lint     # Clean

# Backend
cd ../backend && npm run test

# Manual testing
# - Expert voting flow (score slider, commit-reveal)
# - Candidate dashboard (profile, applications, guilds)
# - Notification bell (icons, colors, navigation)
```
