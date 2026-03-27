# Leaderboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-dimension earnings leaderboard with a multi-dimensional, filterable expert ranking system featuring podium, tabs, filters, and custom views for trending/endorsements.

**Architecture:** Modular frontend components in `src/components/leaderboard/` orchestrated by `LeaderboardPage`. One new backend endpoint returns all dimensions in a single query. Tab switching is client-side re-sorting; filter changes trigger API refetch.

**Tech Stack:** Next.js 15, React 19, TypeScript, TailwindCSS 4, PostgreSQL, Wagmi (wallet address)

**Spec:** `docs/superpowers/specs/2026-03-27-leaderboard-redesign-design.md`

---

## Task 1: Backend Migration — Add `current_streak` column

**Files:**
- Create: `/Users/svendaneel/Desktop/vetted/backend/db/migrations/073_leaderboard_streak.sql`

- [ ] **Step 1: Write migration**

```sql
-- 073_leaderboard_streak.sql
ALTER TABLE experts ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
```

- [ ] **Step 2: Run migration**

Run: `cd /Users/svendaneel/Desktop/vetted/backend && psql -h localhost -p 5434 -U svendaneel -d vetted -f db/migrations/073_leaderboard_streak.sql`
Expected: `ALTER TABLE`

- [ ] **Step 3: Verify column exists**

Run: `psql -h localhost -p 5434 -U svendaneel -d vetted -c "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='experts' AND column_name='current_streak'"`
Expected: One row showing `current_streak | integer | 0`

- [ ] **Step 4: Commit**

```bash
cd /Users/svendaneel/Desktop/vetted/backend
git add db/migrations/073_leaderboard_streak.sql
git commit -m "feat: add current_streak column to experts table for leaderboard"
```

---

## Task 1b: Backend — Streak Update in Cron Job

**Files:**
- Modify: `/Users/svendaneel/Desktop/vetted/backend/src/jobs/finalize-proposals.cron.ts`

The spec requires `current_streak` to be updated whenever reputation changes. Add a step to the existing cron job that runs after expert application finalization.

- [ ] **Step 1: Add streak update logic**

Add a new section to the `execute()` method in `FinalizeProposalsCron`, after the existing expert application finalization block (around line 100). This computes each expert's current streak by checking if their reputation log for the current week is positive:

```typescript
// 2b. Update expert streaks
try {
  // Increment streak for experts with positive reputation this week, reset others
  await pool.query(`
    UPDATE experts e
    SET current_streak = CASE
      WHEN (
        SELECT COALESCE(SUM(erl.amount), 0)
        FROM expert_reputation_log erl
        WHERE erl.expert_id = e.id
          AND erl.created_at > date_trunc('week', CURRENT_TIMESTAMP)
      ) > 0 THEN current_streak + 1
      ELSE 0
    END
    WHERE e.status = 'approved'
      AND e.current_streak IS NOT NULL
  `);
} catch (error: unknown) {
  log.error('Streak update failed', { error: (error instanceof Error ? error.message : String(error)) });
}
```

Note: This runs every cron tick but the `date_trunc('week', ...)` check means it effectively only changes at week boundaries. For a more precise approach, add a `last_streak_update` timestamp column and skip if already updated this week — but this simpler version works for now.

- [ ] **Step 2: Verify backend compiles**

Run: `cd /Users/svendaneel/Desktop/vetted/backend && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
cd /Users/svendaneel/Desktop/vetted/backend
git add src/jobs/finalize-proposals.cron.ts
git commit -m "feat: update expert current_streak in cron job"
```

---

## Task 2: Backend — Leaderboard Service

**Files:**
- Create: `/Users/svendaneel/Desktop/vetted/backend/src/features/experts/expert-leaderboard.service.ts`

Reference the existing query structure in `/Users/svendaneel/Desktop/vetted/backend/src/features/experts/expert-profile.service.ts:272-348` for patterns. Use `pool` from `../../shared/utils/db`. Follow the existing service pattern (static class methods).

