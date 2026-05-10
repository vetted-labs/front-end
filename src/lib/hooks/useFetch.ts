"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ApiError } from "@/lib/api";

interface UseFetchOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  skip?: boolean;
  /**
   * If set, re-runs the fetch on this interval (ms). Pass `null`/undefined to
   * disable polling. Pass `0` to also disable. Set this to a non-zero number
   * only while the consumer actually needs live data — long-lived polls are
   * a battery / bandwidth burden.
   *
   * The interval is restarted from scratch whenever this option changes, so
   * a caller can flip from `5000` → `null` to stop polling once the resource
   * reaches a terminal state (e.g. on-chain session moves out of `pending`).
   */
  pollIntervalMs?: number | null;
}

export function useFetch<T = unknown>(
  fetchFn: () => Promise<T>,
  options: UseFetchOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const { onSuccess, onError, skip = false, pollIntervalMs } = options;

  const [isLoading, setIsLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);

  // Store latest function references in refs to avoid re-render loops
  // when callers pass inline functions
  const fetchFnRef = useRef(fetchFn);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  // Ref-based cancellation flag — set synchronously in cleanup,
  // so it's guaranteed to be `true` before any pending `.then()` runs.
  const cancelledRef = useRef(false);

  const execute = useCallback(async () => {
    if (skip) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFnRef.current();
      if (!cancelledRef.current) {
        setData(result);
        onSuccessRef.current?.(result);
      }
    } catch (err) {
      if (!cancelledRef.current) {
        const errorMessage =
          err instanceof ApiError
            ? err.message
            : (err as Error).message || "An error occurred";
        setError(errorMessage);
        onErrorRef.current?.(errorMessage);
      }
    } finally {
      if (!cancelledRef.current) {
        setIsLoading(false);
      }
    }
  }, [skip]);

  useEffect(() => {
    cancelledRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- execute() drives async setState through the documented data-fetching pattern
    execute();
    return () => {
      cancelledRef.current = true;
    };
  }, [execute]);

  // Polling — opt-in via `pollIntervalMs`. Kept separate from the initial
  // fetch effect so disabling polling doesn't cancel an in-flight request.
  // eslint-disable-next-line no-restricted-syntax -- legitimate timer-driven side effect; the `pollIntervalMs` switch is the abstraction
  useEffect(() => {
    if (skip) return;
    if (!pollIntervalMs || pollIntervalMs <= 0) return;
    const id = setInterval(() => {
      execute();
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [execute, pollIntervalMs, skip]);

  const refetch = useCallback(() => {
    execute();
  }, [execute]);

  return { data, isLoading, error, refetch };
}

export function useApi<T = unknown>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (
    apiFn: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: string) => void;
    }
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiFn();
      if (mountedRef.current) {
        options?.onSuccess?.(result);
      }
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : (err as Error).message || "An error occurred";
      if (mountedRef.current) {
        setError(errorMessage);
        options?.onError?.(errorMessage);
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  return { execute, isLoading, error, setError };
}
