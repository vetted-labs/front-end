# Staking Portfolio Redesign

**Date:** 2026-03-27
**Status:** Draft
**Scope:** Replace the withdrawals page with a DeFi-style staking portfolio overview

## Problem

The current withdrawals page (`/expert/withdrawals`) is a plain list of guild names with staked amounts. Clicking a guild navigates to a separate `WithdrawalManager` view. It lacks visual hierarchy, gives no portfolio overview, and feels disconnected from the rest of the platform's design language.

## Solution

Replace with a single-page **Staking Portfolio** view that shows the expert's full staking position at a glance — total staked, available balance, pending unstakes, and per-guild breakdowns. Clicking any guild opens the existing `StakingModal` in withdraw mode rather than navigating to a separate view.

## Design

### Color Palette

Restrained, monochrome-first:

| Role | Color | Usage |
|------|-------|-------|
| Brand accent | `#8b5cf6` (purple) | Total staked card border/label, allocation bars |
| Cooldown/pending | `#d9b45f` (muted gold) | Pending unstake card, cooldown row borders/badges/text |
| Neutral | Zinc scale (`#52525b`, `#6b7280`, `#a1a1aa`) | Icons, secondary text, borders |
| Background | `#09090b` → `#0f0f14` | Page background (matches existing dark theme) |

No per-guild colors. Guild icons use neutral gray backgrounds with white/zinc text.

### Layout (top → bottom)

#### 1. Header
- "← Back to Dashboard" ghost button link
- "Staking Portfolio" h1 + "Manage your staked VETD across guilds" subtitle

#### 2. Stats Row (4-column grid)

| Card | Style | Content |
|------|-------|---------|
| Total Staked | Purple tinted background + border | Sum of all guild stakes, "VETD" label |
| Available Balance | Neutral | Wallet VETD balance |
| Pending Unstake | Gold tinted (always visible; shows "0.00" when no cooldowns) | Sum of pending unstake amounts + shortest remaining time |
| Active Guilds | Neutral | Count of guilds with stake > 0 |

On mobile: 2×2 grid.

#### 3. Positions List

Section header: "Your Positions" left, "Click any guild to withdraw" right.

Each guild row:
- **Left:** 38px rounded icon (gray bg, 2-letter abbreviation) + guild name
- **Right:** Staked amount + percentage + 80px allocation bar (purple) + chevron

**Cooldown variant** (guild with pending unstake request):
- Gold-tinted background + border
- "COOLDOWN" badge next to guild name
- Subtitle: "Unstaking X VETD · Xd Xh remaining"
- Allocation bar shows cooldown progress % in gold instead of purple

**Empty state:** "No active stakes found across any guilds." with link to dashboard.

**Wallet not connected:** Centered message with "Go to Dashboard" button (same as current).

### Interaction

1. Click any guild row → `StakingModal` opens with:
   - `preselectedGuildId` set to `guildStakeInfo.guildId` (the database UUID, which matches `StakingGuildOption.id`)
   - New `defaultMode="withdraw"` prop tells the modal to start in withdraw mode
2. StakingModal handles the full unstake flow (amount input → request unstake TX → confirmation)
3. On modal success → refetch guild stakes + token balance to update the portfolio view

### Data Flow

```
WithdrawalsPage
  ├── useFetch → blockchainApi.getExpertGuildStakes(address) → GuildStakeInfo[]
  ├── useTokenBalance() → available VETD balance
  ├── Derived: total staked, guild count (computed inline / useMemo)
  ├── Pending unstake detection:
  │    └── For each guild, call getUnstakeRequestDetailed(address, hashToBytes32(guildId))
  │        via Promise.all() on mount. Returns { hasRequest, unlockTime (ISO 8601), amount }
  └── StakingModal (lazy imported)
       ├── preselectedGuildId + defaultMode props
       └── onSuccess → refetch stakes + balance
```

**Pending unstake detection:** Use `Promise.all()` to call `blockchainApi.getUnstakeRequestDetailed(address, hashToBytes32(guildId))` for each guild in parallel. Note: `hashToBytes32()` from `@/lib/blockchain` converts the database UUID to the `0x${string}` format required by the API. Results are merged with guild data to determine cooldown state. For the "Pending Unstake" stats card: sum all `amount` values where `hasRequest === true`, display the shortest remaining time (minimum `unlockTime` minus now).

**Cooldown progress bar:** Shows elapsed time as a percentage of the 7-day cooldown period: `(7 days - remaining time) / 7 days * 100`.

### Components

**Modified:**
- `src/components/expert/WithdrawalsPage.tsx` — full rewrite
- `src/components/dashboard/StakingModal.tsx` — add optional `defaultMode?: ActionMode` prop; when provided, use as initial `actionMode` state instead of `"stake"`

**Removed from this page (kept in codebase):**
- `src/components/WithdrawalManager.tsx` — only imported in `WithdrawalsPage.tsx`, will become unused. Keep for now; can be cleaned up separately.

**No new components needed.** The page is simple enough to be a single component with inline stat cards and guild rows.

### Route

Route stays at `/expert/withdrawals`. Update the page title/metadata in `src/app/expert/withdrawals/page.tsx` to "Staking Portfolio". Back link navigates to `/expert/dashboard`.

## Responsive Behavior

- **Desktop (≥1024px):** Stats in 4-column grid, full guild rows with all columns
- **Tablet (640–1023px):** Stats in 2×2 grid, guild rows stack amount below name
- **Mobile (<640px):** Stats in 2×2 grid, guild rows simplified (icon + name + amount, no percentage/bar)

## Edge Cases

- **No stakes:** Empty state message + dashboard link
- **No wallet:** Full-page wallet connection prompt (existing behavior)
- **All guilds in cooldown:** Stats row shows total pending, all rows show gold cooldown styling
- **API error:** Toast error via existing `useFetch` error handling
- **Loading:** Centered spinner (existing pattern)
