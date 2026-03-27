# Swiss Design System Audit & Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Vetted's UI from decorative/glassmorphism aesthetic to Swiss-inspired design: restrained typography, flat surfaces, consistent grid, minimal decoration.

**Architecture:** Five sequential phases — each produces a working, testable UI. Phase 1 (type scale) is highest ROI. Phases can ship independently. All changes are CSS/component-level; no API or data model changes.

**Tech Stack:** Tailwind CSS v4 (inline @theme), React 19, Next.js 15, Lucide icons, Radix UI

---

## Current State Summary

| Metric | Current | Swiss Target |
|--------|---------|-------------|
| Unique text sizes | 32 (12 standard + 20 arbitrary px) | 6-7 |
| Arbitrary `text-[*px]` usages | 542 instances | 0 |
| Gradient instances | 170 across 75 files | 0-2 (brand accent only) |
| Backdrop blur instances | 199 across 90 files | 0 |
| Custom glow shadows | 88 instances | 0 |
| Decorative animations | 146 (excluding loading spinners) | 0 |
| `rounded-2xl` / `rounded-full` | 702 combined | `rounded-lg` max |
| Container max-width variants | 8+ distinct values | 3 |
| Gap scale variants | 28+ including arbitrary | 5 |
| Card opacity variants | 5 (40%, 50%, 60%, 70%, 80%) | 1 |
| `text-center` instances | 217 across 70+ files | ~30 (modals/CTAs only) |
| Total component files | 296 | Same count, cleaner internals |

---

## Phase 1: Typography Scale (Highest ROI)

### Problem

32 unique text sizes make the UI feel chaotic. The most common arbitrary sizes — `text-[10px]` (157x), `text-[11px]` (196x), `text-[13px]` (105x) — exist because Tailwind's default scale has gaps between `text-xs` (12px) and `text-sm` (14px). Swiss design demands 5-6 sizes used with discipline.

### Target Scale

| Token | Size | Tailwind Class | Replaces | Use Case |
|-------|------|---------------|----------|----------|
| `--text-display` | 48px | `text-5xl` | `text-[48px]`, `text-[56px]`, `text-[60px]`, `text-6xl` | Hero headlines only |
| `--text-h1` | 30px | `text-3xl` | `text-[28px]`, `text-[32px]`, `text-4xl` | Page titles |
| `--text-h2` | 24px | `text-2xl` | `text-[22px]`, `text-xl` (in heading contexts) | Section headings |
| `--text-h3` | 20px | `text-xl` | `text-[19px]`, `text-lg` (in heading contexts) | Card titles, subsections |
| `--text-body` | 14px | `text-sm` | `text-[13px]`, `text-[15px]`, `text-base` | Body text (primary) |
| `--text-caption` | 12px | `text-xs` | `text-[11px]`, `text-[12px]`, `text-[10px]` | Labels, metadata, badges |
| `--text-micro` | 10px | `text-[10px]` | `text-[8px]`, `text-[9px]` | Rare: chart axis labels only |

### Migration Map (arbitrary sizes)

| From | Count | To | Notes |
|------|-------|----|-------|
| `text-[10px]` | 157 | `text-xs` (12px) | Bump up — 10px is below readable threshold |
| `text-[11px]` | 196 | `text-xs` (12px) | 1px difference is imperceptible |
| `text-[13px]` | 105 | `text-sm` (14px) | 1px difference is imperceptible |
| `text-[9px]` | 25 | `text-xs` (12px) | 9px is inaccessible, bump up |
| `text-[15px]` | 20 | `text-sm` (14px) | Close enough, use standard |
| `text-[12px]` | 17 | `text-xs` (12px) | Already matches |
| `text-[28px]` | 7 | `text-3xl` (30px) | Close to h1 token |
| `text-[17px]` | 5 | `text-xl` (20px) | Snap to h3 token |
| `text-[32px]` | 2 | `text-3xl` (30px) | Snap to h1 token |
| `text-[19px]` | 2 | `text-xl` (20px) | Snap to h3 token |
| `text-[40px]`, `text-[42px]` | 2 | `text-5xl` (48px) | Snap to display token |
| `text-[48px]`, `text-[56px]`, `text-[60px]` | 3 | `text-5xl` (48px) | Snap to display token |
| `text-[22px]` | 1 | `text-2xl` (24px) | Snap to h2 token |
| `text-[8px]` | 1 | `text-xs` (12px) | 8px is unreadable |

