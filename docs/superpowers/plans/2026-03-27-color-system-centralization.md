# Color System Centralization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all 390+ hardcoded Tailwind color classes across 136 component files by creating a centralized, theme-aware color token system with semantic status colors, unified rank colors, and a proper dark-mode surface hierarchy.

**Architecture:** New CSS custom properties in `globals.css` define the primitive color tokens (surfaces, status, ranks). A new `src/config/colors.ts` module exports typed helper objects and className strings that components consume — replacing all inline hardcoded colors. Existing status configs in `constants.ts` are migrated to use the new tokens. The `StatusBadge` component is deleted and replaced by the config-driven system.

**Tech Stack:** Tailwind CSS 4 (CSS custom properties via `@theme inline`), TypeScript, existing globals.css + constants.ts patterns.

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/config/colors.ts` | Central color token exports: semantic status classes, rank colors, notification colors, surface utilities, vote colors, urgency colors, event activity colors, proposal type colors. Single source of truth for ALL non-primitive colors. |

### Modified Files
| File | Changes |
|------|---------|
| `src/app/globals.css` | Add new CSS custom properties: `--positive`, `--negative`, `--info-blue`, `--neutral` status tokens; `--surface-*` surface hierarchy (both light AND dark); `--rank-*` colors. Alias `--success` → `--positive` to avoid two greens coexisting. |
| `src/config/constants.ts` | Rewrite all `*_STATUS_CONFIG` objects to import className strings from `colors.ts` instead of hardcoding Tailwind classes. |
| `src/components/ui/badge.tsx` | Replace hardcoded rank variant classes with imports from `colors.ts`. |
| `src/components/ui/statusbadge.tsx` | **DELETE** — replaced by `StatusBadge` that reads from unified config. |
| `src/components/ui/countdown-badge.tsx` | Replace hardcoded urgency colors with `colors.ts` imports. |
| `src/lib/notification-helpers.ts` | Replace all hardcoded notification color mappings with `colors.ts` imports. |
| `src/components/ui/alert.tsx` | Replace hardcoded success/warning/info color strings with semantic token classes. |
| `src/components/ui/transaction-status.tsx` | Replace 4 hardcoded status color instances with semantic tokens. |
| `src/lib/guildHelpers.ts` | Replace hardcoded `bg-emerald-*` / `text-emerald-*` with `STATUS_COLORS.positive`. |
| ~130 component files | Replace hardcoded `text-green-500`, `bg-blue-100`, `bg-white/[0.0X]`, etc. with semantic classes from `colors.ts`. Split into sub-tasks by domain. |

---

## Task 1: Add New CSS Custom Properties to globals.css

**Files:**
- Modify: `src/app/globals.css:1-192`

This is the foundation — all other tasks depend on these tokens existing.

- [ ] **Step 1: Add semantic status color tokens to `:root` (light mode)**

Add after line 47 (`--info-foreground`), before the gradient-button-text line:

```css
    /* Semantic status colors — desaturated for light mode */
    --positive: 155 55% 38%;           /* #2a9d6e — muted teal-green */
    --positive-foreground: 0 0% 100%;
    --negative: 0 45% 53%;             /* #c44b4b — muted red */
    --negative-foreground: 0 0% 100%;
    --info-blue: 213 30% 50%;          /* #5a7fa8 — muted steel blue */
    --info-blue-foreground: 0 0% 100%;
    --neutral: 240 4% 46%;             /* #71717a — zinc gray */
    --neutral-foreground: 0 0% 100%;

    /* Rank progression — cool to warm */
    --rank-recruit: 215 17% 63%;       /* #94a3b8 — slate */
    --rank-apprentice: 160 59% 52%;    /* #34d399 — emerald */
    --rank-craftsman: 24 100% 60%;     /* #ff8a33 — light orange */
    --rank-officer: 24 100% 50%;       /* #ff6a00 — brand orange */
    --rank-master: 40 100% 50%;        /* #ffaa00 — gold */

    /* Surface hierarchy — light mode maps to existing semantic vars */
    --surface-0: 30 40% 98%;           /* same as --background */
    --surface-1: 0 0% 100%;            /* same as --card */
    --surface-2: 0 0% 100%;            /* same as --popover */
    --surface-3: 30 20% 95%;           /* same as --muted */
    --surface-border: 30 10% 90%;      /* same as --border */
```

> **Note:** The existing `--warning` token (line 44 in `:root`, line 118 in `.dark`) is intentionally reused for `STATUS_COLORS.warning` — no new CSS var needed for warnings.

- [ ] **Step 2: Add matching dark-mode tokens to `.dark`**

Add after line 121 (`--info-foreground` in dark block):

```css
    /* Semantic status colors — brighter for dark backgrounds */
    --positive: 160 59% 52%;           /* #34d399 */
    --positive-foreground: 160 30% 10%;
    --negative: 0 90% 71%;             /* #f87171 */
    --negative-foreground: 0 0% 100%;
    --info-blue: 217 91% 68%;          /* #60a5fa */
    --info-blue-foreground: 217 30% 10%;
    --neutral: 240 5% 65%;             /* #a1a1aa */
    --neutral-foreground: 0 0% 100%;

    /* Rank progression — same hues, adjusted brightness */
    --rank-recruit: 215 17% 63%;
    --rank-apprentice: 160 59% 52%;
    --rank-craftsman: 24 100% 60%;
    --rank-officer: 24 100% 60%;
    --rank-master: 40 100% 50%;

    /* Dark surface hierarchy (replaces white/[0.0X] opacity hacks) */
    --surface-0: 220 20% 5%;           /* #0c0f14 — page base */
    --surface-1: 222 17% 10%;          /* #141820 — cards */
    --surface-2: 222 16% 13%;          /* #1a1f2a — elevated (modals, dropdowns) */
    --surface-3: 221 16% 17%;          /* #222938 — hover / nested */
    --surface-border: 220 15% 19%;     /* #252d3a — borders */
```

- [ ] **Step 3: Register new tokens in `@theme inline` block**

Add after line 187 (`--color-orange-light`):

```css
    --color-positive: hsl(var(--positive));
    --color-positive-foreground: hsl(var(--positive-foreground));
    --color-negative: hsl(var(--negative));
    --color-negative-foreground: hsl(var(--negative-foreground));
    --color-info-blue: hsl(var(--info-blue));
    --color-info-blue-foreground: hsl(var(--info-blue-foreground));
    --color-neutral: hsl(var(--neutral));
    --color-neutral-foreground: hsl(var(--neutral-foreground));
    --color-rank-recruit: hsl(var(--rank-recruit));
    --color-rank-apprentice: hsl(var(--rank-apprentice));
    --color-rank-craftsman: hsl(var(--rank-craftsman));
    --color-rank-officer: hsl(var(--rank-officer));
    --color-rank-master: hsl(var(--rank-master));
    --color-surface-0: hsl(var(--surface-0));
    --color-surface-1: hsl(var(--surface-1));
    --color-surface-2: hsl(var(--surface-2));
    --color-surface-3: hsl(var(--surface-3));
    --color-surface-border: hsl(var(--surface-border));
```

- [ ] **Step 4: Verify the dev server compiles with no errors**

Run: `npm run dev`
Expected: No CSS compilation errors, app loads normally.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add semantic status, rank, and surface CSS tokens to globals.css"
```

---

## Task 2: Create Central Color Config Module

**Files:**
- Create: `src/config/colors.ts`

This is the TypeScript layer that all components will import from. It maps semantic intent to Tailwind class strings built on the new CSS vars.

