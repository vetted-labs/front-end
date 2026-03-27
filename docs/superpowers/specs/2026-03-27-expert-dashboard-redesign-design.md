# Expert Dashboard Redesign

## Overview

Redesign the expert dashboard from a cluttered data dump into a focused, professional command center. The new dashboard balances actionable work items (review queue) with portfolio monitoring (stats, guilds, rank progress) in a clean vertical flow layout.

## Visual Direction

**Dark & Premium** — refined dark theme with glass morphism, indigo/purple accents.

| Token | Value | Usage |
|-------|-------|-------|
| Base background | `#08080d` | Page background |
| Card surface | `rgba(255,255,255, 0.03)` | Card backgrounds |
| Card border | `rgba(255,255,255, 0.06)` | Card borders |
| Elevated surface | `rgba(255,255,255, 0.05)` | Buttons, hover states |
| Elevated border | `rgba(255,255,255, 0.08)` | Button borders |
| Primary accent | `#818cf8` / `rgba(99,102,241, *)` | Indigo — progress bars, accent buttons, rank badges |
| Warning accent | `#fbbf24` / `rgba(245,158,11, *)` | Amber — pending items, decay indicator |
| Success accent | `#34d399` | Green — earnings deltas, earned badges |
| Text primary | `#f4f4f5` (zinc-50) | Headings, stat values |
| Text secondary | `#e4e4e7` (zinc-200) | Card titles, names |
| Text tertiary | `#a1a1aa` (zinc-400) | Buttons, secondary info |
| Text muted | `#52525b` (zinc-600) | Labels, subtitles |
| Card radius | `14px` (`rounded-[14px]`) | All cards |
| Inner radius | `10px` (`rounded-[10px]`) | Nested elements (rows, progress cards) |
| Section gap | `24px` | Between major sections |
| Card padding | `20px` | Internal card padding |
| Stat card padding | `18px` | Stat cards |

Typography follows existing project fonts (Inter sans, Bree Serif, Bricolage Grotesque display). No new fonts needed.

## Layout Structure

Vertical flow, single column, max-width `7xl` container. Four sections stacked top to bottom:

```
┌─────────────────────────────────────────────────┐
│  Header: "Dashboard" + subtitle + action buttons │
├─────────────────────────────────────────────────┤
│  Stats: [Reputation] [Earnings] [Staked] [Reviews] │
├────────────────────────────┬────────────────────┤
│  Review Queue (60%)        │ Rank Progress (40%) │
├────────────────────────────┴────────────────────┤
│  Your Guilds: top 3 cards + "Show all N →"      │
└─────────────────────────────────────────────────┘
```

Responsive breakpoints:
- **Desktop (lg+):** Full layout as shown above. Stats: 4-column grid. Queue/Progress: side-by-side. Guilds: 3-column grid.
- **Tablet (md):** Stats: 2x2 grid. Queue/Progress: stacked (queue first). Guilds: 2-column grid.
- **Mobile (sm):** All single-column. Stats: 2x2 grid. Everything stacks vertically.

## Section 1: Header

**Replaces:** Welcome greeting, InactivityWarningBanner, ActionButtonPanel (full-width gradient cards).

### Structure

```
[Dashboard]                          [Manage Stake] [Start Endorsing]
 Guild Master · 8 guilds
```

- **Title:** "Dashboard" — `text-2xl font-bold text-zinc-50 tracking-tight`
- **Subtitle:** "{highestRank} · {guildCount} guilds" — `text-sm text-zinc-600`
  - `highestRank`: Derived from `profile.guilds` — find the highest rank across all guilds using `GUILD_RANK_ORDER`
  - `guildCount`: `profile.guilds.length`
- **Manage Stake button:** Ghost style — `rgba(255,255,255,0.05)` bg, `rgba(255,255,255,0.08)` border, zinc-400 text
  - Label logic preserved from current `ActionButtonPanel`: "Manage Your Stake" if staking minimum met, "Stake to Start Vetting" if not
  - Click: opens `StakingModal` (same as current)
  - If staking minimum met: append small "Active" indicator (green dot or text)
- **Start Endorsing button:** Accent style — `rgba(99,102,241,0.12)` bg, `rgba(99,102,241,0.25)` border, indigo-300 text
  - Click: navigates to `/expert/endorsements`
  - If not staking minimum: append "Stake Required" text in amber

### What's Removed
- "Welcome back, {name}!" greeting
- "Here's your expert activity overview" subtitle
- InactivityWarningBanner component (decay info moves to reputation stat card)
- Full-width gradient action cards with icons

## Section 2: Stats Row

**Replaces:** Current 4 stat cards (Reputation Score, Total Earnings, Guild Memberships, Staked VETD).

### Cards

All cards share: glass morphism surface, `rounded-[14px]`, `p-[18px]`.

#### 2a. Reputation

