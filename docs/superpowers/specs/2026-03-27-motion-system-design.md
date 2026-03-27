# Motion System — Design Spec

## Overview

Replace the current inconsistent animation landscape (37+ custom keyframes, 8 different durations, 1000+ unanimated conditional renders) with a unified motion system built on Framer Motion. Two layers: a universal smooth baseline that eliminates all "pops" across the platform, and cinematic sequences for 10 key journey moments. Motion follows Swiss design principles — every animation serves information hierarchy, never competes with content.

## Decisions

- **Library:** Framer Motion (~33KB gzipped) — springs, `AnimatePresence`, layout animations, orchestration
- **Approach:** Motion Provider + Smart Defaults — bake motion into shared UI primitives so adoption is automatic
- **Duration tokens:** 3 values only — `fast` (150ms), `normal` (250ms), `slow` (400ms). Replace current 8 random values.
- **Spring presets:** 4 named configs — `snappy`, `smooth`, `bouncy`, `heavy`. No per-component spring tuning.
- **Page transitions:** Crossfade via `AnimatePresence` in `template.tsx`. Directional slide for depth changes (list → detail).
- **Existing CSS keyframes:** Migrate incrementally. Keep CSS keyframes for ambient/infinite animations (float, glow-pulse, drift). Convert entrance/exit animations to Framer Motion.
- **Reduced motion:** `MotionProvider` detects `prefers-reduced-motion` and disables all animations globally. Individual components don't need to handle this.

## Design Principles

1. **Motion reveals hierarchy** — primary content enters first, secondary staggers 60-80ms after. The eye follows the animation to the most important element.
2. **No animation competes with content** — if you notice the animation before the information, it's too much. Baseline transitions should be felt, not seen.
3. **Constrained vocabulary** — 3 durations, 4 springs, 5 primitives. Consistency over novelty.
4. **Intensity scales with emotional weight** — browsing = gentle, committing = satisfying, staking reputation = cinematic, ranking up = peak.
5. **Every transition has purpose** — show origin (this came from there), confirm action (your click registered), guide focus (look here next), show relationship (these belong together).
6. **Zero pops** — nothing in the app should appear or disappear instantly. Every state change gets at minimum a 150ms fade.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Layer 3: Cinematic Sequences               │
│  src/components/sequences/                  │
│  (10 journey moments — choreographed)       │
├─────────────────────────────────────────────┤
│  Layer 2: Enhanced UI Primitives            │
│  src/components/ui/ (existing, enhanced)    │
│  (Tabs, Modal, Alert, Accordion — motion    │
│   baked in, zero adoption cost)             │
├─────────────────────────────────────────────┤
│  Layer 1: Motion Foundation                 │
│  src/lib/motion/                            │
│  (Provider, presets, primitives,            │
│   page transitions, scroll reveal)          │
└─────────────────────────────────────────────┘
```

## Layer 1: Motion Foundation

All files in `src/lib/motion/`.

### MotionProvider

Wraps the app (inside existing provider stack, after `ThemeProvider`). Responsibilities:

- Detect `prefers-reduced-motion` and expose via context
- Provide global duration scale (1.0 default, 0 for reduced motion)
- Provide spring presets to all motion components
- No visual output — context-only provider

```
Provider Stack (updated):
WagmiProvider → QueryClientProvider → RainbowKitProvider
  → ThemeProvider → MotionProvider → AuthProvider + ErrorBoundary
