"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * Polls a fetch function on a fixed interval while active.
 * Calls fetchFn immediately, then every `intervalMs` milliseconds.
 * Cleans up the interval on unmount or when `active` becomes false.
 *
 * @param fetchFn     Async function to call on each poll tick.
 * @param intervalMs  Polling interval in milliseconds (default: 5000).
 * @param active      Whether polling is active.
 */
export function useMessagePolling(
  fetchFn: () => Promise<void>,
  intervalMs = 5000,
  active = true,
) {
  const fetchFnRef = useRef(fetchFn);
  // eslint-disable-next-line no-restricted-syntax
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  });

  const stableFetch = useCallback(() => fetchFnRef.current(), []);

  // eslint-disable-next-line no-restricted-syntax
  useEffect(() => {
    if (!active) return;
    stableFetch();
    const interval = setInterval(stableFetch, intervalMs);
    return () => clearInterval(interval);
  }, [active, intervalMs, stableFetch]);
}
