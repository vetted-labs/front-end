/**
 * Motion presets — spring configs and duration tokens for the entire app.
 *
 * Usage:
 *   import { SPRINGS, DURATIONS } from "@/lib/motion"
 *   <motion.div transition={SPRINGS.snappy} />
 */

// ---------------------------------------------------------------------------
// Spring presets (physics-based, framerate-independent)
// ---------------------------------------------------------------------------

/** Fast micro-interactions: toggles, checkboxes, small UI feedback */
export const SPRING_SNAPPY = { type: "spring" as const, stiffness: 500, damping: 30, mass: 1 };

/** General-purpose — cards, modals, page sections */
export const SPRING_SMOOTH = { type: "spring" as const, stiffness: 300, damping: 26, mass: 1 };

/** Playful overshoot — success states, celebrations */
export const SPRING_BOUNCY = { type: "spring" as const, stiffness: 400, damping: 15, mass: 1 };

/** Slow & weighty — drawers, large overlays */
export const SPRING_HEAVY = { type: "spring" as const, stiffness: 200, damping: 28, mass: 1.4 };

/** Convenience map when you want to look up by name */
export const SPRINGS = {
  snappy: SPRING_SNAPPY,
  smooth: SPRING_SMOOTH,
  bouncy: SPRING_BOUNCY,
  heavy: SPRING_HEAVY,
} as const;

export type SpringPreset = keyof typeof SPRINGS;

// ---------------------------------------------------------------------------
// Duration tokens (seconds) — for tween / CSS-style transitions
// ---------------------------------------------------------------------------

export const DURATION_FAST = 0.15;
export const DURATION_NORMAL = 0.25;
export const DURATION_SLOW = 0.4;

export const DURATIONS = {
  fast: DURATION_FAST,
  normal: DURATION_NORMAL,
  slow: DURATION_SLOW,
} as const;

export type DurationToken = keyof typeof DURATIONS;

// ---------------------------------------------------------------------------
// Reduced-motion fallback — instant, zero-motion transition
// ---------------------------------------------------------------------------

export const REDUCED_MOTION_TRANSITION = {
  type: "tween" as const,
  duration: 0,
};