- [ ] **Step 1: Create `src/config/colors.ts` with all color token exports**

```typescript
/**
 * Centralized color token system.
 *
 * ALL non-primitive colors in the app come from here.
 * Components import these instead of hardcoding Tailwind color classes.
 *
 * The classes reference CSS custom properties defined in globals.css,
 * which swap automatically between light and dark mode.
 */

// ─── Semantic Status Colors ─────────────────────────────────────────
// Use these for any success/error/warning/info/neutral/pending indicators.

export const STATUS_COLORS = {
  positive: {
    text: "text-positive",
    bg: "bg-positive",
    bgSubtle: "bg-positive/10",
    border: "border-positive/20",
    icon: "text-positive",
    badge: "bg-positive/10 text-positive border border-positive/20",
    dot: "bg-positive",
  },
  negative: {
    text: "text-negative",
    bg: "bg-negative",
    bgSubtle: "bg-negative/10",
    border: "border-negative/20",
    icon: "text-negative",
    badge: "bg-negative/10 text-negative border border-negative/20",
    dot: "bg-negative",
  },
  warning: {
    text: "text-warning",
    bg: "bg-warning",
    bgSubtle: "bg-warning/10",
    border: "border-warning/20",
    icon: "text-warning",
    badge: "bg-warning/10 text-warning border border-warning/20",
    dot: "bg-warning",
  },
  info: {
    text: "text-info-blue",
    bg: "bg-info-blue",
    bgSubtle: "bg-info-blue/10",
    border: "border-info-blue/20",
    icon: "text-info-blue",
    badge: "bg-info-blue/10 text-info-blue border border-info-blue/20",
    dot: "bg-info-blue",
  },
  neutral: {
    text: "text-neutral",
    bg: "bg-neutral",
    bgSubtle: "bg-neutral/10",
    border: "border-neutral/20",
    icon: "text-neutral",
    badge: "bg-neutral/10 text-neutral border border-neutral/20",
    dot: "bg-neutral",
  },
  pending: {
    text: "text-primary",
    bg: "bg-primary",
    bgSubtle: "bg-primary/10",
    border: "border-primary/20",
    icon: "text-primary",
    badge: "bg-primary/10 text-primary border border-primary/20",
    dot: "bg-primary",
  },
} as const;

export type StatusIntent = keyof typeof STATUS_COLORS;

// ─── Rank Colors ────────────────────────────────────────────────────
// Single source of truth for guild rank colors across all pages.

export const RANK_COLORS = {
  recruit: {
    text: "text-rank-recruit",
    bg: "bg-rank-recruit",
    bgSubtle: "bg-rank-recruit/10",
    border: "border-rank-recruit/20",
    badge: "bg-rank-recruit/10 text-rank-recruit border border-rank-recruit/20",
    dot: "bg-rank-recruit",
    glow: "shadow-[0_0_12px_hsl(var(--rank-recruit)/0.2)]",
  },
  apprentice: {
    text: "text-rank-apprentice",
    bg: "bg-rank-apprentice",
    bgSubtle: "bg-rank-apprentice/10",
    border: "border-rank-apprentice/20",
    badge: "bg-rank-apprentice/10 text-rank-apprentice border border-rank-apprentice/20",
    dot: "bg-rank-apprentice",
    glow: "shadow-[0_0_12px_hsl(var(--rank-apprentice)/0.2)]",
  },
  craftsman: {
    text: "text-rank-craftsman",
    bg: "bg-rank-craftsman",
    bgSubtle: "bg-rank-craftsman/10",
    border: "border-rank-craftsman/20",
    badge: "bg-rank-craftsman/10 text-rank-craftsman border border-rank-craftsman/20",
    dot: "bg-rank-craftsman",
    glow: "shadow-[0_0_12px_hsl(var(--rank-craftsman)/0.2)]",
  },
  officer: {
    text: "text-rank-officer",
    bg: "bg-rank-officer",
    bgSubtle: "bg-rank-officer/10",
    border: "border-rank-officer/20",
    badge: "bg-rank-officer/10 text-rank-officer border border-rank-officer/20",
    dot: "bg-rank-officer",
    glow: "shadow-[0_0_12px_hsl(var(--rank-officer)/0.2)]",
  },
  master: {
    text: "text-rank-master",
    bg: "bg-rank-master",
    bgSubtle: "bg-rank-master/10",
    border: "border-rank-master/20",
    badge: "bg-rank-master/10 text-rank-master border border-rank-master/20",
    dot: "bg-rank-master",
    glow: "shadow-[0_0_12px_hsl(var(--rank-master)/0.2)]",
  },
} as const;

export type GuildRank = keyof typeof RANK_COLORS;

/** Look up rank colors with a fallback for unknown ranks */
export function getRankColors(rank: string) {
  return RANK_COLORS[rank as GuildRank] ?? RANK_COLORS.recruit;
}

// ─── Vote Colors ────────────────────────────────────────────────────

export const VOTE_COLORS = {
  for: {
    button: "bg-positive/15 text-positive border border-positive/30 hover:bg-positive/25",
    bar: "bg-positive",
    text: "text-positive",
  },
  against: {
    button: "bg-negative/15 text-negative border border-negative/30 hover:bg-negative/25",
    bar: "bg-negative",
    text: "text-negative",
  },
  abstain: {
    button: "bg-neutral/15 text-neutral border border-neutral/30 hover:bg-neutral/25",
    bar: "bg-neutral",
    text: "text-neutral",
  },
} as const;

// ─── Notification Colors ────────────────────────────────────────────
// 3-tier priority system: urgent (highlighted bg), normal (brand icon), positive (green).

export const NOTIFICATION_COLORS = {
  /** Deadlines — gets a tinted background for urgency */
  urgent: {
    icon: "bg-primary/12 text-primary",
    bg: "bg-primary/[0.06] border-primary/15",
    title: "text-primary",
  },
  /** Standard actions — proposals, applications, status changes */
  action: {
    icon: "bg-primary/8 text-primary",
    bg: "",
    title: "",
  },
  /** Positive outcomes — rewards, completions */
  positive: {
    icon: "bg-positive/10 text-positive",
    bg: "",
    title: "text-positive",
  },
  /** Fallback */
  default: {
    icon: "bg-muted text-muted-foreground",
    bg: "",
    title: "",
  },
} as const;

export type NotificationPriority = keyof typeof NOTIFICATION_COLORS;

/** Map notification type strings to priority tiers */
export function getNotificationPriority(type: string): NotificationPriority {
  switch (type) {
    case "proposal_deadline":
    case "application_deadline":
      return "urgent";
    case "reward_earned":
    case "application_accepted":
    case "guild_report_ready":
      return "positive";
    case "proposal_new":
    case "application_new":
    case "application_status":
    case "guild_application":
    case "application_received":
    case "application_status_change":
    case "new_message":
    case "meeting_scheduled":
    case "interview_scheduled":
    case "job_recommendation":
    case "weekly_summary":
      return "action";
    default:
      return "default";
  }
}

// ─── Activity Event Colors ──────────────────────────────────────────
// 3 semantic categories: action (brand), positive (green), negative (red).

export const ACTIVITY_COLORS = {
  action: { dot: "bg-primary", text: "text-primary" },
  positive: { dot: STATUS_COLORS.positive.dot, text: STATUS_COLORS.positive.text },
  negative: { dot: STATUS_COLORS.negative.dot, text: STATUS_COLORS.negative.text },
} as const;

/** Map guild activity event types to semantic color categories */
export function getActivityColor(eventType: string) {
  switch (eventType) {
    case "candidate_joined":
    case "member_approved":
    case "candidate_approved":
      return ACTIVITY_COLORS.positive;
    case "member_rejected":
      return ACTIVITY_COLORS.negative;
    default:
      return ACTIVITY_COLORS.action;
  }
}

// ─── Proposal Type Colors ───────────────────────────────────────────

export const PROPOSAL_TYPE_COLORS: Record<string, { bar: string; badge: string }> = {
  parameter_change: {
    bar: "bg-primary",
    badge: STATUS_COLORS.pending.badge,
  },
  guild_master_election: {
    bar: "bg-warning",
    badge: STATUS_COLORS.warning.badge,
  },
  guild_creation: {
    bar: "bg-positive",
    badge: STATUS_COLORS.positive.badge,
  },
  general: {
    bar: "bg-info-blue",
    badge: STATUS_COLORS.info.badge,
  },
};

export function getProposalTypeColors(type: string) {
  return PROPOSAL_TYPE_COLORS[type] ?? {
    bar: "bg-primary",
    badge: STATUS_COLORS.pending.badge,
  };
}

// ─── Urgency / Countdown Colors ─────────────────────────────────────

export function getUrgencyColors(hoursLeft: number | null) {
  if (hoursLeft === null) return STATUS_COLORS.neutral.badge;
  if (hoursLeft <= 0) return "bg-muted text-muted-foreground border border-border";
  if (hoursLeft < 6) return STATUS_COLORS.negative.badge;
  if (hoursLeft < 24) return STATUS_COLORS.warning.badge;
  return STATUS_COLORS.positive.badge;
}

// ─── Match Score Colors ─────────────────────────────────────────────

export function getMatchScoreColors(pct: number) {
  if (pct >= 70) return STATUS_COLORS.positive;
  if (pct >= 40) return STATUS_COLORS.warning;
  return STATUS_COLORS.negative;
}

// ─── Surface Utilities (dark mode hierarchy) ────────────────────────
// Use these instead of bg-white/[0.0X] opacity hacks.

export const SURFACE = {
  base: "bg-surface-0",
  card: "bg-surface-1",
  elevated: "bg-surface-2",
  hover: "bg-surface-3",
  border: "border-surface-border",
} as const;

// ─── Stat Icon Colors ───────────────────────────────────────────────
// All stat icons use brand primary — NO per-metric rainbow.

export const STAT_ICON = {
  bg: "bg-primary/[0.08]",
  text: "text-primary",
} as const;

// ─── Leaderboard Podium Colors ──────────────────────────────────────

export const PODIUM_COLORS = {
  1: {
    gradient: "from-rank-master to-rank-officer",
    ring: "ring-rank-master/60",
    platform: "from-rank-master/20 to-rank-officer/10",
    border: "border-rank-master/40",
    label: "text-rank-master",
  },
  2: {
    gradient: "from-rank-recruit to-neutral",
    ring: "ring-rank-recruit/60",
    platform: "from-rank-recruit/20 to-neutral/10",
    border: "border-rank-recruit/40",
    label: "text-rank-recruit",
  },
  3: {
    gradient: "from-rank-craftsman to-rank-officer",
    ring: "ring-rank-craftsman/60",
    platform: "from-rank-craftsman/20 to-rank-officer/10",
    border: "border-rank-craftsman/40",
    label: "text-rank-craftsman",
  },
} as const;
```

