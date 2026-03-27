# Swiss Design System — Unified Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Vetted from decorative glassmorphism to Swiss-inspired design: disciplined typography, flat opaque surfaces, consistent grid, purposeful motion. Every visual choice serves information hierarchy.

**Architecture:** Six phases — each produces a working, testable UI. Phases 1-2 run in parallel (typography + surfaces). Phase 3 (motion foundation) replaces CSS animations with Framer Motion. Phase 4 (layout grid) standardizes spacing. Phase 5 (component consolidation) eliminates duplication. Phase 6 (UX polish) adds progressive disclosure and accessibility.

**Tech Stack:** Tailwind CSS v4 (inline @theme), React 19, Next.js 15, Lucide icons, Radix UI, Framer Motion (new dependency)

---

## Current State

| Metric | Current | Target |
|--------|---------|--------|
| Unique text sizes | 32 (12 standard + 20 arbitrary px) | 7 |
| Arbitrary `text-[*px]` usages | 542 instances across ~200 files | 0 |
| Font weights in use | 6 (normal, medium, semibold, bold, extrabold, black) | 3 |
| Gradient instances | 170 across 75 files | 0 (solid colors only) |
| Backdrop blur instances | 199 across 90 files | 0 (opaque surfaces) |
| Custom glow shadows | 88 instances | 0 |
| Card opacity variants | 5 (40%, 50%, 60%, 70%, 80%) | 1 (100% opaque) |
| CSS animation keyframes | 37+ custom, 8 different durations | 5 ambient CSS + Framer Motion |
| Unanimated conditional renders | 1000+ `{condition && <div>}` | 0 (every state change transitions) |
| Animation durations in use | 8 random values | 3 tokens (150/250/400ms) |
| Spring presets | 0 (all CSS) | 4 named springs |
| `rounded-2xl` / `rounded-full` | 702 combined | `rounded-xl` max on containers |
| Container max-width variants | 8+ distinct values | 3 |
| Gap scale variants | 28+ including arbitrary | 5 |
| `text-center` instances | 217 across 70+ files | ~30 (modals/CTAs only) |
| Inline button reimplementations | 60%+ of CTAs bypass Button component | 0 |
| Status badge reimplementations | 6+ inline patterns | 1 shared component |
| Page header patterns | Every page different | 1 shared component |
| ARIA attributes | 61 across 50+ components | Comprehensive coverage |

---

## Phase 1: Typography Scale

**Can start immediately. Highest visual impact. Parallelizes with Phase 2.**

### Problem

32 unique text sizes. The most used arbitrary sizes — `text-[10px]` (157x), `text-[11px]` (196x), `text-[13px]` (105x) — fill gaps in Tailwind's default scale. Swiss design demands 5-7 sizes used with discipline.

### Target Scale

| Token | Size | Tailwind Class | Replaces | Use Case |
|-------|------|---------------|----------|----------|
| Display | 48px | `text-5xl` | `text-[48px]`, `text-[56px]`, `text-[60px]`, `text-6xl` | Hero headlines only |
| H1 | 30px | `text-3xl` | `text-[28px]`, `text-[32px]`, `text-4xl` | Page titles |
| H2 | 24px | `text-2xl` | `text-[22px]`, `text-xl` (in heading contexts) | Section headings |
| H3 | 20px | `text-xl` | `text-[19px]`, `text-lg` (in heading contexts) | Card titles, subsections |
| Body | 14px | `text-sm` | `text-[13px]`, `text-[15px]`, `text-base` | Body text (primary) |
| Caption | 12px | `text-xs` | `text-[11px]`, `text-[12px]`, `text-[10px]` | Labels, metadata, badges |
| Micro | 10px | `text-[10px]` | `text-[8px]`, `text-[9px]` | Rare: chart axis labels only |

### Arbitrary Size Migration

