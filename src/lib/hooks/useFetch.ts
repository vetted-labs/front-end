"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ApiError } from "@/lib/api";

interface UseFetchOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  skip?: boolean;
}

export function useFetch<T = unknown>(
  fetchFn: () => Promise<T>,
  options: UseFetchOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const { onSuccess, onError, skip = false } = options;

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

  const execute = useCallback(async () => {
    if (skip) return;

    setIsLoading(true);
    setError(null);

    // Track whether this effect is still active (component mounted)
    let cancelled = false;

    try {
      const result = await fetchFnRef.current();
      if (!cancelled) {
        setData(result);
        onSuccessRef.current?.(result);
      }
    } catch (err) {
      if (!cancelled) {
        const errorMessage =
          err instanceof ApiError
            ? err.message
            : (err as Error).message || "An error occurred";
        setError(errorMessage);
        onErrorRef.current?.(errorMessage);
      }
    } finally {
      if (!cancelled) {
        setIsLoading(false);
      }
    }

    // Return cleanup that marks this execution as cancelled
    return () => {
      cancelled = true;
    };
  }, [skip]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    execute().then((fn) => {
      cleanup = fn;
    });
    return () => {
      cleanup?.();
    };
  }, [execute]);

  const refetch = () => {
    execute();
  };

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