- [ ] **Step 2: Verify the file has no TypeScript errors**

Run: `npx tsc --noEmit src/config/colors.ts`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/config/colors.ts
git commit -m "feat: create centralized color token system in config/colors.ts"
```

---

## Task 3: Migrate Status Configs in constants.ts

**Files:**
- Modify: `src/config/constants.ts:88-169`

Replace all hardcoded Tailwind color strings with references to `STATUS_COLORS` from `colors.ts`.

- [ ] **Step 1: Add import at the top of constants.ts**

Add after the existing imports (line 1 area):

```typescript
import { STATUS_COLORS } from "./colors";
```

- [ ] **Step 2: Rewrite APPLICATION_STATUS_CONFIG (lines 91-101)**

```typescript
export const APPLICATION_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: STATUS_COLORS.pending.badge },
  reviewing: { label: "Reviewing", className: STATUS_COLORS.info.badge },
  interviewed: { label: "Interviewed", className: STATUS_COLORS.info.badge },
  interviewing: { label: "Interviewing", className: STATUS_COLORS.info.badge },
  accepted: { label: "Accepted", className: STATUS_COLORS.positive.badge },
  offered: { label: "Offered", className: STATUS_COLORS.positive.badge },
  rejected: { label: "Rejected", className: STATUS_COLORS.negative.badge },
  hired: { label: "Hired", className: STATUS_COLORS.positive.badge },
  withdrawn: { label: "Withdrawn", className: STATUS_COLORS.neutral.badge },
};
```

- [ ] **Step 3: Rewrite JOB_STATUS_CONFIG (lines 107-112)**

```typescript
export const JOB_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: STATUS_COLORS.positive.badge },
  paused: { label: "Paused", className: STATUS_COLORS.warning.badge },
  closed: { label: "Closed", className: "bg-muted border border-border text-muted-foreground" },
  draft: { label: "Draft", className: STATUS_COLORS.info.badge },
};
```

- [ ] **Step 4: Rewrite APPEAL_STATUS_CONFIG (lines 118-123)**

```typescript
export const APPEAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending Review", color: STATUS_COLORS.warning.text },
  reviewing: { label: "Under Review", color: STATUS_COLORS.info.text },
  upheld: { label: "Rejection Upheld", color: STATUS_COLORS.negative.text },
  overturned: { label: "Overturned — Candidate Admitted", color: STATUS_COLORS.positive.text },
};
```

- [ ] **Step 5: Rewrite TEAM_MEMBER_STATUS_CONFIG (lines 128-132)**

```typescript
export const TEAM_MEMBER_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: STATUS_COLORS.positive.badge },
  pending: { label: "Pending", className: STATUS_COLORS.warning.badge },
  inactive: { label: "Inactive", className: "text-muted-foreground bg-muted/30 border-border/40" },
};
```

- [ ] **Step 6: Rewrite GUILD_APPLICATION_STATUS_CONFIG (lines 137-141)**

```typescript
export const GUILD_APPLICATION_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: STATUS_COLORS.positive.badge },
  rejected: { label: "Rejected", className: STATUS_COLORS.negative.badge },
  pending: { label: "Pending", className: STATUS_COLORS.pending.badge },
};
```

- [ ] **Step 7: Rewrite VETTING_REVIEW_STATE_CONFIG (lines 155-160)**

```typescript
export const VETTING_REVIEW_STATE_CONFIG: Record<string, { label: string; className: string }> = {
  needs_review: { label: "Needs Review", className: STATUS_COLORS.pending.badge },
  committed: { label: "Committed", className: STATUS_COLORS.warning.badge },
  revealed: { label: "Revealed", className: STATUS_COLORS.positive.badge },
  finalized: { label: "Finalized", className: "bg-muted text-muted-foreground border-border" },
};
```

- [ ] **Step 8: Verify app compiles**

Run: `npm run dev`
Expected: No errors. Status badges now use semantic tokens.

- [ ] **Step 9: Commit**

```bash
git add src/config/constants.ts
git commit -m "refactor: migrate all status configs to centralized color tokens"
```

---

## Task 4: Delete StatusBadge, Migrate to Config-Driven Badges

**Files:**
- Delete: `src/components/ui/statusbadge.tsx`
- Modify: every file that imports `StatusBadge` — replace with Badge + config lookup

- [ ] **Step 1: Find all files importing StatusBadge**

Run: `grep -r "StatusBadge\|statusbadge" src/ --include="*.tsx" --include="*.ts" -l`

Note all files found.

- [ ] **Step 2: For each importing file, replace `<StatusBadge status="X" />` with the appropriate config lookup**

Pattern:
```tsx
// Before
import { StatusBadge } from "@/components/ui/statusbadge";
<StatusBadge status={status} />