| From | Count | To | Rationale |
|------|-------|----|-----------|
| `text-[10px]` | 157 | `text-xs` (12px) | 10px is below readable threshold |
| `text-[11px]` | 196 | `text-xs` (12px) | 1px delta imperceptible |
| `text-[13px]` | 105 | `text-sm` (14px) | 1px delta imperceptible |
| `text-[9px]` | 25 | `text-xs` (12px) | 9px is inaccessible |
| `text-[15px]` | 20 | `text-sm` (14px) | Use standard |
| `text-[12px]` | 17 | `text-xs` (12px) | Already matches |
| `text-[28px]` | 7 | `text-3xl` (30px) | Snap to H1 |
| `text-[17px]` | 5 | `text-xl` (20px) | Snap to H3 |
| `text-[32px]` | 2 | `text-3xl` (30px) | Snap to H1 |
| `text-[19px]` | 2 | `text-xl` (20px) | Snap to H3 |
| `text-[40px]`, `text-[42px]` | 2 | `text-5xl` (48px) | Snap to Display |
| `text-[48px]`, `text-[56px]`, `text-[60px]` | 3 | `text-5xl` (48px) | Snap to Display |
| `text-[22px]` | 1 | `text-2xl` (24px) | Snap to H2 |
| `text-[8px]` | 1 | `text-xs` (12px) | 8px unreadable |

### Standard Size Consolidation

| From | Context | To |
|------|---------|-----|
| `text-base` (16px) | Body text | `text-sm` (14px) in dense UI, `text-base` for long-form only |
| `text-lg` (18px) | Headings | `text-xl` (H3) |
| `text-lg` (18px) | Body emphasis | `text-sm font-medium` |
| `text-4xl` | Page titles | `text-3xl` (H1) |
| `text-5xl`, `text-6xl` | Hero only | `text-5xl` (Display) |

### Font Weight Simplification

| Weight | Use |
|--------|-----|
| `font-normal` (400) | Body text, descriptions |
| `font-medium` (500) | Labels, navigation, emphasized body, captions |
| `font-bold` (700) | All headings (Display through H3) |

Remove: `font-semibold` → merge to `font-medium` or `font-bold` by context. Remove `font-extrabold`, `font-black`.

### Typography Rules

| Context | Size | Weight | Tracking | Leading |
|---------|------|--------|----------|---------|
| Display | `text-5xl` | `font-bold` | `tracking-tight` | `leading-none` |
| H1 | `text-3xl` | `font-bold` | `tracking-tight` | `leading-tight` |
| H2 | `text-2xl` | `font-bold` | `tracking-tight` | `leading-tight` |
| H3 | `text-xl` | `font-bold` | normal | `leading-snug` |
| Body | `text-sm` | `font-normal` | normal | `leading-relaxed` |
| Caption | `text-xs` | `font-medium` | `tracking-wider` | normal |
| Uppercase label | `text-xs` | `font-medium` | `tracking-widest` | normal |

### Text Alignment

**Default:** Left-aligned everywhere.

**Keep `text-center` only for:**
- Modal titles and empty state components
- Short CTAs inside centered card footers
- Toast/notification banners

**Remove `text-center` from:** Hero headlines, section titles, page descriptions, card body content, form labels, auth page copy.

### Migration Priority

| Priority | Directory | Files | Nature |
|----------|-----------|-------|--------|
| 1 | `src/components/ui/` | 37 | Set the standard — every other file inherits |
| 2 | `src/components/dashboard/` | 28 | Most visible to users |
| 3 | `src/components/expert/` | 44 | Complex, many arbitrary sizes |
| 4 | `src/components/browse/` | 8 | Public-facing, first impression |
| 5 | `src/components/guild/` | 23 | Guild pages |
| 6 | `src/components/governance/` | 13 | Governance pages |
| 7 | Remaining | ~50 | Auth, candidate, home, layout, etc. |

---

## Phase 2: Flat Surfaces

**Can start immediately. Parallelizes with Phase 1.**

### Problem

The glassmorphism aesthetic (backdrop blur, semi-transparent cards, glow shadows, decorative gradients) fights Swiss principles. Flat, opaque surfaces let content speak.

### 2a. Remove Gradients (170 instances, 75 files)

**Remove all:**
- `bg-gradient-to-*` on cards, sections, backgrounds, buttons
- `text-transparent bg-clip-text bg-gradient-to-*` (gradient text)
- Decorative gradient overlays on hover states

**Replace with:**
- Gradient buttons → solid `bg-primary text-primary-foreground`
- Gradient text → solid `text-foreground` or `text-primary`
- Gradient backgrounds → solid `bg-background` or `bg-muted`

**Keep only:** Chart/data visualization gradients (functional, not decorative).

