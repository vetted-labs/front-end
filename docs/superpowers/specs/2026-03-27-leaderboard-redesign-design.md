# Leaderboard Redesign — Design Spec

## Overview

Replace the current single-dimension "Earnings Leaderboard" with a multi-dimensional, filterable expert ranking system. Experts can be ranked by reputation, earnings, reviews, consensus rate, endorsements, and trending activity. The UI features a top-3 podium, personal stats bar, category tabs, and filter pills.

## Decisions

- **Approach:** Modular decomposition — thin page shell + focused child components (~100-150 lines each)
- **Tab behavior:** Most tabs re-rank the same dense table; Trending and Endorsements get custom layouts
- **Expert click:** Navigates to `/expert/profile/:id`
- **No explainer box** — UI is self-explanatory
- **URL state:** Tab + filters synced to URL search params for shareability

## Component Architecture

```
Route: /expert/leaderboard (existing)

page.tsx (thin shell — swap import)
  └─ LeaderboardPage.tsx (state: activeTab, filters, data fetching)
       ├─ LeaderboardPodium.tsx (top 3 for active tab)
       ├─ LeaderboardYourStats.tsx (current user's key metrics)
       ├─ LeaderboardTable.tsx (shared by Overall/Earnings/Reputation/Reviews/Accuracy)
       ├─ LeaderboardTrending.tsx (custom: biggest movers, streaks)
       └─ LeaderboardEndorsements.tsx (custom: endorsement rankings)
```

All new components go in `src/components/leaderboard/`.

## Tab Definitions

| Tab | Sort Primary | Sort Secondary | Podium Metric | Custom Layout? |
|---|---|---|---|---|
| Overall | reputation_score DESC | total_earnings DESC | Reputation | No |
| Earnings | total_earnings DESC | reputation DESC | VETD Earned | No |
| Reputation | reputation_score DESC | reviews DESC | Rep Score | No |
| Reviews | total_reviews DESC | consensus_rate DESC | Review Count | No |
| Consensus | consensus_rate DESC | reviews DESC (min 3 reviews) | Consensus % | No |
| Endorsements | endorsement_count DESC | total_bid DESC | Endorsements | Yes |
| Trending | reputation_delta DESC | earnings_delta DESC | Weekly Delta | Yes |

Consensus tab filters out experts with fewer than 3 reviews to avoid meaningless percentages from small samples.

## Filter System

Three filter pills as dropdowns:

- **Guild**: "All Guilds" (default) or a specific guild. Changes data scope — global vs guild-specific stats.
- **Time period**: "All Time" (default), "This Month", "This Week". Affects delta columns and Trending tab window. Totals are always all-time. `earningsDelta` and `reputationDelta` represent amounts accrued within the selected period (not cumulative difference).
- **Role**: "All Roles" (default), Recruit, Apprentice, Craftsman, Officer, Master. Filters by the expert's highest guild role. An expert who is Master in one guild and Recruit in another is treated as "Master."

Expert count displayed next to filters. All filters + active tab synced to URL search params (`?tab=earnings&guild=xxx&period=week&role=craftsman`).

**What triggers API calls vs client-side:** Tab switching is purely client-side re-sorting. Changing guild, time period, or role filter triggers a new API fetch.

## Component Details

### LeaderboardPage.tsx (~80 lines)

Orchestrator component. Manages state: `activeTab`, `guildId`, `period`, `role`. Reads initial state from URL search params. Fetches data via `useFetch` with a `useCallback` fetch function that captures filter state. Uses `useEffect + refetch()` pattern (with eslint-disable comment) when filters change, matching the existing workaround used in `ReputationLeaderboard.tsx` since `useFetch` does not support dependency arrays. Tab switching is client-side re-sorting (no API call). Renders: tab bar, filter pills, then delegates to child components based on active tab.

**Loading state:** Shows skeleton loaders for podium (3 placeholder cards) and table (shimmer rows) during fetch. Error state uses `Alert` component.

### LeaderboardPodium.tsx (~100 lines)

Top 3 hero section. Receives sorted entries + active tab name. Displays:
- Avatar initials with gold/silver/bronze gradient styling
- Crown icon for #1
- Name, role, guild count
- Primary metric for active tab (reputation for Overall, VETD for Earnings, etc.)
- Period delta with green/red coloring

### LeaderboardYourStats.tsx (~60 lines)

Horizontal bar below podium, always visible. Receives `currentUser` object from API. Shows: rank position, reviews, consensus rate %, VETD earned, endorsements, VETD staked. Highlighted with primary color border/background.

### LeaderboardTable.tsx (~120 lines)

Shared table used by Overall, Earnings, Reputation, Reviews, Consensus tabs. Receives sorted entries + active tab.

Columns:
- **#** — rank number
- **Expert** — name + role badge + guild count
- **Reputation** — score with period delta (green/red)
- **Earnings** — VETD amount
- **Reviews** — total with approve/reject breakdown
- **Consensus** — progress bar with percentage
- **Staked** — VETD staked
- **Trend** — rank change arrow or fire emoji for hot streaks

Active tab's sort column gets subtle highlight styling. Current user's row highlighted with primary color. `currentUser` is always included in `entries` when they qualify for the leaderboard; the row is identified by matching `expertId` and styled differently.

**Mobile:** On viewports < 768px, hide Staked and Trend columns. Table scrolls horizontally if needed.

### LeaderboardTrending.tsx (~120 lines)

Custom layout for Trending tab. Two sections:

1. **Biggest Climbers** — sorted by reputation delta descending. Shows delta bars (visual width proportional to change), name, absolute delta number. Card-based layout.
2. **Hot Streaks** — filtered by streak > 1 week. Shows streak count with fire emojis, name, current reputation. Card-based layout.

### LeaderboardEndorsements.tsx (~100 lines)

Custom table layout for Endorsements tab.

Columns:
- **#** — rank by endorsement count
- **Expert** — name + role
- **Endorsements Made** — count
- **Total Bid** — VETD amount
- **Success Rate** — % of endorsed candidates who got hired. Shows "N/A" when no resolved outcomes exist for the expert's endorsed candidates.
- **Active Bids** — count of currently active endorsements

Experts with 0 endorsements excluded.

## Backend API

### New endpoint: `GET /api/experts/leaderboard`

Query params:
- `guildId` (optional) — scope to guild
- `period` (optional) — `week`, `month`, `all` (default: `all`)
- `role` (optional) — filter by highest guild role
- `limit` (optional) — default 50

Response shape:

```typescript
interface LeaderboardResponse {
  entries: LeaderboardEntryV2[];
  currentUser: LeaderboardEntryV2 | null; // always included if authenticated
}

interface LeaderboardEntryV2 {
  expertId: string;
  fullName: string;
  walletAddress: string;
  role: string;                     // highest guild role
  guildCount: number;
  reputation: number;               // global or guild-specific based on guildId filter
  reputationDelta: number;          // accrued in selected period
  totalEarnings: number;            // VETD
  earningsDelta: number;            // accrued in selected period
  totalReviews: number;
  approvals: number;
  rejections: number;
  consensusRate: number;            // 0-100, vote diversity metric (see formula below)
  endorsementCount: number;
  totalBidAmount: string;           // string to preserve precision for large VETD amounts
  endorsementSuccessRate: number | null; // null when no resolved outcomes exist
  activeEndorsementCount: number;   // currently active endorsements
  stakedAmount: string;             // string to preserve precision (matches existing GuildStakeInfo pattern)
  streak: number;                   // consecutive positive weeks (from cached column)
}
```

### SQL approach

Single query with LEFT JOINs:
- `experts` — core fields, `current_streak`
- `guild_memberships` — guild count, highest role (via `CASE` ranking), guild-specific reputation
- `expert_application_reviews` — review counts, approvals, rejections
- `endorsements` + `endorsement_bids` — endorsement count, total bid, active count
- `expert_guild_stakes` — staked amount (kept as string, summed via `::numeric` cast)
- Subquery on `expert_reputation_log` for period-based reputation delta (`SUM(amount) WHERE created_at > NOW() - INTERVAL`)
- Subquery on `expert_earnings` for period-based earnings delta (`SUM(amount) WHERE created_at > NOW() - INTERVAL`)
- Subquery on `endorsements` + `applications` + `hire_outcomes` for endorsement success rate

**Consensus rate formula:** `CASE WHEN total_reviews >= 3 THEN LEAST(approvals, rejections)::float / total_reviews * 100 ELSE 0 END`. This measures vote diversity (how balanced an expert's approve/reject ratio is), not correctness. A higher rate means more varied, balanced reviewing. Renamed from "Accuracy" to "Consensus Rate" to avoid implying it measures correctness against outcomes.

**Streak computation:** Add `current_streak INTEGER DEFAULT 0` column to the `experts` table via migration. Updated by the existing finalization cron job whenever reputation changes: if the weekly reputation sum is positive, increment; otherwise reset to 0. The leaderboard query reads this column directly — no expensive window functions at query time.

**`endorsementSuccessRate`:** Computed via: `endorsed candidates with hire_outcomes.outcome = 'hired' / total endorsed candidates with any hire_outcome`. Returns `NULL` when the expert has no endorsed candidates with resolved outcomes, avoiding misleading 0% values.

`currentUser` fetched with a separate single-row query using the same joins, filtered by wallet address from auth context.

**No pagination.** 50 is the hard cap — the leaderboard shows the top 50 only. The current user's position is always returned via `currentUser` even if they're outside the top 50.

### Backward compatibility

Existing `GET /api/experts/reputation/leaderboard` kept as-is. New components use the new endpoint.

## File Changes

### New files (frontend)
- `src/components/leaderboard/LeaderboardPage.tsx`
- `src/components/leaderboard/LeaderboardPodium.tsx`
- `src/components/leaderboard/LeaderboardYourStats.tsx`
- `src/components/leaderboard/LeaderboardTable.tsx`
- `src/components/leaderboard/LeaderboardTrending.tsx`
- `src/components/leaderboard/LeaderboardEndorsements.tsx`

### Modified files (frontend)
- `src/app/expert/leaderboard/page.tsx` — swap import to new `LeaderboardPage`
- `src/lib/api.ts` — add `expertApi.getLeaderboardV2()` method
- `src/types/api-responses.ts` — add `LeaderboardEntryV2` and `LeaderboardResponse` types

### New files (backend)
- `src/features/experts/expert-leaderboard.service.ts` — new service with aggregated query
- Migration: add `current_streak` column to `experts` table

### Modified files (backend)
- `src/features/experts/experts.controller.ts` — add new controller method
- `src/features/experts/experts.routes.ts` — add new route
- `src/jobs/finalize-proposals.cron.ts` — update streak counter after reputation changes

### Kept (not deleted)
- `src/components/ReputationLeaderboard.tsx` — retained until new version is validated
- Existing backend endpoint stays for backward compat

## UI Reference

Visual mockup created during brainstorming at `.superpowers/brainstorm/` — shows podium, tabs, filters, dense table, and trending indicators with dark theme styling matching the existing Vetted design system.