### Standard size consolidation

| From | Context | To |
|------|---------|-----|
| `text-base` (16px) | Body text | Keep as `text-sm` (14px) in dense UI, `text-base` for long-form only |
| `text-lg` (18px) | Headings | `text-xl` (h3 token) |
| `text-lg` (18px) | Body emphasis | `text-sm font-semibold` |
| `text-4xl` | Page titles | `text-3xl` (h1 token) |
| `text-5xl`, `text-6xl` | Hero only | `text-5xl` (display token) |

### Font weight simplification

Current: 6 weights used (normal, medium, semibold, bold, extrabold, black)
Target: 3 weights

| Weight | Use |
|--------|-----|
| `font-normal` (400) | Body text |
| `font-medium` (500) | Labels, navigation, emphasized body |
| `font-bold` (700) | Headings (h1-h3), display |

Remove: `font-semibold` (merge to `font-medium` or `font-bold`), `font-extrabold`, `font-black`

### Letter-spacing & line-height rules

| Context | Tracking | Leading |
|---------|----------|---------|
| Display (48px) | `tracking-tight` | `leading-none` |
| H1 (30px) | `tracking-tight` | `leading-tight` |
| H2 (24px) | `tracking-tight` | `leading-tight` |
| H3 (20px) | normal | `leading-snug` |
| Body (14px) | normal | `leading-relaxed` |
| Caption (12px) | `tracking-wider` | normal |
| Uppercase labels | `tracking-widest` | normal |

### Text alignment rule

Default: left-aligned everywhere.
Exceptions (keep `text-center`):
- Modal titles and empty states
- Short CTAs inside centered card footers
- Toast/notification banners

Remove `text-center` from: hero headlines, section titles, page descriptions, card content, form labels, auth page copy.

### Files affected (high-level)

Every component file uses text sizes. The migration touches ~200+ files but is mechanical (find-replace with manual review). Priority order:

1. **Shared UI** (`src/components/ui/`) — 37 files, set the standard
2. **Dashboard** (`src/components/dashboard/`) — 28 files, most visible
3. **Expert** (`src/components/expert/`) — 44 files, complex
4. **Browse/Jobs** (`src/components/browse/`) — 8 files, public-facing
5. **Guild** (`src/components/guild/`) — 23 files
6. **Governance** (`src/components/governance/`) — 13 files
7. **All remaining** — auth, candidate, home, layout, etc.

---

## Phase 2: Strip Decoration

### Problem

The UI has 170 gradients, 199 backdrop-blur instances, 88 custom glow shadows, and 146 decorative animations. Swiss design is flat, clear, and content-focused. Every decorative effect is visual noise that competes with information.

### What to remove

#### 2a. Gradients (170 instances across 75 files)

**Remove entirely:**
- All `bg-gradient-to-*` on cards, sections, backgrounds
- All gradient text (`text-transparent bg-clip-text bg-gradient-to-*`)
- All gradient buttons → solid `bg-primary` instead
- All decorative gradient overlays on hover states

**Keep (2 exceptions):**
- Hero section may keep ONE subtle background gradient for brand identity
- Chart/data visualization gradients (functional, not decorative)

**Primary targets:**
- `src/components/browse/JobCard.tsx:39` — gradient hover overlay
- `src/components/browse/JobCard.tsx:154` — gradient apply button
- `src/components/governance/GovernancePage.tsx:146` — gradient CTA button
- `src/components/endorsements/EndorsementHeader.tsx:76` — gradient button
- `src/components/expert/ReputationScoreHero.tsx:62` — radial gradient background burst
- `src/components/home/HeroSection.tsx:73` — featured card gradient
- `src/components/leaderboard/LeaderboardPodium.tsx:368` — 3x podium gradients
- `src/components/ExpertProfile.tsx:112` — text gradient
- `src/components/GuildDetailPage.tsx` — guild hero gradients

#### 2b. Backdrop blur / glassmorphism (199 instances across 90 files)

**Remove entirely:**
- All `backdrop-blur-*` from cards, modals, sections
- All `bg-card/40`, `bg-card/50`, `bg-card/70`, `bg-card/80` opacity variations
- All `.glass-card`, `.glass-card-glow` utilities

**Replace with:**
- Cards: `bg-card border border-border` (solid, opaque)
- Modals: `bg-card` (solid)
- Sections: `bg-background` or `bg-muted` (solid)