**Key design notes:**
- All user-supplied values (guildId, role, limit, interval) MUST use parameterized placeholders (`$N`). Never interpolate into SQL.
- The `highest_role` is computed via a subquery with `ORDER BY CASE ... LIMIT 1` instead of string `MAX()` (which sorts lexicographically, not by rank).
- Period `'all'` omits the time filter from delta CTEs entirely instead of using a large interval hack.

- [ ] **Step 1: Create the leaderboard service**

Create `/Users/svendaneel/Desktop/vetted/backend/src/features/experts/expert-leaderboard.service.ts` with:

The service is complex — implement it by following these rules:

1. **All query params use `$N` placeholders** — never interpolate user input. Build a `params` array and track the next index.
2. **Highest role** computed via a lateral subquery: `(SELECT gm_r.role FROM guild_memberships gm_r WHERE gm_r.expert_id = e.id ORDER BY CASE gm_r.role WHEN 'master' THEN 5 WHEN 'officer' THEN 4 WHEN 'craftsman' THEN 3 WHEN 'apprentice' THEN 2 ELSE 1 END DESC LIMIT 1) AS highest_role`
3. **Role filter** uses a parameterized HAVING: convert the role string to its rank number in TypeScript, then `HAVING (computed_role_rank) = $N`.
4. **Period deltas**: when period is `'all'`, omit the `WHERE created_at > ...` clause from the delta CTEs entirely (use conditional SQL building). For `'week'`/`'month'`, use `$N::interval` with the interval string.
5. **Structure as CTEs**: `expert_stats`, `review_stats`, `endorsement_stats`, `endorsement_success`, `stake_stats`, `rep_delta`, `earnings_delta` — then LEFT JOIN all together.
6. **`mapRow`** computes `consensusRate` as `Math.round(Math.min(approvals, rejections) / totalReviews * 100)` when `totalReviews >= 3`, else `0`.
7. **`getCurrentUser`** is a separate single-row query using the same joins, filtered by `LOWER(wallet_address) = LOWER($N)`.

Use the `LeaderboardEntryV2` interface defined in this task and export the class.
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/svendaneel/Desktop/vetted/backend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to `expert-leaderboard.service.ts`

- [ ] **Step 3: Commit**

```bash
cd /Users/svendaneel/Desktop/vetted/backend
git add src/features/experts/expert-leaderboard.service.ts
git commit -m "feat: add expert leaderboard service with multi-dimension query"
```

---

## Task 3: Backend — Route & Controller

**Files:**
- Modify: `/Users/svendaneel/Desktop/vetted/backend/src/features/experts/experts.controller.ts`
- Modify: `/Users/svendaneel/Desktop/vetted/backend/src/features/experts/experts.routes.ts`

- [ ] **Step 1: Add controller method**

Add to `ExpertsController` class in `experts.controller.ts`, after the existing `getReputationLeaderboard` method (around line 301):

```typescript
  /** GET /api/experts/leaderboard */
  static async getLeaderboardV2(req: Request, res: Response) {
    const { guildId, period, role, limit } = req.query;
    const walletAddress = req.headers['x-wallet-address'] as string | undefined;

    const { ExpertLeaderboardService } = await import('./expert-leaderboard.service');
    const result = await ExpertLeaderboardService.getLeaderboard({
      guildId: guildId as string | undefined,
      period: (period as 'week' | 'month' | 'all') || 'all',
      role: role as string | undefined,
      limit: limit ? parseInt(limit as string) : 50,
      currentWalletAddress: walletAddress || undefined,
    });

    res.json({ success: true, data: result });
  }
```

- [ ] **Step 2: Add route**

Add to `experts.routes.ts`, after line 116 (below the existing leaderboard route):

```typescript
router.get("/leaderboard", asyncHandler(ExpertsController.getLeaderboardV2));
```

- [ ] **Step 3: Verify backend starts**