**Primary targets:**
| File | Line | What |
|------|------|------|
| `browse/JobCard.tsx` | 39 | Hover gradient overlay |
| `browse/JobCard.tsx` | 154 | Gradient apply button |
| `governance/GovernancePage.tsx` | 146-149 | Gradient CTA |
| `endorsements/EndorsementHeader.tsx` | 76 | Gradient button |
| `expert/ReputationScoreHero.tsx` | 62 | Radial gradient burst |
| `home/HeroSection.tsx` | 73 | Featured card gradient |
| `leaderboard/LeaderboardPodium.tsx` | 368 | 3x podium gradients |
| `ExpertProfile.tsx` | 112 | Text gradient |
| `GuildDetailPage.tsx` | hero section | Guild hero gradients |

### 2b. Remove Glassmorphism (199 blur instances, 90 files)

**Remove all:**
- `backdrop-blur-*` (sm, md, lg, xl, 2xl, 3xl)
- `bg-card/40`, `bg-card/50`, `bg-card/70`, `bg-card/80` → unified `bg-card`
- `.glass-card`, `.glass-card-glow` utility classes

**Card component change** (`src/components/ui/card.tsx`):
```
Before: bg-card/70 backdrop-blur-sm rounded-2xl shadow-card border border-border/60
         dark:bg-card/40 dark:backdrop-blur-xl dark:border-white/[0.06]
After:  bg-card rounded-xl shadow-sm border border-border
```

**Modal change** (`src/components/ui/modal.tsx`):
```
Before: bg-card/70 backdrop-blur-sm rounded-2xl
         dark:bg-card/40 dark:backdrop-blur-xl dark:border-white/[0.06]
After:  bg-card rounded-xl shadow-lg border border-border
```

### 2c. Remove Glow Shadows (88+ instances)

**Remove all:**
- `shadow-[0_0_*px_*]` glow patterns
- `shadow-primary/*` colored shadows
- Rank glow effects in `src/config/colors.ts` (the `glow` property on each rank)
- All inline `style={{ textShadow: ... }}` (GuildDetailPage hero, etc.)

**Shadow vocabulary (keep these 3 only):**
| Token | Class | Use |
|-------|-------|-----|
| Subtle | `shadow-sm` | Default card elevation |
| Medium | `shadow-md` | Hover state elevation, dropdowns |
| Strong | `shadow-lg` | Modals, popovers |

### 2d. Border Radius Reduction

| From | To | Scope |
|------|----|-------|
| `rounded-2xl` (231 instances) | `rounded-xl` | All cards, containers, modals |
| `rounded-3xl` (4 instances) | `rounded-xl` | Standardize |
| `rounded-[10px]` (34 instances) | `rounded-lg` | Custom values → standard |
| `rounded-[14px]` (23 instances) | `rounded-xl` | Custom values → standard |
| `rounded-[20px]` (16 instances) | `rounded-xl` | Custom values → standard |
| `rounded-full` on containers | `rounded-xl` | No pill-shaped containers |
| `rounded-full` on avatars | **Keep** | Circular avatars are standard |
| `rounded-full` on badges/pills | **Keep** | Standard badge shape |

### 2e. Components Requiring Full Redesign

These can't be migrated with find-replace — they need new markup:

| Component | Current | Swiss Target |
|-----------|---------|-------------|
| `ReputationScoreHero.tsx` (187 lines) | 12 decorative layers: radial burst, 5 concentric animated rings, sweeping SVG arc, tick marks, animated counter | Large score number + horizontal progress bar + 2 stat captions. ~60 lines. |
| `LeaderboardPodium.tsx` (292 lines) | Gradient platforms, glow rings around avatars, crown icon, 3 gradient backgrounds per rank | Clean numbered list: rank number (bold) + name + score. No podium metaphor. ~80 lines. |
| `HeroSection.tsx` (150 lines) | 2 animated glow orbs, 3 floating value cards with glows, centered text, pulsing badge | Left-aligned headline + subtitle + CTA button. Stats in a row below. ~80 lines. |
| `GuildDetailPage.tsx` hero (~80 lines) | Floating stat pills, `textShadow` glow, 3 orb elements, centered layout | Left-aligned guild name + clean stats row + description. ~40 lines. |
| `CelebrationDialog.tsx` (152 lines) | CSS confetti animation, glow effects, celebrate-scale-in | Simple modal with checkmark icon + success message. Motion added in Phase 3. ~40 lines. |

---

## Phase 3: Motion Foundation

**Depends on Phase 2 (surfaces must be flat before adding purposeful motion).**

### Problem