**Card component change** (`src/components/ui/card.tsx`):
```
Before: bg-card/70 backdrop-blur-sm rounded-2xl shadow-card border border-border/60
After:  bg-card rounded-xl shadow-sm border border-border
```

#### 2c. Custom shadows & glows (88+ instances)

**Remove entirely:**
- All `shadow-[0_0_*px_*]` glow effects
- All `shadow-primary/*` colored shadows
- All rank glow effects in `src/config/colors.ts`
- All text-shadow inline styles

**Keep:**
- `shadow-sm` for card elevation (subtle, functional)
- `shadow-md` for hover state elevation (interactive feedback)
- `shadow-lg` for modals/dropdowns (z-axis hierarchy)

#### 2d. Decorative animations (146 instances)

**Remove entirely:**
- `animate-glow-pulse` (6 instances)
- `animate-float` (3 instances)
- `animate-sparkle`
- `animate-celebrate-*` (5+ instances)
- `animate-rep-*` (10+ instances — the entire ReputationScoreHero animated rings)
- `animate-shimmer-*`
- `animate-avatar-glow-pulse`
- `animate-fade-up` (21 instances) — replace with instant render
- `animate-page-enter` (51 instances) — replace with instant render

**Keep:**
- `animate-spin` — loading indicators (functional)
- `animate-pulse` — skeleton loading shimmer (functional)
- `animate-in` / `animate-modal-scale-in` — modal open/close (functional micro-interaction, 200ms max)

**Keyframes to delete from globals.css** (lines ~400-685):
- `@keyframes float`, `glow-pulse`, `celebration-*`, `rep-score-*`, `rank-badge-glow`, `shimmer-*`, `avatar-glow-pulse`, `sparkle`, `fade-up`, `page-enter`, `nav-progress`

#### 2e. Border radius reduction

**Global change:**
| From | To | Rationale |
|------|----|-----------|
| `rounded-2xl` (16px) | `rounded-xl` (12px) | Softer than sharp, still restrained |
| `rounded-full` on cards/containers | `rounded-xl` | No pill-shaped containers |
| `rounded-full` on avatars | Keep `rounded-full` | Circular avatars are standard |
| `rounded-full` on badges/pills | Keep `rounded-full` | Standard badge shape |
| `rounded-3xl` | `rounded-xl` | Standardize |
| `rounded-[10px]`, `rounded-[14px]`, `rounded-[20px]` | `rounded-xl` or `rounded-lg` | Eliminate arbitrary values |

**CSS variable change** in globals.css:
```css
--radius: 0.75rem; /* Keep current 12px — this is already reasonable */
```

### Components requiring redesign (not just find-replace)

| Component | Current | Swiss Target | Lines |
|-----------|---------|-------------|-------|
| `ReputationScoreHero.tsx` | 12 decorative layers, animated rings, radial burst | Simple large number + horizontal bar + 2 stats | 187 → ~60 |
| `LeaderboardPodium.tsx` | Gradient platforms, glow rings, crown icon | Simple numbered list with bold rank numbers | 292 → ~80 |
| `HeroSection.tsx` | Animated glow orbs, floating cards, centered text | Left-aligned headline + right-aligned stat block | 150 → ~80 |
| `GuildDetailPage.tsx` hero | Floating stat pills, text-shadow, glow orbs | Clean header with guild name + stats row | 443 (hero portion ~80 lines) → ~40 |
| `CelebrationDialog.tsx` | Confetti animation, glow effects | Simple success message with checkmark | 152 → ~40 |

---

## Phase 3: Layout Grid System

### Problem

8+ different `max-w-*` values, 28+ gap patterns, inconsistent card padding (p-5 vs p-6), no documented grid. Content floats at different widths on different pages.

### Target Grid

#### Container widths (3 tiers)

| Token | Value | Tailwind | Use |
|-------|-------|---------|-----|
| Narrow | 768px | `max-w-3xl` | Forms, auth, single-column content |
| Standard | 1152px | `max-w-6xl` | Most pages (dashboards, browse, governance) |
| Wide | 1280px | `max-w-7xl` | Data-heavy pages (candidates table, analytics) |

**Migration map:**