Run: `cd /Users/svendaneel/Desktop/vetted/backend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Test the endpoint**

Run: `curl -s http://localhost:4000/api/experts/leaderboard | jq '.data.entries | length'`
Expected: A number (the count of approved experts, up to 50)

Run: `curl -s 'http://localhost:4000/api/experts/leaderboard?period=week' -H 'x-wallet-address: 0x5b3141560e335f813047CFCB5D209fc8312B80c5' | jq '.data.currentUser.fullName'`
Expected: The expert's name, or `null`

- [ ] **Step 5: Commit**

```bash
cd /Users/svendaneel/Desktop/vetted/backend
git add src/features/experts/experts.controller.ts src/features/experts/experts.routes.ts
git commit -m "feat: add /api/experts/leaderboard endpoint"
```

---

## Task 4: Frontend — Types & API Client

**Files:**
- Modify: `/Users/svendaneel/Desktop/vetted/front-end/src/types/api-responses.ts` (after line 442)
- Modify: `/Users/svendaneel/Desktop/vetted/front-end/src/lib/api.ts` (after existing `getLeaderboard` around line 680)

- [ ] **Step 1: Add types**

Add to `src/types/api-responses.ts` after the existing `LeaderboardEntry` interface (line 442):

```typescript
export interface LeaderboardEntryV2 {
  expertId: string;
  fullName: string;
  walletAddress: string;
  role: string;
  guildCount: number;
  reputation: number;
  reputationDelta: number;
  totalEarnings: number;
  earningsDelta: number;
  totalReviews: number;
  approvals: number;
  rejections: number;
  consensusRate: number;
  endorsementCount: number;
  totalBidAmount: string;
  endorsementSuccessRate: number | null;
  activeEndorsementCount: number;
  stakedAmount: string;
  streak: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntryV2[];
  currentUser: LeaderboardEntryV2 | null;
}
```

- [ ] **Step 2: Add API method**

Add to `expertApi` namespace in `src/lib/api.ts`, after the existing `getLeaderboard` method:

```typescript
  getLeaderboardV2: (params?: { guildId?: string; period?: string; role?: string; limit?: number }, walletAddress?: string) => {
    const queryParams = new URLSearchParams();
    if (params?.guildId) queryParams.append("guildId", params.guildId);
    if (params?.period) queryParams.append("period", params.period);
    if (params?.role) queryParams.append("role", params.role);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const query = queryParams.toString();
    return apiRequest<import("@/types").LeaderboardResponse>(
      `/api/experts/leaderboard${query ? `?${query}` : ""}`,
      walletAddress ? { headers: { "x-wallet-address": walletAddress } } : undefined
    );
  },
```

- [ ] **Step 3: Export types from barrel file**

Check if `src/types/index.ts` exists and re-exports from `api-responses.ts`. If so, add `LeaderboardEntryV2` and `LeaderboardResponse` to the re-export. If the barrel exports everything with `export * from './api-responses'`, no change needed.

- [ ] **Step 4: Verify types compile**

Run: `cd /Users/svendaneel/Desktop/vetted/front-end && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd /Users/svendaneel/Desktop/vetted/front-end
git add src/types/api-responses.ts src/types/index.ts src/lib/api.ts
git commit -m "feat: add LeaderboardEntryV2 types and API method"
```

---

## Task 5: Frontend — LeaderboardPodium Component

**Files:**
- Create: `/Users/svendaneel/Desktop/vetted/front-end/src/components/leaderboard/LeaderboardPodium.tsx`

- [ ] **Step 1: Create component**

Create `src/components/leaderboard/LeaderboardPodium.tsx`. This component receives the top 3 sorted entries and the active tab name. It renders avatar initials with gold/silver/bronze styling, crown for #1, primary metric based on tab, and period delta.

Use Tailwind classes matching the existing dark theme. Import `Crown` from `lucide-react`. Use the `truncateAddress` utility from `@/lib/utils`.

