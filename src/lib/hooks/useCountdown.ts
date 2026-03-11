"use client";

import { useState, useEffect, useMemo } from "react";

const DEFAULT_FALLBACK_MS = 24 * 60 * 60 * 1000; // 24h

interface CountdownResult {
  /** Milliseconds remaining (0 when expired). */
  remaining: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  /** Less than 2 hours remaining. */
  isUrgent: boolean;
  /** Pre-formatted label, e.g. "3h 05m 42s" or the provided `expiredLabel`. */
  label: string;
}

/**
 * Shared countdown hook.
 *
 * @param deadline  ISO timestamp or epoch ms of the deadline.
 *                  If omitted, falls back to `fallbackStart + fallbackDurationMs`.
 * @param options.fallbackStart  ISO timestamp used as start when `deadline` is undefined.
 * @param options.fallbackDurationMs  Duration added to `fallbackStart` (default 24h).
 * @param options.expiredLabel  Label shown when expired (default "Expired").
 */
export function useCountdown(
  deadline?: string | number | null,
  options?: {
    fallbackStart?: string;
    fallbackDurationMs?: number;
    expiredLabel?: string;
  },
): CountdownResult {
  const expiredLabel = options?.expiredLabel ?? "Expired";

  const deadlineMs = useMemo(() => {
    if (deadline) {
      return typeof deadline === "number" ? deadline : new Date(deadline).getTime();
    }
    if (options?.fallbackStart) {
      return new Date(options.fallbackStart).getTime() + (options.fallbackDurationMs ?? DEFAULT_FALLBACK_MS);
    }
    return 0;
  }, [deadline, options?.fallbackStart, options?.fallbackDurationMs]);

  const [remaining, setRemaining] = useState(() => Math.max(0, deadlineMs - Date.now()));

  useEffect(() => {
    setRemaining(Math.max(0, deadlineMs - Date.now()));
    if (deadlineMs <= Date.now()) return;
    const id = setInterval(() => {
      const next = Math.max(0, deadlineMs - Date.now());
      setRemaining(next);
      if (next <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [deadlineMs]);

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  const isExpired = remaining <= 0;
  const isUrgent = remaining > 0 && remaining < 2 * 60 * 60 * 1000;

  const label = isExpired
    ? expiredLabel
    : `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;

  return { remaining, hours, minutes, seconds, isExpired, isUrgent, label };
}