Current animations are inconsistent (37+ keyframes, 8 durations) and decorative (glow-pulse, sparkle, float). Meanwhile, 1000+ conditional renders "pop" with no transition at all. Swiss motion serves information hierarchy: primary content enters first, transitions confirm actions, nothing competes with content.

### New Dependency

```bash
npm install framer-motion
```

~33KB gzipped. Tree-shakeable. Works with Next.js 15 + React 19.

### Architecture

```
Layer 3: Cinematic Sequences (10 journey moments)
  src/components/sequences/

Layer 2: Enhanced UI Primitives (motion baked in, zero adoption cost)
  src/components/ui/ (existing files, enhanced)

Layer 1: Motion Foundation (provider, presets, primitives)
  src/lib/motion/
```

### Layer 1: Foundation (`src/lib/motion/`)

#### MotionProvider

Wraps the app inside the existing provider stack, after `ThemeProvider`:

```
WagmiProvider → QueryClientProvider → RainbowKitProvider
  → ThemeProvider → MotionProvider → AuthProvider + ErrorBoundary
```

Responsibilities:
- Detect `prefers-reduced-motion` via context
- Expose global duration scale (1.0 default, 0 for reduced motion)
- Expose spring presets to all motion components
- No visual output — context-only

#### Spring Presets (`presets.ts`)

4 named springs. Components reference by name — never define inline spring configs.

| Name | Use Case | Config |
|------|----------|--------|
| `snappy` | Buttons, toggles, small UI feedback | `{ stiffness: 500, damping: 30, mass: 0.5 }` |
| `smooth` | Page transitions, content fades, tab switches | `{ stiffness: 200, damping: 25, mass: 0.8 }` |
| `bouncy` | Celebrations, badges appearing, rank-ups | `{ stiffness: 300, damping: 15, mass: 0.8 }` |
| `heavy` | Modals, staking confirmations, high-stakes actions | `{ stiffness: 150, damping: 20, mass: 1.2 }` |

#### Duration Tokens (`presets.ts`)

3 values for non-spring animations (opacity fades, color transitions):

| Token | Value | Use |
|-------|-------|-----|
| `fast` | 150ms | Hover states, button feedback, micro-interactions |
| `normal` | 250ms | Content fades, tab switches, alerts appearing |
| `slow` | 400ms | Page transitions, modal entrance, expand/collapse |

#### Motion Primitives

| Component | Props | Purpose |
|-----------|-------|---------|
| `<FadeIn>` | `delay`, `duration`, `direction` (up/down/none), `distance` (8px default) | Default entrance for any content |
| `<SlideIn>` | `from` (left/right/top/bottom), `distance`, `delay`, `spring` | Panels, sidebars, directional content |
| `<Expand>` | `isOpen`, `duration` | Animated height 0→auto. **Biggest win** — converts 1000+ instant show/hide to smooth expand/collapse |
| `<Stagger>` | `staggerDelay` (60ms default), `spring` | Lists, grids, card groups. Children enter in sequence |
| `<Reveal>` | `threshold` (0.2), `once` (true), plus FadeIn props | Scroll-triggered entrance for below-fold content |
| `<Counter>` | `value`, `format` (number/currency/percent), `spring` | Animated number transitions for stats, balances, votes |

#### Page Transitions (`PageTransition.tsx`)

Applied via `template.tsx` (Next.js re-renders template on navigation, unlike layout):
- Default: Crossfade (opacity out 150ms → in 250ms)
- Depth changes (list → detail): Content slides from right. Back = slides from left.
- Route-depth heuristic: more path segments = deeper.

### Layer 2: Enhanced UI Primitives

Motion baked into existing `src/components/ui/` components. Consumers don't change their code.