Key props: `entries: LeaderboardEntryV2[]` (already sorted, take first 3), `activeTab: string` (to determine which metric to highlight), `currentWalletAddress?: string` (to highlight "YOU" badge).

The podium shows #2 on left, #1 (taller) in center, #3 on right — matching the mockup layout.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/leaderboard/LeaderboardPodium.tsx
git commit -m "feat: add LeaderboardPodium component"
```

---

## Task 6: Frontend — LeaderboardYourStats Component

**Files:**
- Create: `/Users/svendaneel/Desktop/vetted/front-end/src/components/leaderboard/LeaderboardYourStats.tsx`

- [ ] **Step 1: Create component**

Create `src/components/leaderboard/LeaderboardYourStats.tsx`. Horizontal stats bar showing the current user's key metrics. Props: `currentUser: LeaderboardEntryV2 | null`, `rank: number` (position in current sort). If `currentUser` is null, render nothing.

Shows: rank position, reviews, consensus rate %, VETD earned, endorsements made, VETD staked. Styled with primary color border/background per the mockup.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/leaderboard/LeaderboardYourStats.tsx
git commit -m "feat: add LeaderboardYourStats component"
```

---

## Task 7: Frontend — LeaderboardTable Component

**Files:**
- Create: `/Users/svendaneel/Desktop/vetted/front-end/src/components/leaderboard/LeaderboardTable.tsx`

- [ ] **Step 1: Create component**

Create `src/components/leaderboard/LeaderboardTable.tsx`. Dense table shared by Overall, Earnings, Reputation, Reviews, Consensus tabs.

Props: `entries: LeaderboardEntryV2[]` (already sorted), `activeTab: string`, `currentWalletAddress?: string`.

Columns: #, Expert (name + role + guilds), Reputation (with delta), Earnings, Reviews (approve/reject), Consensus (progress bar), Staked, Trend (fire emoji for streak > 2, up/down arrows for rank change).

Active tab's sort column gets subtle `bg-primary/5` highlight. Current user's row highlighted with `border-primary/30 bg-primary/5`.

Mobile: Hide Staked and Trend columns below `md` breakpoint using `hidden md:table-cell`.

Use `truncateAddress` from `@/lib/utils` for wallet display. Expert name/row click navigates to `/expert/profile/${expertId}` via `router.push()`.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/leaderboard/LeaderboardTable.tsx
git commit -m "feat: add LeaderboardTable component"
```

---

## Task 8: Frontend — LeaderboardTrending Component

**Files:**
- Create: `/Users/svendaneel/Desktop/vetted/front-end/src/components/leaderboard/LeaderboardTrending.tsx`

- [ ] **Step 1: Create component**

Create `src/components/leaderboard/LeaderboardTrending.tsx`. Custom layout for the Trending tab.

Props: `entries: LeaderboardEntryV2[]` (unsorted — component handles its own sorting), `currentWalletAddress?: string`.

Two sections:
1. **Biggest Climbers** — filter entries with `reputationDelta > 0`, sort by `reputationDelta` DESC, show top 10. Each card shows name, role, delta bar (width proportional to max delta), absolute delta number.
2. **Hot Streaks** — filter entries with `streak > 1`, sort by `streak` DESC. Each card shows name, streak count with fire emojis, current reputation.

If no climbers or streaks, show an empty state message for that section.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/leaderboard/LeaderboardTrending.tsx
git commit -m "feat: add LeaderboardTrending component"
```

---

## Task 9: Frontend — LeaderboardEndorsements Component

**Files:**
- Create: `/Users/svendaneel/Desktop/vetted/front-end/src/components/leaderboard/LeaderboardEndorsements.tsx`

- [ ] **Step 1: Create component**

Create `src/components/leaderboard/LeaderboardEndorsements.tsx`. Custom table for endorsement rankings.

Props: `entries: LeaderboardEntryV2[]` (unsorted — component filters and sorts), `currentWalletAddress?: string`.

Filter out entries with `endorsementCount === 0`, sort by `endorsementCount` DESC then `totalBidAmount` DESC.