- **Label:** "REPUTATION" — `text-[10px] uppercase tracking-wider text-zinc-600 font-medium`
- **Value:** `{profile.reputation}` formatted with commas — `text-[28px] font-bold text-zinc-50 tracking-tight`
- **Decay indicator (conditional):**
  - **When decay is active** (no recent activity within 21 days, same logic as current `InactivityWarningBanner`):
    - Small amber dot (`w-1.5 h-1.5 rounded-full bg-amber-500`) next to the label
    - Subtext: "▼ -10/cycle · decay active" in `text-[11px] text-amber-500`
  - **When healthy:**
    - No dot
    - Subtext: show trend if available (e.g. "+12 this week" in green), or nothing

#### 2b. Earnings

- **Label:** "EARNINGS"
- **Value:** `${profile.totalEarnings}` formatted
- **Subtext:** "▲ +${deltaThisMonth} this month" in `text-emerald-400` if positive delta available
  - Delta source: Compute from `earningsBreakdown` data already fetched. If the API doesn't provide a monthly delta, show "total earned" as static text instead. Do NOT add a new API call for this.

#### 2c. Staked VETD

- **Label:** "STAKED VETD"
- **Value:** Total staked across all guilds (sum of `guildStakes`)
- **Subtext:** "across {guildCount} guilds" in `text-zinc-600`

#### 2d. Reviews

- **Label:** "REVIEWS" — **replaces "Guild Memberships"**
- **Value:** `{profile.reviewCount}` (already available on expert profile)
- **Subtext:** "{consensusRate}% consensus rate" in `text-zinc-500`
  - If `profile.approvalCount` and `profile.reviewCount` are available, compute: `Math.round((approvalCount / reviewCount) * 100)`
  - If not computable, show "—" or omit subtext

### Responsive
- `lg+`: `grid-cols-4 gap-3.5`
- `md`: `grid-cols-2 gap-3.5`
- `sm`: `grid-cols-2 gap-3`

## Section 3: Two-Column Middle

**Replaces:** "Assigned to Me" section + PromotionProgressCard section (currently separate, scattered).

### Layout
- Desktop: `grid-cols-[1.5fr_1fr] gap-4` (60/40 split)
- Tablet/Mobile: stacked vertically, queue first

### 3a. Review Queue (Left)

Glass morphism card, full height.

**Header row:**
- "Review Queue" — `text-[13px] font-semibold text-zinc-200`
- Amber pill badge: "{count} pending" — `bg-amber-500/12 text-amber-300 rounded-full px-2.5 py-0.5 text-[11px] font-semibold`

**Candidate rows:**
Each assigned application/proposal renders as a row:

```
[BQ]  Blake Quigley                          [Review →]
      Marketing & Growth · assigned 2h ago
```

- **Avatar:** Initials in a rounded square (`rounded-[10px]`, `w-[34px] h-[34px]`). Color: amber bg for the first/most urgent item, indigo bg for others. Derived from candidate name initials.
- **Name:** `text-[13px] font-semibold text-zinc-200`
- **Meta:** Guild name + time ago — `text-[11px] text-zinc-600`
- **Action button:** "Review →" — ghost button, navigates to candidate review page
- **Row background:** Most urgent row gets subtle amber tint (`rgba(245,158,11,0.05)` bg, `rgba(245,158,11,0.10)` border). Others get default subtle surface.

**Empty state:**
- "No pending reviews" — centered, `text-[12px] text-zinc-600`

**Overflow:**
- Show max 5 candidates
- If more: "View all assigned →" link at bottom

**Data source:** Same `guildApplicationsApi.getAssigned(profile.id)` call already in the component.

### 3b. Rank Progress (Right)

Glass morphism card, full height.

**Header:** "Rank Progress" — `text-[13px] font-semibold text-zinc-200`

**Guild progress rows (max 3):**

```
Engineering                    Master
[████████████████████████████]  (full bar)
```

- **Selection logic:** Show top 3 guilds sorted by:
  1. Guilds NOT at max rank first (most opportunity)
  2. Then by progress percentage descending
  3. If all are max rank, show top 3 by earnings
- **Guild name:** `text-[12px] font-semibold text-zinc-300` (or `text-indigo-200` for highlighted)
- **Rank label:** `text-[10px] uppercase tracking-wider` — indigo for highlighted guild, zinc-500 for others
- **Progress bar:** 3px height, `rgba(255,255,255,0.06)` track, indigo gradient fill (`from-indigo-400 to-indigo-500`)
  - Progress calculation: Use existing `GUILD_RANK_CRITERIA` logic from `PromotionProgressCard` to compute completion ratio
  - Max rank = 100% filled bar
- **Row background:** Top guild gets subtle indigo tint (`rgba(99,102,241,0.06)` bg, `rgba(99,102,241,0.12)` border). Others get default surface.

