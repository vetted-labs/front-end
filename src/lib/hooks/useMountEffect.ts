"use client";

import { useEffect } from "react";

/**
 * Runs once on mount, with optional cleanup on unmount.
 * Use this instead of raw useEffect(..., []).
 * Only for external system sync (DOM, timers, subscriptions).
 */
export function useMountEffect(effect: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps, no-restricted-syntax
  useEffect(effect, []);
}