```

### Spring Presets (`presets.ts`)

Four named springs. Components reference by name, never define inline springs.

| Name | Use Case | Config |
|---|---|---|
| `snappy` | Buttons, toggles, small UI feedback | `{ stiffness: 500, damping: 30, mass: 0.5 }` |
| `smooth` | Page transitions, content fades, tab switches | `{ stiffness: 200, damping: 25, mass: 0.8 }` |
| `bouncy` | Celebrations, badges appearing, rank-ups | `{ stiffness: 300, damping: 15, mass: 0.8 }` |
| `heavy` | Modals, staking confirmations, high-stakes actions | `{ stiffness: 150, damping: 20, mass: 1.2 }` |

### Duration Tokens (`durations.ts`)

Three values. Used for non-spring animations (opacity fades, color transitions).

| Token | Value | Use |
|---|---|---|
| `fast` | 150ms | Hover states, button feedback, micro-interactions |
| `normal` | 250ms | Content fades, tab switches, alerts appearing |
| `slow` | 400ms | Page transitions, modal entrance, expand/collapse |

### Motion Primitives

Reusable wrapper components. All respect `MotionProvider` reduced-motion setting.

**`<FadeIn>`** — Opacity 0→1 on mount. Optionally with slight translateY for "fade up" feel.
- Props: `delay`, `duration` (defaults to `normal`), `direction` (up/down/none), `distance` (default 8px)
- Use: Default entrance for any content appearing

**`<SlideIn>`** — Translate from a direction with opacity fade.
- Props: `from` (left/right/top/bottom), `distance`, `delay`, `spring` (defaults to `smooth`)
- Use: Panels, sidebars, directional content

**`<Expand>`** — Animated height from 0 to auto. Replaces all `{show && <div>}` accordion patterns.
- Props: `isOpen`, `duration` (defaults to `slow`)
- Use: Accordions, collapsible sections, conditional content. This is the single biggest win — converts 1000+ instant show/hide patterns to smooth expand/collapse.

**`<Stagger>`** — Wraps children and staggers their entrance.
- Props: `staggerDelay` (default 60ms), `spring` (defaults to `smooth`)
- Use: Lists, grids, card groups. Children animate in sequence.

**`<Reveal>`** — Scroll-triggered `FadeIn`. Uses Framer Motion `useInView`.
- Props: `threshold` (default 0.2), `once` (default true), plus all `FadeIn` props
- Use: Below-fold content, long pages, marketing sections

**`<Counter>`** — Animated number transition. Springs from old value to new.
- Props: `value`, `format` (number/currency/percent), `spring` (defaults to `snappy`)
- Use: Stat cards, balances, vote counts, progress percentages

**`<AnimatePresence>`** — Re-export from Framer Motion, pre-configured with `mode="wait"` as default.
- Use: Any conditional render where exit animation is needed

### Page Transitions (`PageTransition.tsx`)

Applied via `template.tsx` (Next.js re-renders template on every navigation, unlike layout).

- Default: Crossfade (opacity out 150ms → opacity in 250ms)
- Depth transitions: When navigating to a detail view (list → item), content slides in from the right. Back navigation slides from left. Determined by a simple route-depth heuristic (more path segments = deeper).
- During transition: Old content fades/slides out, new content fades/slides in. No blank frame.

### Button Motion

Global enhancement to the existing `Button` component:

- `whileTap={{ scale: 0.97 }}` — subtle press feedback on every button
- `whileHover={{ scale: 1.02 }}` — micro-lift on hover (replaces CSS hover transforms)
- Loading state: smooth crossfade between button text and spinner
- Spring: `snappy`

## Layer 2: Enhanced UI Primitives

Modify existing components in `src/components/ui/`. Motion is built in — consumers don't need to change their code.

### Tabs (modify existing)

- Tab content wraps in `AnimatePresence` + `motion.div`
- On tab switch: old content fades out (100ms), new content fades in (200ms) with slight slide from the direction of the clicked tab
- Tab indicator bar animates position with `layout` prop (shared layout animation)
- Spring: `smooth`

### Modal (modify existing)

- Migrate from CSS `transition-all` to Framer Motion springs
- Backdrop: `motion.div` opacity 0→1, spring `smooth`
- Content: `motion.div` with `scale: 0.95, opacity: 0` → `scale: 1, opacity: 1`, spring `heavy`
- Exit: reverse with `AnimatePresence`
- Preserves existing focus trap and accessibility

### Alert (modify existing)

- Wrap in `motion.div` with `initial={{ opacity: 0, y: -8 }}` → `animate={{ opacity: 1, y: 0 }}`
- Duration: `normal` (250ms)
- Dismissible alerts exit with fade-out via `AnimatePresence`

### Accordion (new component)

- Built on `Expand` primitive
- Header with chevron that rotates on open/close (`motion.div rotate: 0 → 180`)
- Content area smoothly expands/collapses
- Replaces all manual `{expanded && <div>}` patterns across the app

### Skeleton → Content Crossfade

- New `<ContentLoader>` wrapper: shows skeleton children while loading, crossfades to real content when ready
- Uses `AnimatePresence` with `mode="wait"`
- Skeleton fades out (100ms), content fades in (200ms)
- Replaces `{isLoading ? <Skeleton /> : <Content />}` patterns

### Progress Bar (modify existing)

- Animate `scaleX` via Framer Motion `motion.div` with `smooth` spring
- Value changes spring to new position instead of instant jump
- Number label (if shown) uses `Counter` component

### Badge (modify existing)

- `initial={{ scale: 0.8, opacity: 0 }}` → `animate={{ scale: 1, opacity: 1 }}`
- Spring: `bouncy` for appearance
- Status color changes crossfade (150ms)

## Layer 3: Cinematic Sequences

Self-contained sequence components in `src/components/sequences/`. Each orchestrates multiple motion primitives into a choreographed moment. Triggered by parent components when specific events occur.

### Journey Intensity Map

Moments ordered by user journey progression. Intensity scales with emotional weight.

#### Act 1 — Arrival (Gentle)

**1. Landing Page Hero** — Intensity: 2/4
- Orchestrated stagger: headline (0ms) → subtitle (80ms) → CTA (160ms) → stats bar (240ms) → job cards (320ms+)
- Background orbs drift in with `slow` duration
- Stat numbers use `Counter` with tick-up from 0
- Spring: `smooth`

#### Act 2 — Commitment (Satisfying)

**2. Candidate Submits Application** — Intensity: 2/4
- Form compress: fields scale down slightly (95%) and fade
- Success card morphs in from form position with `layout` animation
- Confirmation text staggers in
- Spring: `smooth`

**3. Company Posts Job** — Intensity: 2/4
- Job card materializes: assembles from form data with staggered field entrance
- "Live" badge pops in with `bouncy` spring
- Ring pulse on the badge (CSS keyframe — ambient)
- Redirect uses page transition (shared layout)

**4. Expert Joins Guild** — Intensity: 3/4
- Guild emblem scales up with `bouncy` spring and slight overshoot
- Particles (small dots in guild color) converge toward the user's profile area
- Rank badge materializes with fade + scale
- Welcome text types in letter by letter (or staggers word by word)
- Spring: `bouncy`

#### Act 3 — Stakes (Cinematic)

**5. Staking Reputation** — Intensity: 3/4
- Balance counter ticks down via `Counter`
- Token particles (small circles) stream from balance position toward endorsement lock icon
- Lock icon snaps shut with `heavy` spring (slight overshoot then settle)
- Endorsement card fades in below
- Spring: `heavy` for the lock, `smooth` for the particles

**6. Casting Governance Vote** — Intensity: 3/4
- Vote button depresses with `heavy` spring
- Voting power bar stretches toward chosen side with `smooth` spring
- Vote count ticks up via `Counter`
- "Vote locked" seal stamps in with `bouncy` spring + subtle scale overshoot
- Bar chart/results animate to new proportions

**7. Endorsement Outcome Revealed** — Intensity: 4/4
- Sealed card wobbles (subtle rotate oscillation, 3 cycles)
- 800ms dramatic pause (no animation — tension)
- Card flips with 3D perspective transform (rotateY 0→180°)
- Result color floods the card background (positive = green wash, negative = red wash)
- Reputation delta counter springs to final value
- If positive: subtle particle burst. If negative: card settles with `heavy` spring.
- Spring: `heavy` for the flip, `bouncy` for the result

#### Act 4 — Rewards (Peak)

**8. Application Accepted** — Intensity: 4/4
- Enhance existing `CelebrationDialog` with Framer Motion springs
- Replace CSS confetti with physics-based particles (random velocity, gravity, rotation)
- Success card scales in with `bouncy` spring (replace CSS `celebrate-scale-in`)
- Glow pulse continues as ambient CSS animation
- Counter ticks up for offer count

**9. Rank Up / Tier Promotion** — Intensity: 4/4
- Progress bar fills to 100% with `smooth` spring
- Brief 400ms hold at full
- Old rank badge scales down and dissolves (opacity + scale to 0 with particle scatter)
- Screen-wide flash (white overlay, 100ms fade in, 200ms fade out)
- New rank badge assembles: particles converge → badge forms with `bouncy` spring overshoot
- Rank name text staggers in letter by letter
- New rank color floods the badge glow
- Ambient glow settles (CSS keyframe)
- Spring: `bouncy` for badge, `heavy` for the flash weight

**10. Claiming Rewards / Withdrawing** — Intensity: 3/4
- Claim button springs on press with `heavy` feedback
- Token stream: particles flow from rewards area toward wallet balance
- Balance counter ticks up with spring overshoot (goes slightly past target, settles back)
- Success glow on the balance area
- Spring: `smooth` for particles, `snappy` for counter

## Universal Baseline Checklist

Everything in the app that currently "pops" gets a transition. This is the non-negotiable foundation.

| Pattern | Current | After |
|---|---|---|
| `{condition && <Content>}` | Instant appear/disappear | `<Expand>` or `<FadeIn>` with `AnimatePresence` |
| `{isLoading ? <Skeleton> : <Content>}` | Instant swap | `<ContentLoader>` crossfade |
| Tab content switch | Instant swap | Crossfade with directional hint |
| Route navigation | Instant replace | Page crossfade / directional slide |
| Modal open/close | CSS transition (decent) | Framer Motion spring (better feel) |
| Alert appearance | Instant pop | Slide down + fade in |
| Accordion expand | Instant show | `<Expand>` smooth height |
| Dropdown open | CSS animate-in (decent) | Keep CSS — already smooth |
| Hover effects | CSS transition-colors (good) | Add `whileHover` scale to interactive cards |
| Button press | No feedback | `whileTap={{ scale: 0.97 }}` on all buttons |
| Progress bar change | CSS transition (decent) | Framer spring (more organic) |
| Number value change | Instant update | `<Counter>` spring animation |
| List/grid load | All items at once | `<Stagger>` with 60ms delay |
| Below-fold content | Static | `<Reveal>` on scroll |
| Badge/status appear | Instant | Scale + fade in |
| Error messages | Instant | Fade in, 250ms |

## CSS Migration Strategy

**Keep as CSS keyframes** (ambient/infinite animations):
- `float`, `glow-pulse`, `ambient-drift`, `emblem-pulse`, `shimmer-border`
- All `rep-*` ambient animations (ring pulses, dot float, particle rise)
- `animate-spin`, `animate-pulse` (Tailwind built-ins)

**Migrate to Framer Motion** (entrance/exit/interactive):
- `page-enter`, `section-enter`, `fade-up` → `<FadeIn>` / `<Stagger>`
- `modal-backdrop-in`, `modal-scale-in` → Framer Motion in `Modal`
- `message-in` → `<FadeIn direction="up">`
- `celebrate-scale-in`, `confetti-fall` → Framer spring + physics particles
- `nav-progress`, `nav-complete` → Keep CSS (works well, no benefit to migrating)

**Fix broken animations:**
- Define missing `endo-ring-spin` and `endo-card-spin` keyframes in globals.css (or replace with Framer if appropriate)

**Remove after migration:**
- `page-enter`, `section-enter`, `fade-up` keyframes and their utility classes
- `modal-backdrop-in`, `modal-scale-in` keyframes
- `message-in` keyframe
- `celebrate-scale-in` keyframe
- Consolidate remaining keyframes into a `/* === Ambient Animations === */` section in globals.css

## File Structure

```
src/lib/motion/
├── index.ts                 # Re-exports everything
├── MotionProvider.tsx        # Context provider (reduced motion, duration scale)
├── presets.ts               # Spring configs + duration tokens
├── primitives/
│   ├── FadeIn.tsx
│   ├── SlideIn.tsx
│   ├── Expand.tsx
│   ├── Stagger.tsx
│   ├── Reveal.tsx
│   └── Counter.tsx
├── PageTransition.tsx       # Route transition wrapper for template.tsx
└── hooks/
    └── useMotion.ts         # Consumer hook for MotionProvider context

