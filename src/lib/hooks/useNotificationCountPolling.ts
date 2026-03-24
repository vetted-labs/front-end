"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMountEffect } from "@/lib/hooks/useMountEffect";

/**
 * Generic notification unread-count polling hook.
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
  const failedRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchCount = useCallback(async () => {
    if (!enabled || failedRef.current) return;
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setCount(result?.count || 0);
      }
    } catch {
      failedRef.current = true;
    }
  }, [enabled, fetchFn]);

  useMountEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  });

  // eslint-disable-next-line no-restricted-syntax -- manages polling lifecycle based on enabled state
  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    failedRef.current = false;
    fetchCount();
    const interval = setInterval(fetchCount, 30000);

    const handler = () => {
      failedRef.current = false;
      fetchCount();
    };
    window.addEventListener(eventName, handler);

    return () => {
      clearInterval(interval);
      window.removeEventListener(eventName, handler);
    };
  }, [enabled, fetchCount, eventName]);

  return count;
}
