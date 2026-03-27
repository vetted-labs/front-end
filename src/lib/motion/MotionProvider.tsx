"use client";

import { createContext, useCallback, useState } from "react";
import { MotionConfig } from "framer-motion";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import {
  SPRINGS,
  DURATIONS,
  REDUCED_MOTION_TRANSITION,
  type SpringPreset,
  type DurationToken,
} from "./presets";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

/** Union of every possible transition object returned by `spring()` */
export type MotionTransition =
  | (typeof SPRINGS)[SpringPreset]
  | typeof REDUCED_MOTION_TRANSITION;

export interface MotionContextValue {
  /** True when the user has prefers-reduced-motion enabled */
  prefersReducedMotion: boolean;
  /** Returns the named spring, or an instant transition if reduced motion is on */
  spring: (preset?: SpringPreset) => MotionTransition;
  /** Returns the named duration in seconds, or 0 if reduced motion is on */
  duration: (token?: DurationToken) => number;
}

export const MotionContext = createContext<MotionContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  // Subscribe to OS-level reduced-motion changes
  useMountEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  });

  const spring = useCallback(
    (preset: SpringPreset = "smooth") =>
      prefersReducedMotion ? REDUCED_MOTION_TRANSITION : SPRINGS[preset],
    [prefersReducedMotion],
  );

  const duration = useCallback(
    (token: DurationToken = "normal") =>
      prefersReducedMotion ? 0 : DURATIONS[token],
    [prefersReducedMotion],
  );

  return (
    <MotionContext.Provider value={{ prefersReducedMotion, spring, duration }}>
      <MotionConfig reducedMotion={prefersReducedMotion ? "always" : "never"}>
        {children}
      </MotionConfig>
    </MotionContext.Provider>
  );
}