src/components/ui/
├── accordion.tsx            # New — built on Expand
├── content-loader.tsx       # New — skeleton→content crossfade
├── modal.tsx                # Enhanced with Framer springs
├── alert.tsx                # Enhanced with entrance animation
├── tabs.tsx                 # Enhanced with content crossfade
├── progress.tsx             # Enhanced with spring fill
├── badge.tsx                # Enhanced with scale entrance
└── button.tsx               # Enhanced with whileTap/whileHover

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

## Performance Considerations

- **Bundle:** Framer Motion ~33KB gzipped. Tree-shake with `import { motion, AnimatePresence } from "framer-motion"` (avoid `import * from`).
- **GPU compositing:** All motion primitives animate `transform` and `opacity` only (GPU-composited). Never animate `width`, `height`, `top`, `left`, or `margin`.
- **`Expand` exception:** Height animation uses Framer Motion's `layout` prop which handles this efficiently, or `animate={{ height: "auto" }}` which Framer Motion optimizes internally.
- **`will-change`:** Applied automatically by Framer Motion. No manual `will-change` needed.
- **Stagger limits:** For lists >20 items, cap stagger to first 12 items visible, rest appear instantly.
- **Reduced motion:** `MotionProvider` sets `duration: 0` and `spring: { duration: 0 }` globally. All primitives pick this up automatically. No per-component handling.
- **Lazy load sequences:** Cinematic sequence components are only imported where used (already code-split by Next.js route boundaries).

## Accessibility

- Full `prefers-reduced-motion` support via `MotionProvider` — single toggle disables all animations app-wide
- Focus management unchanged — Modal focus trap, keyboard navigation all preserved
- No animation-only information — all state changes have non-animated indicators (text, color, icon)
- `aria-live` regions announce state changes that are animated (e.g., counter values)
- Page transitions don't interfere with screen reader announcements (content is in DOM before animation completes)

## Dependencies

- `framer-motion` (add to package.json) — the only new dependency
- No changes to build config — Framer Motion works with Next.js 15 + React 19 out of the box