**What's NOT shown here (moved to guild detail page):**
- Individual criteria (reviews completed X/Y, consensus alignment, endorsements)
- "All criteria met!" message
- Checkmark icons

## Section 4: Your Guilds

**Replaces:** Full 8-guild grid that dominated the page.

### Default State: Top 3

**Header row:**
- "Your Guilds" — `text-[13px] font-semibold text-zinc-200`
- "Show all {count} →" button — ghost style, right-aligned

**Card grid:** 3 columns on desktop, 2 on tablet, 1 on mobile.

**Each card:**

```
Engineering                    [$107]
Master · 3 members

200          0
Staked       Pending
```

- **Guild name:** `text-[13px] font-semibold text-zinc-200`
- **Rank + members:** `text-[11px] text-zinc-600`
- **Earned badge:** Top-right pill — `bg-emerald-500/10 text-emerald-400 rounded-md px-2 py-0.5 text-[10px] font-semibold` — shows earned amount for this guild
- **Stats row:** Staked amount + Pending review count — `text-[16px] font-bold text-zinc-300` values, `text-[10px] text-zinc-600` labels
- **Click:** Entire card navigates to guild detail page
- **Hover:** Subtle border brightening + slight translate

**Sort order:** By earnings descending (most productive guilds surface first).

### Expanded State

- Clicking "Show all {count}" reveals remaining guilds in same card format
- Button text changes to "Show less"
- Simple expand/collapse with CSS transition (height + opacity)
- State managed with local `useState<boolean>(false)`

### What's Removed
- Per-guild icons (the custom icon from `guildHelpers`)
- Tooltip "?" icons on each card
- The separate "Rank: Guild Master" badge row that sat between stats and assignments

## Components: Change Summary

| Component | Action | Details |
|-----------|--------|---------|
| `EnhancedExpertDashboard.tsx` | **Major refactor** | Remove notification fetch, restructure render into 4 sections, remove InactivityWarningBanner usage, simplify header |
| `StatCard.tsx` | **Enhance** | Add optional `warning` prop for amber dot + decay text. Add optional `trend` rendering improvements. |
| `ActionButtonPanel.tsx` | **Redesign** | Slim header buttons instead of full-width gradient cards. Return two buttons that the parent places in the header flex row. |
| `InactivityWarningBanner.tsx` | **Remove from dashboard** | Component stays in codebase (may be used elsewhere), but dashboard no longer renders it. Decay logic moves into reputation StatCard. |
| `PromotionProgressCard.tsx` | **Simplify** | Strip criteria checklist. New simplified version shows only: guild name, rank label, progress bar. Rename or create new `RankProgressCard` component. |
| `DashboardNotificationsFeed.tsx` | **Remove from dashboard** | Component stays in codebase (used on notifications page), but dashboard no longer renders it. Remove the notifications API call from the dashboard. |
| `GuildCard.tsx` | **Refine "dashboard" variant** | Remove guild icon, remove tooltip icon. Add earned badge. Make cards more compact. Ensure click navigates to guild detail. |

## Data Changes

**No new API calls.** All data already fetched:

- `expertApi.getProfile()` — reputation, guilds, reviewCount, approvalCount, recentActivity (for decay check)
- `expertApi.getEarningsBreakdown()` — per-guild earnings (for sorting guilds by earnings)
- `guildApplicationsApi.getAssigned()` — review queue
- `blockchainApi.getExpertGuildStakes()` — staked amounts per guild

**Removed API call from dashboard:**
- `notificationsApi.getNotifications()` — no longer needed since notifications feed is removed

**Earnings delta:** If the current `earningsBreakdown` response includes temporal data (this month vs last), use it. If not, show static "total earned" instead. Do not add a new endpoint.

## Styling Approach

The design uses Tailwind utility classes throughout. Key patterns:

- **Glass morphism cards:** `bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-5`
- **Elevated surfaces (buttons):** `bg-white/[0.05] border border-white/[0.08]`
- **Accent surfaces:** `bg-indigo-500/[0.12] border border-indigo-500/[0.25]`
- **Warning surfaces:** `bg-amber-500/[0.05] border border-amber-500/[0.10]`
- **Success badges:** `bg-emerald-500/[0.10] text-emerald-400`
- **Dark mode compatibility:** The current app uses a theme provider with dark mode. These styles should work within the existing `dark:` context. Use CSS custom properties where the existing design system provides them, fall back to direct Tailwind values for the new dashboard-specific styles.

## What's NOT In Scope

- Global nav/layout changes — only the dashboard content area
- New API endpoints or backend changes
- Notifications page redesign (just removed from dashboard)
- Guild detail page changes
- Mobile-first responsive redesign beyond basic stacking
- Animations beyond expand/collapse and hover transitions
- Light mode variant (dashboard is dark-only for now)