| Component | Enhancement |
|-----------|-------------|
| **Button** | `whileTap={{ scale: 0.97 }}`, `whileHover={{ scale: 1.02 }}`, loading crossfade. Spring: `snappy`. |
| **Modal** | Migrate from CSS transitions to Framer springs. Backdrop: `smooth` spring. Content: `heavy` spring (scale 0.95→1). Exit via `AnimatePresence`. |
| **Tabs** | Tab content wraps in `AnimatePresence`. Old content fades out (100ms), new slides in from tab direction (200ms). Indicator bar uses `layout` animation. Spring: `smooth`. |
| **Alert** | `initial={{ opacity: 0, y: -8 }}` → `animate={{ opacity: 1, y: 0 }}`. Duration: `normal`. Dismissible via `AnimatePresence`. |
| **Badge** | `initial={{ scale: 0.8, opacity: 0 }}` → `animate={{ scale: 1, opacity: 1 }}`. Spring: `bouncy`. |
| **Progress** | Animate `scaleX` with `smooth` spring. Number labels use `<Counter>`. |
| **Skeleton → ContentLoader** (new) | Shows skeleton while loading, crossfades to real content. `AnimatePresence mode="wait"`. Replaces `{isLoading ? <Skeleton /> : <Content />}`. |
| **Accordion** (new) | Built on `<Expand>`. Chevron rotates on open/close. Replaces manual `{expanded && <div>}` patterns. |

### Layer 3: Cinematic Sequences

Self-contained in `src/components/sequences/`. Triggered by parent components at specific journey moments. Intensity scales with emotional weight.

#### Act 1 — Arrival (Gentle, 2/4 intensity)

**1. Landing Page Hero** (`LandingHeroSequence.tsx`)
- Stagger: headline (0ms) → subtitle (80ms) → CTA (160ms) → stats (240ms) → job cards (320ms+)
- Stat numbers tick up from 0 via `<Counter>`
- Spring: `smooth`

#### Act 2 — Commitment (Satisfying, 2-3/4 intensity)

**2. Candidate Submits Application** (`ApplicationSubmitSequence.tsx`)
- Form fields compress (scale 95%) and fade
- Success card morphs in from form position via `layout` animation
- Confirmation text staggers in
- Spring: `smooth`

**3. Company Posts Job** (`JobPostSequence.tsx`)
- Job card assembles from form data with staggered field entrance
- "Live" badge pops with `bouncy` spring
- Ambient ring pulse (CSS keyframe)

**4. Expert Joins Guild** (`GuildJoinSequence.tsx`)
- Guild emblem scales up with `bouncy` overshoot
- Particles converge toward profile area
- Rank badge materializes with fade + scale
- Welcome text staggers word by word

#### Act 3 — Stakes (Cinematic, 3-4/4 intensity)

**5. Staking Reputation** (`StakingSequence.tsx`)
- Balance counter ticks down via `<Counter>`
- Token particles stream from balance → lock icon
- Lock snaps shut (`heavy` spring with overshoot)
- Endorsement card fades in below

**6. Casting Governance Vote** (`GovernanceVoteSequence.tsx`)
- Vote button depresses (`heavy` spring)
- Voting power bar stretches toward chosen side (`smooth`)
- Vote count ticks up via `<Counter>`
- "Vote locked" seal stamps in (`bouncy` with scale overshoot)

**7. Endorsement Outcome Revealed** (`EndorsementRevealSequence.tsx`)
- Sealed card wobbles (3 rotate oscillation cycles)
- 800ms dramatic pause (tension)
- Card flips with 3D perspective (rotateY 0→180deg)
- Result color floods card (green/red wash)
- Reputation delta springs to final value
- Positive: subtle particle burst. Negative: `heavy` settle.

#### Act 4 — Rewards (Peak, 4/4 intensity)

**8. Application Accepted** (`ApplicationAcceptedSequence.tsx`)
- Enhance existing `CelebrationDialog` with Framer springs
- Physics-based confetti particles (random velocity, gravity, rotation)
- Success card scales in (`bouncy`)
- Offer counter ticks up

**9. Rank Up** (`RankUpSequence.tsx`)
- Progress bar fills to 100% (`smooth`)
- 400ms hold at full
- Old badge dissolves (scale + opacity to 0 with particle scatter)
- Screen flash (white overlay, 100ms in, 200ms out)
- New badge assembles from converging particles (`bouncy` overshoot)
- Rank name staggers letter by letter
- Ambient glow settles (CSS keyframe)

**10. Claiming Rewards** (`ClaimRewardsSequence.tsx`)
- Claim button springs on press (`heavy`)
- Token particles flow from rewards → wallet balance
- Balance counter ticks up with spring overshoot (past target, settles back)
- Success glow on balance area

### CSS Migration Strategy

