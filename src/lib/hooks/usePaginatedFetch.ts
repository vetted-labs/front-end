"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ApiError } from "@/lib/api";

interface UsePaginatedFetchOptions<T> {
  /** Items per page */
  limit?: number;
  /** Skip the initial fetch */
  skip?: boolean;
  onSuccess?: (data: T[]) => void;
  onError?: (error: string) => void;
}

interface PaginatedResult<T> {
  /** Current page of data */
  data: T[];
  /** All fetched data (for client-side mode) */
  allData: T[];
  /** Whether a fetch is in progress */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Current page number (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total item count */
  totalItems: number;
  /** Navigate to a specific page */
  setPage: (page: number) => void;
  /** Reset to page 1 */
  resetPage: () => void;
  /** Re-fetch data */
  refetch: () => void;
}

/**
 * Reusable hook for paginated data fetching.
 *
 * Supports two modes:
 * 1. **Server-side**: `fetchFn` receives `(page, limit)` and returns
 *    `{ data: T[], total: number }` — the hook re-fetches when the page changes.
 * 2. **Client-side**: `fetchFn` returns `T[]` — the hook fetches once and slices
 *    locally per page.
 */
export function usePaginatedFetch<T>(
  fetchFn: (page: number, limit: number) => Promise<T[] | { data: T[]; total: number }>,
  options: UsePaginatedFetchOptions<T> = {}
): PaginatedResult<T> {
  const { limit = 10, skip = false, onSuccess, onError } = options;

  const [allData, setAllData] = useState<T[]>([]);
  const [serverData, setServerData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isServerSide, setIsServerSide] = useState(false);

  // Store latest refs to avoid re-render loops with inline functions
  const fetchFnRef = useRef(fetchFn);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const mountedRef = useRef(true);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (fetchPage: number) => {
    if (skip) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFnRef.current(fetchPage, limit);

      if (!mountedRef.current) return;

      if (Array.isArray(result)) {
        // Client-side mode: we have all the data
        setIsServerSide(false);
        setAllData(result);
        setTotalItems(result.length);
        onSuccessRef.current?.(result);
      } else {
        // Server-side mode: { data, total }
        setIsServerSide(true);
        setServerData(result.data);
        setTotalItems(result.total);
        onSuccessRef.current?.(result.data);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : (err as Error).message || "An error occurred";
      setError(errorMessage);
      onErrorRef.current?.(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [skip, limit]);

  // Re-fetch when fetchFn identity changes (sort/filter changed) — reset to page 1
  const prevFetchFnRef = useRef(fetchFn);
  useEffect(() => {
    if (prevFetchFnRef.current !== fetchFn) {
      prevFetchFnRef.current = fetchFn;
      setPage(1);
      execute(1);
    }
  }, [fetchFn, execute]);

  // Fetch on mount and when page changes (for server-side mode)
  useEffect(() => {
    execute(page);
  }, [execute, page]);

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  // For client-side mode, slice the data for the current page
  const currentData = isServerSide
    ? serverData
    : allData.slice((page - 1) * limit, page * limit);

  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  const refetch = useCallback(() => {
    execute(page);
  }, [execute, page]);

  return {
    data: currentData,
    allData,
    isLoading,
    error,
    page,
    totalPages,
    totalItems,
    setPage,
    resetPage,
    refetch,
  };
}