// After
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
const config = APPLICATION_STATUS_CONFIG[status];
<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config?.className ?? ""}`}>
  {config?.label ?? status}
</span>
```

Or use the existing `Badge` component with a dynamic className:
```tsx
import { Badge } from "@/components/ui/badge";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
const config = APPLICATION_STATUS_CONFIG[status];
<Badge className={config?.className}>{config?.label ?? status}</Badge>
```

- [ ] **Step 3: Delete `src/components/ui/statusbadge.tsx`**

- [ ] **Step 4: Verify no import errors**

Run: `npm run build`
Expected: Build succeeds with no missing module errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove StatusBadge component, use config-driven Badge instead"
```

---

## Task 5: Migrate Badge Rank Variants

**Files:**
- Modify: `src/components/ui/badge.tsx:30-36`

- [ ] **Step 1: Add import**

```typescript
import { RANK_COLORS } from "@/config/colors";
```

- [ ] **Step 2: Replace hardcoded rank variants**

Replace the 4 hardcoded rank variant strings with:

```typescript
master: RANK_COLORS.master.badge,
officer: RANK_COLORS.officer.badge,
craftsman: RANK_COLORS.craftsman.badge,
recruit: RANK_COLORS.recruit.badge,
```

Also add the missing `apprentice` variant:

```typescript
apprentice: RANK_COLORS.apprentice.badge,
```

- [ ] **Step 3: Verify badge renders correctly**

Run: `npm run dev`, navigate to any page with rank badges.
Expected: Badges render with the new rank-token colors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/badge.tsx
git commit -m "refactor: badge rank variants now use centralized RANK_COLORS"
```

---

## Task 6: Migrate Notification Color Helpers

**Files:**
- Modify: `src/lib/notification-helpers.ts`

- [ ] **Step 1: Replace `getNotificationColor` with import from colors.ts**

```typescript
import { getNotificationPriority, NOTIFICATION_COLORS } from "@/config/colors";

export function getNotificationColor(type: string): string {
  const priority = getNotificationPriority(type);
  return NOTIFICATION_COLORS[priority].icon;
}
```

- [ ] **Step 2: Replace COMPANY_COLOR_MAP and CANDIDATE_COLOR_MAP**

These functions should also use `getNotificationPriority` to map types to the 3-tier system. Replace the hardcoded per-type color maps with:

```typescript
export function getCompanyNotificationColor(type: string): string {
  return getNotificationColor(type);
}

export function getCandidateNotificationColor(type: string): string {
  return getNotificationColor(type);
}
```

- [ ] **Step 3: Verify notifications page renders**

Run: `npm run dev`, navigate to `/expert/notifications`.
Expected: All notification icons use brand orange (action) or green (positive) or orange-highlighted (urgent).

- [ ] **Step 4: Commit**

```bash
git add src/lib/notification-helpers.ts
git commit -m "refactor: notification colors now use 3-tier priority system from colors.ts"
```

---

## Task 7: Migrate Countdown Badge

**Files:**
- Modify: `src/components/ui/countdown-badge.tsx`

- [ ] **Step 1: Replace the `getUrgencyColor` function**

```typescript
import { getUrgencyColors } from "@/config/colors";
```

Replace the local `getUrgencyColor` with a call to `getUrgencyColors` from the centralized config. Map the hours-remaining logic to use the imported function.

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/countdown-badge.tsx
git commit -m "refactor: countdown badge uses centralized urgency colors"
```

---

## Task 8: Migrate GuildRanksProgression Rank Colors

**Files:**
- Modify: `src/components/GuildRanksProgression.tsx`

This file has the largest inline `RANK_COLORS` constant (~50 lines of hardcoded colors).

- [ ] **Step 1: Replace the local RANK_COLORS constant**

Remove the entire local `RANK_COLORS` object (lines ~141-195) and replace with:

```typescript
import { RANK_COLORS as RANK_COLOR_TOKENS, getRankColors } from "@/config/colors";
```

- [ ] **Step 2: Update all references**

Everywhere the component accesses `RANK_COLORS[rank].text`, `RANK_COLORS[rank].bg`, etc., replace with `getRankColors(rank).text`, etc.

The shape is the same (text, bg, bgSubtle, border, badge, dot, glow), so this should be a find-and-replace within the file.

- [ ] **Step 3: Replace hardcoded `bg-emerald-500/10` and `text-emerald-*` instances**

These are used for "achieved" states in the timeline. Replace with:

```typescript
STATUS_COLORS.positive.bgSubtle  // was bg-emerald-500/10
STATUS_COLORS.positive.text      // was text-emerald-600 dark:text-emerald-400
STATUS_COLORS.positive.badge     // was the achieved badge
```

Import `STATUS_COLORS` from `@/config/colors`.

- [ ] **Step 4: Verify the guild ranks page renders**

Run: `npm run dev`, navigate to `/expert/guild-ranks`.
Expected: Rank progression displays with new unified colors.

- [ ] **Step 5: Commit**

```bash
git add src/components/GuildRanksProgression.tsx
git commit -m "refactor: guild ranks progression uses centralized rank color tokens"
```

---

## Task 9: Migrate Leaderboard Components

**Files:**
- Modify: `src/components/leaderboard/LeaderboardTable.tsx`
- Modify: `src/components/leaderboard/LeaderboardPodium.tsx`
- Modify: `src/components/leaderboard/LeaderboardTrending.tsx`

- [ ] **Step 1: LeaderboardTable — replace ROLE_PILL_COLORS**

Remove the local `ROLE_PILL_COLORS` constant and replace with:

```typescript
import { getRankColors, getMatchScoreColors } from "@/config/colors";

// Replace ROLE_PILL_COLORS[rank] with getRankColors(rank).badge
// Replace getConsensusBarColor(pct) with getMatchScoreColors(pct).bg
```

Also replace trend arrow colors:
```typescript
// text-emerald-500 → STATUS_COLORS.positive.text
// text-rose-400 → STATUS_COLORS.negative.text
// text-orange-500 → "text-primary"
```

- [ ] **Step 2: LeaderboardPodium — replace RANK_STYLES hex colors**

Remove the RANK_STYLES constant with hardcoded hex values. Replace with:

```typescript
import { PODIUM_COLORS } from "@/config/colors";
```

Use `PODIUM_COLORS[1]`, `PODIUM_COLORS[2]`, `PODIUM_COLORS[3]` for each podium position.

- [ ] **Step 3: LeaderboardTrending — replace hardcoded emerald/orange**

```typescript
// bg-emerald-500/10, text-emerald-500 → STATUS_COLORS.positive.bgSubtle, .text
// bg-orange-500/10, text-orange-500 → "bg-primary/10", "text-primary"
```

- [ ] **Step 4: Verify leaderboard page**

Run: `npm run dev`, navigate to `/expert/leaderboard`.
Expected: Podium, table, and trending all render with consistent rank colors.

- [ ] **Step 5: Commit**

```bash
git add src/components/leaderboard/
git commit -m "refactor: leaderboard components use centralized color tokens"
```

---

## Task 10: Migrate Endorsement Components

**Files:**
- Modify: `src/components/endorsements/ApplicationCard.tsx`
- Modify: `src/components/endorsements/CandidateDetailsModal.tsx`
- Modify: `src/components/endorsements/MyActiveEndorsements.tsx`
- Modify: `src/components/endorsements/MyEndorsementsHistory.tsx` (if needed)

- [ ] **Step 1: ApplicationCard — replace tier colors**

Replace the inline tier color logic (green-500/amber-500/rose-500) with:

```typescript
import { getMatchScoreColors, STATUS_COLORS } from "@/config/colors";

