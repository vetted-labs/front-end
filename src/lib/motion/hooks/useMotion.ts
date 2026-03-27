"use client";

import { useContext } from "react";
import { MotionContext, type MotionContextValue, type MotionTransition } from "../MotionProvider";
import { SPRINGS, DURATIONS, REDUCED_MOTION_TRANSITION } from "../presets";
import type { SpringPreset, DurationToken } from "../presets";

/**
 * Consume the motion context.
 *
 * Safe to call outside a provider — returns sensible defaults
 * (no reduced motion, smooth spring, normal duration).
 */
export function useMotion(): MotionContextValue {
  const ctx = useContext(MotionContext);

  if (ctx) return ctx;

  // Fallback when used outside MotionProvider (e.g. Storybook, tests)
  return {
    prefersReducedMotion: false,
    spring: (preset: SpringPreset = "smooth"): MotionTransition => SPRINGS[preset],
    duration: (token: DurationToken = "normal") => DURATIONS[token],
  };
}

// Re-export the transition constant for direct use
export { REDUCED_MOTION_TRANSITION };
