"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMountEffect } from "@/lib/hooks/useMountEffect";

const NORMAL_INTERVAL = 30_000;
const BACKOFF_INTERVALS = [5_000, 10_000, 30_000, 60_000];

/**
 * Generic notification unread-count polling hook.
 *
 * Uses exponential backoff on errors instead of permanently stopping.
 *
 * @param fetchFn   Async function that returns `{ count: number }`.
 * @param eventName Custom DOM event name dispatched when notifications are read.
 * @param enabled   Whether polling is active.
 */
export function useNotificationCountPolling(
  fetchFn: () => Promise<{ count: number }>,
  eventName: string,
  enabled: boolean,
) {
  const [count, setCount] = useState(0);
  const mountedRef = useRef(true);
  const backoffRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getNextDelay = useCallback(() => {
    if (backoffRef.current === 0) return NORMAL_INTERVAL;
    const idx = Math.min(backoffRef.current - 1, BACKOFF_INTERVALS.length - 1);
    return BACKOFF_INTERVALS[idx];
  }, []);

  const scheduleNext = useCallback(
    (fetchAndSchedule: () => void) => {
      timerRef.current = setTimeout(fetchAndSchedule, getNextDelay());
    },
    [getNextDelay],
  );

  const fetchCount = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setCount(result?.count || 0);
        backoffRef.current = 0;
      }
    } catch {
      backoffRef.current = Math.min(
        backoffRef.current + 1,
        BACKOFF_INTERVALS.length,
      );
    }
  }, [enabled, fetchFn]);

  useMountEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  });

  // eslint-disable-next-line no-restricted-syntax -- manages recursive setTimeout polling lifecycle based on enabled state
  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    backoffRef.current = 0;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const fetchAndSchedule = async () => {
      await fetchCount();
      if (mountedRef.current && enabled) {
        scheduleNext(fetchAndSchedule);
      }
    };

    // Defer initial fetch so page content renders first
    const initialTimer = setTimeout(fetchAndSchedule, 500);

    const handler = () => {
      backoffRef.current = 0;
      clearTimer();
      fetchAndSchedule();
    };
    window.addEventListener(eventName, handler);

    return () => {
      clearTimeout(initialTimer);
      clearTimer();
      window.removeEventListener(eventName, handler);
    };
  }, [enabled, fetchCount, eventName, scheduleNext]);

  return count;
}