const matchColors = getMatchScoreColors(matchPct);
// matchColors.text, matchColors.bg, matchColors.bgSubtle, matchColors.border
```

Replace countdown colors with `getUrgencyColors()` import.

- [ ] **Step 2: CandidateDetailsModal — replace emerald/amber/rose status colors**

Replace skill match indicators:
```typescript
// text-emerald-400 (verified) → STATUS_COLORS.positive.text
// text-amber-400 (pending) → STATUS_COLORS.warning.text
// text-rose-400 (missing) → STATUS_COLORS.negative.text
```

- [ ] **Step 3: MyActiveEndorsements — replace lifecycle status colors**

Replace the `getEndorsementLifecycleInfo` color mappings:
```typescript
// hired/accepted → STATUS_COLORS.positive
// offered → STATUS_COLORS.info
// rejected/withdrawn → STATUS_COLORS.negative
// interviewing → STATUS_COLORS.info
```

Also replace all `bg-white/[0.02]` through `bg-white/[0.12]` with `bg-surface-1`, `bg-surface-2`, `bg-surface-3` classes (if using the new surface tokens), or with `bg-card/40`, `bg-muted` as appropriate.

- [ ] **Step 4: Verify endorsements page**

Run: `npm run dev`, navigate to `/expert/endorsements`.
Expected: Match scores, status badges, and lifecycle indicators use semantic colors.

- [ ] **Step 5: Commit**

```bash
git add src/components/endorsements/
git commit -m "refactor: endorsement components use centralized color tokens"
```

---

## Task 11: Migrate Dashboard Components

**Files:**
- Modify: `src/components/EnhancedExpertDashboard.tsx` (stat icon colors)
- Modify: `src/components/dashboard/StakingModal.tsx` (warning/error colors)
- Modify: `src/components/dashboard/ActionButtonPanel.tsx` (orange hardcoding)
- Modify: `src/components/dashboard/StatCard.tsx` (badge/trend colors)
- Modify: `src/components/dashboard/DashboardNotificationsFeed.tsx` (notification colors)

- [ ] **Step 1: EnhancedExpertDashboard — unify stat icon colors**

Replace the 4 different icon colors with:

```typescript
import { STAT_ICON } from "@/config/colors";

// All stat icons:
<div className={`${STAT_ICON.bg} ${STAT_ICON.text}`}>...</div>
```

- [ ] **Step 2: StakingModal — replace warning/error alert colors**

```typescript
// bg-yellow-500/[0.08] → STATUS_COLORS.warning.bgSubtle
// text-yellow-500 → STATUS_COLORS.warning.text
// bg-red-500/[0.08] → STATUS_COLORS.negative.bgSubtle
// text-red-400 → STATUS_COLORS.negative.text
```

- [ ] **Step 3: ActionButtonPanel — replace orange hardcoding**

```typescript
// from-orange-500/20 → bg-primary/20
// text-orange-600 dark:text-orange-400 → text-primary
// bg-green-500/20 text-green-700 → STATUS_COLORS.positive.bgSubtle + .text
// bg-yellow-500/20 text-yellow-700 → STATUS_COLORS.warning.bgSubtle + .text
```

- [ ] **Step 4: StatCard — replace badge/trend hardcoded colors**

```typescript
// badgeStyles.warning → STATUS_COLORS.warning.badge
// badgeStyles.success → STATUS_COLORS.positive.badge
// badgeStyles.info → STATUS_COLORS.info.badge
// trendStyles up → STATUS_COLORS.positive.text
// trendStyles down → STATUS_COLORS.negative.text
```

- [ ] **Step 5: DashboardNotificationsFeed — use updated notification helpers**

The notification feed already calls `getNotificationColor()` from notification-helpers.ts, which was migrated in Task 6. Verify it works, and replace any remaining inline colors.

- [ ] **Step 6: Verify dashboard**

Run: `npm run dev`, navigate to `/expert/dashboard`.
Expected: All stat cards, staking modal, and notifications use semantic tokens.

- [ ] **Step 7: Commit**

```bash
git add src/components/EnhancedExpertDashboard.tsx src/components/dashboard/
git commit -m "refactor: dashboard components use centralized color tokens"
```

---

## Task 12: Migrate Guild Components

**Files:**
- Modify: `src/components/GuildCard.tsx`
- Modify: `src/components/GuildDetailPage.tsx`
- Modify: `src/components/guild/GuildHeader.tsx`
- Modify: `src/components/guild/GuildStatsPanel.tsx`
- Modify: `src/components/guild/GuildApplicationsTab.tsx`
- Modify: `src/components/guild/GuildActivityTab.tsx`

- [ ] **Step 1: GuildCard — replace white/[0.0X] opacity hacks**

Replace `bg-[rgba(255,255,255,0.025)]` and `border-white/[0.04]` in stat boxes with `bg-muted/30` and `border-border/40` (theme-aware alternatives).

Replace `text-success` / `text-warning` (already theme-aware — keep these).

- [ ] **Step 2: GuildDetailPage — unify stat icon colors**

Replace the 4 different icon backgrounds (primary/10, warning/10, success/10, muted) with `STAT_ICON.bg` and `STAT_ICON.text` from colors.ts.

- [ ] **Step 3: GuildStatsPanel — same as GuildDetailPage**

Same icon color unification.

- [ ] **Step 4: GuildApplicationsTab — replace urgency/status colors**

```typescript
// text-red-400 (expired) → STATUS_COLORS.negative.text
// text-amber-400 (1-3 days) → STATUS_COLORS.warning.text
// text-green-400 (>3 days) → STATUS_COLORS.positive.text
// Status badge inline colors → use APPLICATION_STATUS_CONFIG or STATUS_COLORS
```

- [ ] **Step 5: GuildActivityTab — replace EVENT_CONFIG colors**

Replace the 12-color EVENT_CONFIG with:

```typescript
import { getActivityColor } from "@/config/colors";
```

Each event type maps to `getActivityColor(type).dot` and `.text`.

- [ ] **Step 6: Verify guild pages**

Run: `npm run dev`, navigate to `/expert/guilds` and `/expert/guild/[id]`.
Expected: All guild components render with unified colors.

- [ ] **Step 7: Commit**

```bash
git add src/components/GuildCard.tsx src/components/GuildDetailPage.tsx src/components/guild/
git commit -m "refactor: guild components use centralized color tokens"
```

---

## Task 13: Migrate Voting & Governance Components

**Files:**
- Modify: `src/components/expert/ApplicationDetailPage.tsx`
- Modify: `src/components/expert/VotingApplicationPage.tsx`
- Modify: `src/components/governance/GovernanceProposalCard.tsx`
- Modify: `src/components/governance/VotingPowerBar.tsx` (if exists)

- [ ] **Step 1: ApplicationDetailPage — replace vote colors**

```typescript
import { VOTE_COLORS, STATUS_COLORS } from "@/config/colors";