**Keep as CSS keyframes** (ambient/infinite — Framer Motion doesn't add value here):
- `float`, `glow-pulse`, `ambient-drift`, `emblem-pulse`, `shimmer-border`
- `animate-spin`, `animate-pulse` (Tailwind built-ins)
- `nav-progress`, `nav-complete`

**Migrate to Framer Motion** (entrance/exit/interactive):
| CSS Keyframe | Framer Replacement |
|--------------|--------------------|
| `page-enter`, `section-enter`, `fade-up` | `<FadeIn>` / `<Stagger>` |
| `modal-backdrop-in`, `modal-scale-in` | Framer springs in `Modal` |
| `message-in` | `<FadeIn direction="up">` |
| `celebrate-scale-in`, `confetti-fall` | Framer spring + physics particles |

**Delete from globals.css after migration:**
- `page-enter`, `section-enter`, `fade-up`, `modal-backdrop-in`, `modal-scale-in`, `message-in`, `celebrate-scale-in` keyframes and their utility classes
- Consolidate remaining ambient keyframes under `/* === Ambient Animations === */` section

### Universal Baseline (Zero Pops)

Every state change in the app gets a transition. This is the non-negotiable foundation:

| Pattern | Current | After |
|---------|---------|-------|
| `{condition && <Content>}` | Instant appear/disappear | `<Expand>` or `<FadeIn>` with `AnimatePresence` |
| `{isLoading ? <Skeleton> : <Content>}` | Instant swap | `<ContentLoader>` crossfade |
| Tab content switch | Instant swap | Crossfade with directional hint |
| Route navigation | Instant replace | Page crossfade / directional slide |
| Modal open/close | CSS transition | Framer `heavy` spring |
| Alert appearance | Instant pop | Slide down + fade in (`normal`) |
| Accordion expand | Instant show | `<Expand>` smooth height |
| Hover effects | CSS transition-colors | Add `whileHover` scale to interactive cards |
| Button press | No feedback | `whileTap={{ scale: 0.97 }}` on all buttons |
| Progress bar change | CSS transition | Framer `smooth` spring |
| Number value change | Instant update | `<Counter>` spring animation |
| List/grid load | All items at once | `<Stagger>` with 60ms delay |
| Below-fold content | Static | `<Reveal>` on scroll |
| Badge/status appear | Instant | Scale + fade in (`bouncy`) |
| Error messages | Instant | Fade in (`normal`, 250ms) |

### Motion File Structure

```
src/lib/motion/
├── index.ts                  # Re-exports everything
├── MotionProvider.tsx         # Context (reduced motion, duration scale)
├── presets.ts                 # Spring configs + duration tokens
├── primitives/
│   ├── FadeIn.tsx
│   ├── SlideIn.tsx
│   ├── Expand.tsx
│   ├── Stagger.tsx
│   ├── Reveal.tsx
│   └── Counter.tsx
├── PageTransition.tsx         # Route transition wrapper for template.tsx
└── hooks/
    └── useMotion.ts           # Consumer hook for MotionProvider context

src/components/ui/
├── accordion.tsx              # NEW — built on Expand
├── content-loader.tsx         # NEW — skeleton→content crossfade
├── (modal, alert, tabs, progress, badge, button — enhanced)

src/components/sequences/
├── LandingHeroSequence.tsx
├── ApplicationSubmitSequence.tsx
├── JobPostSequence.tsx
├── GuildJoinSequence.tsx
├── StakingSequence.tsx
├── GovernanceVoteSequence.tsx
├── EndorsementRevealSequence.tsx
├── ApplicationAcceptedSequence.tsx
├── RankUpSequence.tsx
└── ClaimRewardsSequence.tsx
```

### Motion Performance Rules

- **GPU only:** All primitives animate `transform` and `opacity`. Never `width`, `height`, `top`, `left`, `margin`.
- **`<Expand>` exception:** Uses Framer's `layout` prop or `animate={{ height: "auto" }}` (optimized internally).
- **Stagger cap:** Lists >20 items: stagger first 12, rest appear instantly.
- **Tree-shake:** `import { motion, AnimatePresence } from "framer-motion"` — never `import *`.
- **Lazy sequences:** Cinematic components only imported where used (code-split by route).
- **Reduced motion:** `MotionProvider` sets `duration: 0` globally. All primitives respect this. No per-component handling.

---

## Phase 4: Layout Grid

**Depends on Phase 2 (card surfaces must be flat/opaque before standardizing spacing).**

### Container Widths (3 tiers)

| Tier | Value | Tailwind | Use |
|------|-------|---------|-----|
| Narrow | 768px | `max-w-3xl` | Forms, auth, single-column content |
| Standard | 1152px | `max-w-6xl` | Most pages: dashboards, browse, governance |
| Wide | 1280px | `max-w-7xl` | Data-heavy: candidates table, analytics |

**Migration:**

| From | To | Files |
|------|----|-------|
| `max-w-[1120px]` | `max-w-6xl` | HomePage, HeroSection, StatsBar, JobBrowser |
| `max-w-[1200px]` | `max-w-6xl` | GuildDetailView, GovernancePage, CandidateDashboard |
| `max-w-[1240px]` | `max-w-6xl` | JobDetailView |
| `max-w-[1440px]` | `max-w-7xl` | CompanyDashboardOverview |
| `max-w-5xl` | `max-w-6xl` | CandidateDashboard, GuildRanksProgression, SettingsPage |
| `max-w-4xl` | `max-w-3xl` or `max-w-6xl` | Context-dependent |
| `max-w-[920px]` | `max-w-6xl` | GuildsListingPage |
| `max-w-[860px]` | `max-w-6xl` | NotificationsPage |

### Responsive Padding

All page containers: `px-4 sm:px-6 lg:px-8`

Replace all standalone `px-6` with `px-4 sm:px-6 lg:px-8`.

### Gap Scale (5 tiers)

| Token | Value | Tailwind | Use |
|-------|-------|---------|-----|
| Tight | 8px | `gap-2` | Inside cards, label+value pairs |
| Compact | 12px | `gap-3` | List items, internal grids |
| Default | 16px | `gap-4` | Card grids, between sections |
| Loose | 24px | `gap-6` | Major page sections |
| Spacious | 32px | `gap-8` | Hero spacing, header→content |

**Snap rules:**
| From | To |
|------|----|
| `gap-0.5`, `gap-1`, `gap-1.5` | `gap-2` (tight) |
| `gap-2.5` | `gap-3` (compact) |
| `gap-3.5` | `gap-4` (default) |
| `gap-5` | `gap-4` or `gap-6` (by context) |
| `gap-12` | `gap-8` (spacious) |
| `gap-[3px]`, `gap-[5px]`, `gap-[7px]` | Nearest tier |

### Card Padding

| Variant | Padding | Use |
|---------|---------|-----|
| Standard | `p-6` | All cards, modals, sections |
| Compact | `p-4` | Stat cards, list items, dense grids |

Remove: `p-5`, `p-7`, `p-3` on cards.

### Card Surfaces

All cards: `bg-card` (100% opaque). Remove all `bg-card/*` opacity variants.

---

## Phase 5: Component Consolidation

**Depends on Phases 1+2 (new components use final type scale + flat surfaces).**

### 5a. Button Component Adoption

All inline gradient/shadow buttons → `<Button>` from `@/components/ui/button`.

- Gradient buttons → `<Button variant="default">`
- Ghost/outline inline buttons → `<Button variant="ghost">` or `<Button variant="outline">`
- Remove all `hover:scale-[1.02]` (motion system handles this now via `whileHover`)
- Remove all `shadow-primary/*` from buttons

**Files with inline buttons (partial list):**
`browse/JobCard.tsx:154`, `governance/GovernancePage.tsx:146`, `endorsements/EndorsementHeader.tsx:76`, `expert/ReputationScoreHero.tsx`, `home/HeroSection.tsx`, `GuildDetailPage.tsx`, plus ~30 more.

### 5b. New: `StatusBadge` Component

**File:** `src/components/ui/status-badge.tsx`

```tsx
interface StatusBadgeProps {
  status: "active" | "pending" | "completed" | "rejected" | "expired";
  label: string;
  pulse?: boolean; // "active" live indicator
}
```

Uses `STATUS_COLORS` from `@/config/colors`. Replaces inline dot+bg+text patterns in: `GovernanceProposalCard.tsx`, `ApplicationCard.tsx`, `JobCard.tsx`, `StatusActions.tsx`, `ApplicationPendingPage.tsx`, `CandidateDashboard.tsx`.

### 5c. New: `PageHeader` Component

**File:** `src/components/ui/page-header.tsx`

```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: { label: string; variant?: string };
  actions?: ReactNode;
  backHref?: string;
}
```

Left-aligned title (H1 token), muted description, optional back link, right-aligned actions. Replaces custom headers in: `GovernancePage.tsx`, `EarningsPage.tsx`, `LeaderboardPage.tsx`, `BrowsePage.tsx`, `EndorsementsPage.tsx`, `ReputationPage.tsx`.

### 5d. New: `Divider` Component

**File:** `src/components/ui/divider.tsx`

```tsx
interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}
```

Replaces `<div className="w-px h-10 bg-border" />` hardcoded in 10+ files.

### 5e. SectionCard Adoption

`SectionCard` exists at `src/components/ui/section-card.tsx`. Replace custom card-with-header patterns in: `GuildPublicOverviewTab.tsx`, `GovernanceStats.tsx`, `LeaderboardPage.tsx`.

### 5f. Unify StatCard

Delete local `StatCard` in `GovernanceStats.tsx`. Import from `@/components/dashboard/StatCard`.

---

## Phase 6: UX Polish

**Depends on Phases 4+5 (layout and components must be stable).**

### 6a. Dashboard Progressive Disclosure

**Problem:** `CompanyDashboardOverview` (674 lines) renders everything at once.

**Solution:** Collapsible sections using the new `<Accordion>` component from Phase 3:
- Stats row (always visible)
- Pipeline (collapsible, open by default)
- Recent Applications (collapsible)
- Activity Feed + Meetings (collapsible)

Same pattern for `CandidateDashboard.tsx` (732 lines).

### 6b. Mobile Dashboard Grids

```
Before: grid grid-cols-2 md:grid-cols-4 gap-3
After:  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4
```

Apply to all stat card grids in dashboards.

### 6c. Form Field Validation

`Input` component already supports `error` prop. Ensure all form components pass field-level errors — not just form-level banners.

### 6d. Accessibility Pass

| Fix | Scope |
|-----|-------|
| `aria-label` on icon-only buttons | Sidebar collapse, notification bells, close buttons, all icon-only actions |
| `<label>` elements for all form inputs | Auth forms, job form, guild application, settings |
| `prefers-reduced-motion` | Handled globally by `MotionProvider` (Phase 3) |
| Text labels alongside color status | Pipeline stages, vote indicators, endorsement status |
| `aria-live` regions | Counter values, real-time vote counts, balance updates |
| Focus management on route change | Announce new page to screen readers after transition |

---

## Phase Dependency Graph

```
Phase 1 (Typography) ────────┐
                              ├──→ Phase 4 (Layout Grid) ──→ Phase 5 (Components) ──→ Phase 6 (UX Polish)
Phase 2 (Flat Surfaces) ─────┤
                              │
                              └──→ Phase 3 (Motion Foundation)
```

**Phases 1 and 2 run in parallel.** Phase 3 starts after Phase 2. Phase 4 starts after Phase 2. Phase 5 needs 1+2. Phase 6 is last.

## Scope Per Phase

| Phase | Files | New Files | Nature |
|-------|-------|-----------|--------|
| 1. Typography | ~200 | 0 | Mechanical find-replace + review |
| 2. Flat Surfaces | ~120 | 0 | Remove decoration + 5 component redesigns |
| 3. Motion Foundation | ~50 | ~20 | New `src/lib/motion/` + enhance UI primitives + sequences |
| 4. Layout Grid | ~60 | 0 | Systematic value replacement |
| 5. Components | ~40 | 3 | New StatusBadge, PageHeader, Divider + adoption |
| 6. UX Polish | ~15 | 0 | Progressive disclosure, mobile grids, accessibility |

---

## Verification Strategy

After each phase:

1. `npm run build` — zero type errors
2. `npm run lint` — passes
3. Visual check on these pages in light + dark mode:
   - HomePage, BrowsePage, JobDetailView
   - ExpertDashboard, CompanyDashboard, CandidateDashboard
   - GovernancePage, GuildDetailPage, LeaderboardPage
   - LoginPage, SignupPage
   - EarningsPage, ReputationPage, EndorsementsPage
4. Mobile viewport (375px) for all dashboard pages
5. No regressions in loading, error, and empty states
6. After Phase 3: test with `prefers-reduced-motion: reduce` — all animations disabled

---

## What This Plan Does NOT Change

- Backend API contracts
- Data fetching patterns (`useFetch`, `useApi`)
- Auth flow or wallet integration
- Route structure (`src/app/`)
- Business logic
- Color token hue/saturation values — only how they're applied
- `src/config/colors.ts` semantic structure (STATUS_COLORS, RANK_COLORS, etc.)