Columns: #, Expert (name + role), Endorsements Made, Total Bid (VETD), Success Rate (show "N/A" when `endorsementSuccessRate` is null, otherwise `X%`), Active Bids.

Current user's row highlighted.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/leaderboard/LeaderboardEndorsements.tsx
git commit -m "feat: add LeaderboardEndorsements component"
```

---

## Task 10: Frontend — LeaderboardPage Orchestrator

**Files:**
- Create: `/Users/svendaneel/Desktop/vetted/front-end/src/components/leaderboard/LeaderboardPage.tsx`
- Modify: `/Users/svendaneel/Desktop/vetted/front-end/src/app/expert/leaderboard/page.tsx`

- [ ] **Step 1: Create LeaderboardPage component**

Create `src/components/leaderboard/LeaderboardPage.tsx`. This is the orchestrator that manages:

1. **State:** `activeTab`, `guildId`, `period`, `role` — initialized from URL search params via `useSearchParams()`.
2. **Data fetching:** `useFetch` with `useCallback` wrapping `expertApi.getLeaderboardV2()`. Uses `useEffect + refetch()` pattern (with eslint-disable comment) when `guildId`, `period`, or `role` change.
3. **Sorting:** `useMemo` that re-sorts `entries` based on `activeTab` per the tab definitions in the spec. Each tab has a primary and secondary sort key.
4. **URL sync:** Update search params via `router.replace()` when tab/filters change.

Renders:
- Tab bar (7 tabs with icons)
- Filter pills row (guild dropdown, period dropdown, role dropdown, expert count)
- `LeaderboardPodium` with top 3 of sorted entries
- `LeaderboardYourStats` with `currentUser` data
- `LeaderboardTable` for most tabs, `LeaderboardTrending` for trending tab, `LeaderboardEndorsements` for endorsements tab

Loading: Return skeleton placeholder (3 shimmer cards for podium, shimmer rows for table).
Error: `Alert` component with error message.

Import `useAccount` from `wagmi` to get current wallet address. Import `useFetch` from `@/lib/hooks/useFetch`. Import `expertApi` from `@/lib/api`.

Guild list for filter: fetch via `guildsApi.getGuilds()` or receive as prop. Simplest approach: use a separate `useFetch` for guild list.

- [ ] **Step 2: Update the page route**

Replace the content of `src/app/expert/leaderboard/page.tsx` with:

```typescript
"use client";
import LeaderboardPage from "@/components/leaderboard/LeaderboardPage";

export default function LeaderboardRoute() {
  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <LeaderboardPage />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Test in browser**

Run: `npm run dev` (if not already running)
Open: `http://localhost:3000/expert/leaderboard`
Expected: New leaderboard renders with podium, stats bar, and table. Tab switching re-sorts. Filter changes trigger refetch.

- [ ] **Step 5: Commit**

```bash
git add src/components/leaderboard/LeaderboardPage.tsx src/app/expert/leaderboard/page.tsx
git commit -m "feat: add LeaderboardPage orchestrator and wire up route"
```

---

## Task 11: Visual Polish & Integration Test

**Files:**
- Potentially adjust any of the leaderboard components

- [ ] **Step 1: Verify all tabs work**

Open `http://localhost:3000/expert/leaderboard` and click through each tab:
- Overall, Earnings, Reputation, Reviews, Consensus → table re-sorts
- Endorsements → custom endorsement table
- Trending → custom layout with climbers and streaks

- [ ] **Step 2: Verify filters work**

- Change guild filter → data refetches
- Change period filter → deltas update
- Change role filter → entries filtered

- [ ] **Step 3: Verify URL state**

- Click a tab and filter → URL params update
- Copy URL, open in new tab → same view loads

- [ ] **Step 4: Verify mobile responsiveness**

Resize browser to < 768px width:
- Staked and Trend columns hidden
- Table scrolls horizontally if needed
- Podium stacks or adjusts gracefully

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete leaderboard redesign with polish"
```