// Vote For button: bg-green-600 → VOTE_COLORS.for.button
// Vote Against button: bg-red-600 → VOTE_COLORS.against.button
// Progress bar for: bg-green-500 → VOTE_COLORS.for.bar
// Progress bar against: bg-red-500 → VOTE_COLORS.against.bar
// Abstain: bg-gray-400 → VOTE_COLORS.abstain.bar
// Status badges: bg-blue-500/10 etc → STATUS_COLORS.info.badge etc
```

- [ ] **Step 2: VotingApplicationPage — replace badge colors**

```typescript
// border-orange-500/40 text-orange-500 → STATUS_COLORS.warning.badge
// border-amber-500/40 text-amber-500 → STATUS_COLORS.warning.badge
// amber alert → STATUS_COLORS.warning.bgSubtle + .border + .text
```

- [ ] **Step 3: GovernanceProposalCard — replace type colors**

```typescript
import { getProposalTypeColors } from "@/config/colors";

// Remove local typeColors and typeBadgeColors objects
// Use getProposalTypeColors(type).bar and .badge
```

- [ ] **Step 4: Verify voting and governance pages**

Run: `npm run dev`, navigate to `/expert/voting` and `/expert/governance`.
Expected: Vote buttons, progress bars, and proposal cards use semantic tokens.

- [ ] **Step 5: Commit**

```bash
git add src/components/expert/ApplicationDetailPage.tsx src/components/expert/VotingApplicationPage.tsx src/components/governance/
git commit -m "refactor: voting and governance use centralized color tokens"
```

---

## Task 14: Migrate Profile, Reputation, Earnings Components

**Files:**
- Modify: `src/components/ExpertProfile.tsx`
- Modify: `src/components/expert/ReputationScoreCards.tsx`
- Modify: `src/components/expert/ReputationTimeline.tsx`
- Modify: `src/components/expert/EarningsSummaryCards.tsx`
- Modify: `src/components/expert/EarningsTimeline.tsx`
- Modify: `src/components/expert/RewardTierCard.tsx`
- Modify: `src/components/expert/ClaimRewardsCard.tsx`

- [ ] **Step 1: ExpertProfile — remove sky/violet one-offs**

```typescript
// bg-sky-500/10 text-sky-500 → STAT_ICON.bg + STAT_ICON.text
// bg-violet-500/10 text-violet-500 → STAT_ICON.bg + STAT_ICON.text
```

- [ ] **Step 2: ReputationScoreCards — unify per-card colors**

```typescript
// Primary card → STAT_ICON (already brand)
// Emerald gains → STATUS_COLORS.positive
// Red losses → STATUS_COLORS.negative
// Blue alignment → STATUS_COLORS.info
```

- [ ] **Step 3: ReputationTimeline — replace tierConfig colors**

```typescript
// aligned → STATUS_COLORS.positive
// mild_deviation → STATUS_COLORS.warning
// moderate_deviation → STATUS_COLORS.pending (brand orange)
// severe_deviation → STATUS_COLORS.negative
// vote_with_majority → STATUS_COLORS.info
```

- [ ] **Step 4: EarningsSummaryCards — unify stat icon colors**

```typescript
// All 4 stat cards: STAT_ICON.bg + STAT_ICON.text
// Tier colors: import from a shared tier mapping (see Step 5)
```

- [ ] **Step 5: RewardTierCard — centralize tier colors**

Add to `colors.ts`:

```typescript
export const REWARD_TIER_COLORS: Record<string, { bg: string; border: string; text: string; bar: string }> = {
  Foundation: {
    bg: STATUS_COLORS.neutral.bgSubtle,
    border: STATUS_COLORS.neutral.border,
    text: STATUS_COLORS.neutral.text,
    bar: STATUS_COLORS.neutral.bg,
  },
  Established: {
    bg: STATUS_COLORS.info.bgSubtle,
    border: STATUS_COLORS.info.border,
    text: STATUS_COLORS.info.text,
    bar: STATUS_COLORS.info.bg,
  },
  Authority: {
    bg: STATUS_COLORS.warning.bgSubtle,
    border: STATUS_COLORS.warning.border,
    text: STATUS_COLORS.warning.text,
    bar: STATUS_COLORS.warning.bg,
  },
};
```

- [ ] **Step 6: EarningsTimeline + ClaimRewardsCard — replace emerald hardcoding**

```typescript
// bg-emerald-500/10 → STATUS_COLORS.positive.bgSubtle
// text-emerald-500 → STATUS_COLORS.positive.text
// text-emerald-600 dark:text-emerald-400 → STATUS_COLORS.positive.text
```

- [ ] **Step 7: Verify profile and reputation pages**

Run: `npm run dev`, navigate to `/expert/profile`, `/expert/reputation`, `/expert/earnings`.
Expected: All pages use semantic colors from centralized tokens.

- [ ] **Step 8: Commit**

```bash
git add src/components/ExpertProfile.tsx src/components/expert/ src/config/colors.ts
git commit -m "refactor: profile, reputation, earnings use centralized color tokens"
```

---

## Task 15a: Migrate Remaining Expert Components

**Files:**
- Modify: `src/components/expert/ExpertApplicationFlow.tsx`
- Modify: `src/components/expert/NotificationsPage.tsx`
- Modify: `src/components/expert/InactivityWarningBanner.tsx`
- Modify: `src/components/expert/PromotionProgressCard.tsx`
- Modify: `src/components/expert/DeadlineWarningBanner.tsx`
- Modify: `src/components/expert/HowReputationWorks.tsx`
- Modify: `src/components/expert/VotingInterface.tsx`
- Modify: `src/components/expert/EndorsementDisputeDetailPage.tsx`
- Modify: `src/components/expert/applications/ViewReviewModal.tsx`
- Modify: `src/components/expert/applications/CandidateReviewCard.tsx`
- Modify: `src/components/expert/applications/ExpertReviewCard.tsx`
- Modify: `src/components/expert/applications/ProposalCard.tsx`

**Universal replacement rules** (apply to all sub-tasks 15a-15f):
```
bg-green-*/text-green-* (success/approved) → STATUS_COLORS.positive.*
bg-red-*/text-red-* (error/rejected) → STATUS_COLORS.negative.*
bg-amber-*/text-amber-* (warning/pending) → STATUS_COLORS.warning.*
bg-blue-*/text-blue-* (info/reviewing) → STATUS_COLORS.info.*
bg-purple-*/text-purple-* (info variant) → STATUS_COLORS.info.*
bg-indigo-*/text-indigo-* (info variant) → STATUS_COLORS.info.*
bg-emerald-*/text-emerald-* (success variant) → STATUS_COLORS.positive.*
bg-rose-*/text-rose-* (error variant) → STATUS_COLORS.negative.*
bg-yellow-*/text-yellow-* (warning variant) → STATUS_COLORS.warning.*
bg-cyan-*/text-cyan-* (recruit rank) → RANK_COLORS.recruit.*
bg-slate-*/text-slate-* (neutral) → STATUS_COLORS.neutral.*
bg-orange-*/text-orange-* → "text-primary" / "bg-primary/*"
bg-teal-*/text-teal-* → STATUS_COLORS.info.*
bg-violet-*/text-violet-* → STATUS_COLORS.info.* or STAT_ICON
bg-sky-*/text-sky-* → STATUS_COLORS.info.* or STAT_ICON
bg-gray-*/text-gray-* → STATUS_COLORS.neutral.* or "text-muted-foreground"
bg-white/[0.0X] (opacity hacks) → SURFACE.card / SURFACE.elevated / SURFACE.hover or bg-muted/X
```

**Exceptions to keep hardcoded** (apply to all sub-tasks):
- MetaMask SVG colors in `LoginPage.tsx` / `SignupPage.tsx` (brand logos)
- Coinbase Wallet SVG color (brand logo)
- LinkedIn button `bg-[#0A66C2]` (brand color)

- [ ] **Step 1: Migrate each file using the replacement rules above**
- [ ] **Step 2: Commit**

```bash
git add src/components/expert/
git commit -m "refactor: migrate remaining expert components to centralized colors"
```

---

## Task 15b: Migrate Guild Sub-Pages, Review, and Feed Components

**Files:**
- Modify: `src/components/guild/GuildMyStatsPage.tsx`
- Modify: `src/components/guild/GuildLeaderboardContent.tsx`
- Modify: `src/components/guild/GuildLeaderboardTab.tsx`
- Modify: `src/components/guild/GuildEarningsTab.tsx`
- Modify: `src/components/guild/GuildJobsTab.tsx`
- Modify: `src/components/guild/GuildCandidatesListTab.tsx`
- Modify: `src/components/guild/GuildMembershipApplicationsTab.tsx`
- Modify: `src/components/guild/GuildPublicOverviewTab.tsx`
- Modify: `src/components/guild/GuildFeedTab.tsx`
- Modify: `src/components/guild/GuildJobApplicationsTab.tsx`
- Modify: `src/components/guild/ReviewGuildApplicationModal.tsx`
- Modify: `src/components/guild/AppealSubmissionForm.tsx`
- Modify: `src/components/guild/AppealReviewPanel.tsx`
- Modify: `src/components/guild/AppealStatusBanner.tsx`
- Modify: `src/components/guild/review/DomainReviewStep.tsx`
- Modify: `src/components/guild/review/ReviewSuccessStep.tsx`
- Modify: `src/components/guild/review/ReviewProfileStep.tsx`
- Modify: `src/components/guild/review/GeneralReviewStep.tsx`
- Modify: `src/components/guild/review/StepIndicator.tsx`
- Modify: `src/components/guild/feed/PostCard.tsx`
- Modify: `src/components/guild/feed/PostTag.tsx`
- Modify: `src/components/guild/feed/AuthorBadge.tsx`
- Modify: `src/components/guild/feed/AcceptedAnswerBadge.tsx`
- Modify: `src/components/guild/feed/BookmarkButton.tsx`
- Modify: `src/components/guild/feed/PollDisplay.tsx`
- Modify: `src/components/guild/feed/ThreadedReplyList.tsx`

- [ ] **Step 1: Migrate each file using the universal replacement rules**
- [ ] **Step 2: Commit**

```bash
git add src/components/guild/
git commit -m "refactor: migrate guild sub-pages, review, and feed to centralized colors"
```

---

## Task 15c: Migrate Governance Components

**Files:**
- Modify: `src/components/governance/GovernanceProposalDetailPage.tsx`
- Modify: `src/components/governance/GovernanceVoteForm.tsx`
- Modify: `src/components/governance/VotingParametersSection.tsx`
- Modify: `src/components/governance/ProposalTypeSection.tsx`
- Modify: `src/components/governance/ProposalSubmitSection.tsx`
- Modify: `src/components/governance/VotingPowerBar.tsx`

- [ ] **Step 1: Migrate each file using the universal replacement rules**
- [ ] **Step 2: Commit**

```bash
git add src/components/governance/
git commit -m "refactor: migrate governance components to centralized colors"
```

---

## Task 15d: Migrate Endorsement and Transaction Components

**Files:**
- Modify: `src/components/endorsements/EndorsementHeader.tsx`
- Modify: `src/components/endorsements/EndorsementTransactionModal.tsx`
- Modify: `src/components/endorsements/WalletStatusBanner.tsx`
- Modify: `src/components/endorsements/RetentionCountdown.tsx`
- Modify: `src/components/endorsements/EndorsementModal.tsx`
- Modify: `src/components/endorsements/DisputeVoteForm.tsx`
- Modify: `src/components/endorsements/EndorsementsPage.tsx`
- Modify: `src/components/EndorsementBiddingUI.tsx`
- Modify: `src/components/WithdrawalManager.tsx`
- Modify: `src/components/CommitmentForm.tsx`

- [ ] **Step 1: Migrate each file using the universal replacement rules**
- [ ] **Step 2: Commit**

```bash
git add src/components/endorsements/ src/components/EndorsementBiddingUI.tsx src/components/WithdrawalManager.tsx src/components/CommitmentForm.tsx
git commit -m "refactor: migrate endorsement and transaction components to centralized colors"
```

---

## Task 15e: Migrate Dashboard, Company, and Candidate Components

**Files:**
- Modify: `src/components/dashboard/CompanyDashboardOverview.tsx`
- Modify: `src/components/dashboard/AnalyticsPage.tsx`
- Modify: `src/components/dashboard/JobAnalyticsPage.tsx`
- Modify: `src/components/dashboard/CandidateModalGuildReport.tsx`
- Modify: `src/components/dashboard/TransactionModal.tsx`
- Modify: `src/components/dashboard/UpcomingMeetings.tsx`
- Modify: `src/components/dashboard/ReviewQueue.tsx`
- Modify: `src/components/dashboard/RankProgress.tsx`
- Modify: `src/components/dashboard/GuildsSection.tsx`
- Modify: `src/components/dashboard/candidates/StatusActions.tsx`
- Modify: `src/components/dashboard/candidates/CandidateDetailPanel.tsx`
- Modify: `src/components/dashboard/candidates/CandidateJobGroup.tsx`
- Modify: `src/components/dashboard/candidates/CandidateStatsBar.tsx`
- Modify: `src/components/dashboard/candidates/PipelineStepper.tsx`
- Modify: `src/components/candidate/RejectionFeedbackCard.tsx`
- Modify: `src/components/candidate/CelebrationDialog.tsx`

- [ ] **Step 1: Migrate each file using the universal replacement rules**

Note: `CelebrationDialog.tsx` confetti colors can remain hardcoded (purely decorative, no semantic meaning).

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/ src/components/candidate/
git commit -m "refactor: migrate dashboard and candidate components to centralized colors"
```

---

## Task 15f: Migrate Shared UI Primitives and Lib Helpers

**Files:**
- Modify: `src/components/ui/alert.tsx`
- Modify: `src/components/ui/transaction-status.tsx`
- Modify: `src/components/ui/match-score-badge.tsx`
- Modify: `src/components/layout/SidebarNavItem.tsx`
- Modify: `src/components/layout/SidebarUserSection.tsx`
- Modify: `src/lib/guildHelpers.ts`
- Modify: `src/lib/activityHelpers.ts`

- [ ] **Step 1: alert.tsx — replace hardcoded success/warning colors with semantic tokens**

The success variant uses hardcoded green, warning uses hardcoded amber. Replace with `--positive` and `--warning` token references.

- [ ] **Step 2: transaction-status.tsx — replace 4 hardcoded status colors**

- [ ] **Step 3: match-score-badge.tsx — use `getMatchScoreColors()` import**

- [ ] **Step 4: SidebarNavItem — replace `bg-red-500` unread badge with `bg-destructive`**

- [ ] **Step 5: SidebarUserSection — replace `bg-green-500` online status with `bg-positive`**

- [ ] **Step 6: guildHelpers.ts — replace hardcoded emerald colors with `STATUS_COLORS.positive`**

- [ ] **Step 7: activityHelpers.ts — replace hardcoded slate colors with `STATUS_COLORS.neutral`**

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/ src/components/layout/ src/lib/
git commit -m "refactor: migrate shared UI primitives and lib helpers to centralized colors"
```

---

## Task 15g: Alias success → positive to prevent two greens coexisting

**Files:**
- Modify: `src/app/globals.css`

The existing `--success` token (hsl 158 64% 42%) and the new `--positive` (hsl 155 55% 38%) are slightly different greens for the same semantic concept. Align them.

- [ ] **Step 1: In `:root`, set `--success` to match `--positive`**

```css
--success: 155 55% 38%;  /* aligned with --positive */
```

- [ ] **Step 2: In `.dark`, set `--success` to match `--positive`**

```css
--success: 160 59% 52%;  /* aligned with --positive */
```

- [ ] **Step 3: Migrate remaining `text-success` / `bg-success` uses to `text-positive` / `bg-positive`**

Search for all `text-success` and `bg-success` usage in components (approximately 24 instances across 7 files). Replace with `text-positive` / `bg-positive` / `STATUS_COLORS.positive.*`.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "refactor: alias success → positive to prevent two competing green tokens"
```

---

## Task 16: Update Dark Mode Sidebar Styling

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx`
- Modify: `src/components/layout/SidebarNavItem.tsx`
- Modify: `src/components/layout/SidebarNavGroup.tsx`

- [ ] **Step 1: AppSidebar — add warm gradient background in dark mode**

Replace the sidebar container's dark mode background:
```typescript
// Before: bg-card dark:bg-card/80
// After:  bg-card dark:bg-gradient-to-b dark:from-[hsl(var(--surface-1))] dark:to-[hsl(var(--surface-0))]
```

Update the border to use a warm tint:
```typescript
// Before: dark:border-white/[0.06]
// After:  dark:border-primary/10
```

- [ ] **Step 2: SidebarNavItem — add active state accent bar**

For the active state, add a left border indicator:
```typescript
// Before: bg-primary/10 text-primary
// After:  bg-gradient-to-r from-primary/12 to-primary/[0.03] text-primary border-l-2 border-primary font-medium
```

For hover state, use warm tint:
```typescript
// Before: hover:bg-muted
// After:  hover:bg-primary/5
```

- [ ] **Step 3: SidebarNavGroup — warm tinted labels**

```typescript
// Before: text-muted-foreground/60
// After:  text-primary/35
```

- [ ] **Step 4: Verify sidebar appearance**

Run: `npm run dev`, toggle dark mode.
Expected: Sidebar has warm gradient bg, orange-tinted group labels, accent bar on active item.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/
git commit -m "feat: warm dark-mode sidebar with brand-tinted hierarchy"
```

---

## Task 17: Final Sweep — Verify Zero Hardcoded Colors

**Files:** All

- [ ] **Step 1: Run comprehensive color audit grep**

```bash
# Check for remaining hardcoded Tailwind color names
grep -rn "text-\(green\|red\|blue\|purple\|amber\|yellow\|cyan\|emerald\|rose\|indigo\|violet\|sky\|teal\|slate\|orange\)-" \
  src/components/ src/lib/ src/config/ \
  --include="*.tsx" --include="*.ts" \
  | grep -v "node_modules" \
  | grep -v "LoginPage\|SignupPage" \
  | grep -v "CelebrationDialog"
```

```bash
# Check for bg-* variants too
grep -rn "bg-\(green\|red\|blue\|purple\|amber\|yellow\|cyan\|emerald\|rose\|indigo\|violet\|sky\|teal\|slate\|orange\)-" \
  src/components/ src/lib/ src/config/ \
  --include="*.tsx" --include="*.ts" \
  | grep -v "node_modules" \
  | grep -v "LoginPage\|SignupPage" \
  | grep -v "CelebrationDialog"
```

```bash
# Check for bg-white/[0.0X] opacity hacks (should use SURFACE tokens now)
grep -rn "bg-white/\[0\." \
  src/components/ \
  --include="*.tsx" --include="*.ts" \
  | grep -v "node_modules"
```

```bash
# Check for hardcoded hex colors
grep -rn "#[0-9a-fA-F]\{6\}" \
  src/components/ src/lib/ src/config/ \
  --include="*.tsx" --include="*.ts" \
  | grep -v "node_modules" \
  | grep -v "LoginPage\|SignupPage"
```

Expected: Zero results (minus intentional exceptions: brand logos, CelebrationDialog confetti).

- [ ] **Step 2: Run `npm run build` to verify production build**

Expected: Build succeeds.

- [ ] **Step 3: Run `npm run lint` to catch any import/type errors**

Expected: No new lint errors (warnings for existing issues are OK).

- [ ] **Step 4: Manual visual QA checklist**

Spot-check these routes in both light and dark mode:
- `/expert/dashboard` — stat cards, notifications feed
- `/expert/endorsements` — application cards, match scores
- `/expert/guild-ranks` — rank progression timeline
- `/expert/leaderboard` — podium, table, trending
- `/expert/governance` — proposal cards, voting
- `/expert/profile` — stat icons, reputation ring
- `/expert/reputation` — score cards, timeline
- `/expert/earnings` — summary cards, tier card

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final color system audit — all hardcoded colors eliminated"
```

---

## Task 18: Update CLAUDE.md with Color System Rules

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add color system section to CLAUDE.md**

Add under the "Code Quality Rules" section:

```markdown
### Color System

All colors MUST come from the centralized token system. Never hardcode Tailwind color names (e.g., `text-green-500`, `bg-blue-100`) in components.

**Imports:**
- `import { STATUS_COLORS, RANK_COLORS, VOTE_COLORS, STAT_ICON } from "@/config/colors"`
- Status configs: `APPLICATION_STATUS_CONFIG`, `JOB_STATUS_CONFIG`, etc. from `@/config/constants`

**Semantic status:** Use `STATUS_COLORS.positive`, `.negative`, `.warning`, `.info`, `.neutral`, `.pending` — never raw Tailwind colors for status indicators.

**Rank colors:** Use `getRankColors(rank)` from `@/config/colors` — never define rank colors inline.

**Stat icons:** Use `STAT_ICON.bg` and `STAT_ICON.text` — all stat icons are brand orange, not per-metric rainbow.

**Notifications:** Use `getNotificationPriority()` → `NOTIFICATION_COLORS[priority]` — 3 tiers (urgent/action/positive), not per-type rainbow.

**Match scores:** Use `getMatchScoreColors(pct)` — returns positive/warning/negative.

**Vote colors:** Use `VOTE_COLORS.for`, `.against`, `.abstain`.

**Dark mode surfaces:** Use CSS custom properties (`bg-surface-0` through `bg-surface-3`) instead of `bg-white/[0.0X]` opacity hacks.

**Exceptions:** Brand logos (MetaMask, Coinbase, LinkedIn) may use hardcoded hex colors.
```

- [ ] **Step 2: Add to the Don't section**

```markdown
- Hardcode Tailwind color names (text-green-500, bg-blue-100, etc.) — use `STATUS_COLORS` / `RANK_COLORS` from `@/config/colors`
- Define local status color mappings — use shared configs from `@/config/constants`
- Use different colors for the same rank on different pages — use `getRankColors()` everywhere
- Use `bg-white/[0.0X]` for dark mode surfaces — use `bg-surface-*` tokens
- Assign different icon colors per metric — use `STAT_ICON` for all stat icons
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add color system rules to CLAUDE.md"
```
