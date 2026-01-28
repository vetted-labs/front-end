"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { onSuccess, onError, skip = false } = options;

  const execute = useCallback(async () => {
    if (skip) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : (err as Error).message || "An error occurred";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, skip, onSuccess, onError]);

  useEffect(() => {
    execute();
  }, [execute]);

  const refetch = () => {
    execute();
  };

  return { data, isLoading, error, refetch };
}

export function useApi<T = unknown>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (
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
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : (err as Error).message || "An error occurred";
      setError(errorMessage);
      options?.onError?.(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading, error, setError };
}