| From | To | Files affected |
|------|----|---------------|
| `max-w-[1120px]` | `max-w-6xl` | HomePage, HeroSection, StatsBar, JobBrowser |
| `max-w-[1200px]` | `max-w-6xl` | GuildDetailView, GovernancePage, CandidateDashboard |
| `max-w-[1240px]` | `max-w-6xl` | JobDetailView |
| `max-w-[1440px]` | `max-w-7xl` | CompanyDashboardOverview |
| `max-w-5xl` | `max-w-6xl` | CandidateDashboard, GuildRanksProgression, SettingsPage |
| `max-w-4xl` | `max-w-3xl` or `max-w-6xl` | GuildApplicationFlow, ExpertProfile (context-dependent) |
| `max-w-[920px]` | `max-w-6xl` | GuildsListingPage |
| `max-w-[860px]` | `max-w-6xl` | NotificationsPage |

#### Responsive padding (standardize)

All page containers use: `px-4 sm:px-6 lg:px-8`

Replace all `px-6` (non-responsive) with `px-4 sm:px-6 lg:px-8`.

#### Gap scale (5 tiers)

| Token | Value | Tailwind | Use |
|-------|-------|---------|-----|
| Tight | 8px | `gap-2` | Inside cards, between label+value |
| Compact | 12px | `gap-3` | Between list items, inside grids |
| Default | 16px | `gap-4` | Between cards in grids, between sections |
| Loose | 24px | `gap-6` | Between major page sections |
| Spacious | 32px | `gap-8` | Hero spacing, page header to content |

**Remove:** `gap-0.5`, `gap-1`, `gap-1.5`, `gap-2.5`, `gap-3.5`, `gap-5`, `gap-[3px]`, `gap-[5px]`, `gap-[7px]`, `gap-12`

**Snap rules:**
- `gap-0.5` → `gap-2` (tight)
- `gap-1` → `gap-2` (tight)
- `gap-1.5` → `gap-2` (tight)
- `gap-2.5` → `gap-3` (compact)
- `gap-3.5` → `gap-4` (default)
- `gap-5` → `gap-4` or `gap-6` (context-dependent)
- `gap-12` → `gap-8` (spacious)

#### Card padding (standardize)

All cards: `p-6` (24px).
Compact card variant (stat cards, list items): `p-4` (16px).

Remove: `p-5`, `p-7`, `p-3` on cards.

#### Card opacity (standardize)

All cards: `bg-card` (100% opaque, no transparency).

Remove: `bg-card/40`, `bg-card/50`, `bg-card/60`, `bg-card/70`, `bg-card/80`.

---

## Phase 4: Component Consolidation

### Problem

Same patterns reimplemented 5-10x across the codebase. Buttons bypass the shared component, status badges are defined inline, page headers are ad-hoc, dividers are hardcoded.

### 4a. Force all buttons through `Button` component

**Current:** 60%+ of primary action buttons are inline-styled with gradients.

**Migration:**
- All gradient buttons → `<Button>` with `variant="default"`
- All ghost/outline inline buttons → `<Button variant="ghost">` or `<Button variant="outline">`
- Remove `hover:scale-[1.02]` from all buttons (Swiss = no playful scaling)
- Remove all `shadow-primary/*` from buttons

**Files with inline gradient buttons to fix:**
- `src/components/browse/JobCard.tsx:154`
- `src/components/governance/GovernancePage.tsx:146-149`
- `src/components/endorsements/EndorsementHeader.tsx:76`
- `src/components/expert/ReputationScoreHero.tsx`
- `src/components/home/HeroSection.tsx`
- `src/components/GuildDetailPage.tsx`
- Plus ~30 more files

### 4b. Create `StatusBadge` component

**Current:** 6+ files define the same pattern: colored dot + bg + text.

**New component** (`src/components/ui/status-badge.tsx`):
```tsx
interface StatusBadgeProps {
  status: "active" | "pending" | "completed" | "rejected" | "expired";
  label: string;
  pulse?: boolean; // for "active" — live indicator
}
```

Uses `STATUS_COLORS` from `@/config/colors`. Replaces inline patterns in:
- `GovernanceProposalCard.tsx:61-71`
- `ApplicationCard.tsx:78-81`
- `JobCard.tsx:87`
- `StatusActions.tsx`
- `ApplicationPendingPage.tsx`
- `CandidateDashboard.tsx`

### 4c. Create `PageHeader` component

**Current:** Every page invents its own header layout.

**New component** (`src/components/ui/page-header.tsx`):
```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: { label: string; variant?: string };
  actions?: ReactNode;
  backHref?: string;
}
```

Standardize: left-aligned title (h1 token), description in muted text, optional back link, optional action buttons right-aligned.

Replaces custom headers in:
- `GovernancePage.tsx:99-142`
- `EarningsPage.tsx` header section
- `LeaderboardPage.tsx` header section
- `BrowsePage.tsx` header section
- `EndorsementsPage.tsx` header section
- `ReputationPage.tsx` header section

### 4d. Create `Divider` component

**Current:** `<div className="w-px h-10 bg-border" />` hardcoded in 10+ files.

**New component** (`src/components/ui/divider.tsx`):
```tsx
interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}
```

### 4e. Standardize SectionCard adoption

**Current:** `SectionCard` exists at `src/components/ui/section-card.tsx` but many pages use custom divs.

**Migration:** Replace custom card-with-header patterns in:
- `GuildPublicOverviewTab.tsx:49`
- `GovernanceStats.tsx:180-202` (also has local StatCard redefinition — delete it)
- `LeaderboardPage.tsx` sections

### 4f. Unify `StatCard`

`GovernanceStats.tsx` defines a local `StatCard` function. Delete it, import from `@/components/dashboard/StatCard`.

---

## Phase 5: UX Polish

### 5a. Dashboard progressive disclosure

**Problem:** CompanyDashboardOverview (674 lines) renders everything at once — 6 stat cards + pipeline + applications + activity + meetings.

**Solution:** Group into collapsible sections or tabbed interface:
- Tab 1: Overview (stats + pipeline summary)
- Tab 2: Applications (full pipeline + recent applications)
- Tab 3: Activity (activity feed + meetings)

Same pattern for `CandidateDashboard.tsx` (732 lines).

### 5b. Mobile responsive dashboard grids

**Problem:** StatCard grids don't collapse on mobile. `grid-cols-2 md:grid-cols-4` forces 2 cramped cards on small screens.

**Fix:**
```
Before: grid grid-cols-2 md:grid-cols-4 gap-3
After:  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4
```

Apply to all dashboard stat grids.

### 5c. Form field validation UX

**Problem:** No visible inline validation. Errors shown only in top-level banner.

**Fix:** The `Input` component already supports `error` prop. Ensure all form components pass field-level errors, not just form-level.

### 5d. Accessibility pass

**Problem:** Only 61 ARIA attributes across 50+ components.

**Priority fixes:**
- Add `aria-label` to all icon-only buttons (sidebar collapse, notification bell, close buttons)
- Ensure all form inputs have associated `<label>` elements
- Add `prefers-reduced-motion` media query to remaining animations
- Add text labels alongside color-only status indicators

---

## Phase Dependency & Priority

```
Phase 1 (Typography)     ─── can start immediately, highest visual impact
  │
Phase 2 (Decoration)     ─── can start in parallel with Phase 1
  │
Phase 3 (Layout Grid)    ─── depends on Phase 2 (card changes)
  │
Phase 4 (Components)     ─── depends on Phase 1 + 2 (uses new type scale + flat surfaces)
  │
Phase 5 (UX Polish)      ─── depends on Phase 3 + 4 (layout must be stable)
```

**Phases 1 and 2 can run in parallel.** Phase 3 builds on both. Phase 4 and 5 are sequential.

### Estimated scope per phase

| Phase | Files Touched | Nature |
|-------|--------------|--------|
| 1. Typography | ~200 files | Mechanical find-replace + review |
| 2. Decoration | ~120 files | Remove code + 5 component redesigns |
| 3. Layout Grid | ~60 files | Systematic value replacement |
| 4. Components | ~40 files + 3 new files | New components + adoption |
| 5. UX Polish | ~15 files | Feature work |

---

## Verification Strategy

After each phase:

1. `npm run build` — must succeed with no type errors
2. `npm run lint` — must pass
3. Visual check of every major page in both light and dark mode:
   - HomePage, BrowsePage, JobDetailView
   - ExpertDashboard, CompanyDashboard, CandidateDashboard
   - GovernancePage, GuildDetailPage, LeaderboardPage
   - LoginPage, SignupPage
   - EarningsPage, ReputationPage, EndorsementsPage
4. Mobile viewport check (375px width) for dashboard pages
5. No regressions in loading states, error states, empty states

---

## What This Plan Does NOT Change

- Backend API contracts
- Data fetching patterns (`useFetch`, `useApi`)
- Auth flow or wallet integration
- Route structure
- Business logic
- Test files (no existing tests to break)
- Color token values themselves (hue/saturation) — only how they're applied
