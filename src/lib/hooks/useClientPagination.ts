"use client";

import { useState, useMemo, useCallback } from "react";

interface UseClientPaginationResult<T> {
  /** Items for the current page */
  paginatedItems: T[];
  /** Current 1-indexed page number */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Set the current page */
  setCurrentPage: (page: number) => void;
  /** Reset to page 1 */
  resetPage: () => void;
}

/**
 * Simple client-side pagination over an in-memory array.
 */
export function useClientPagination<T>(
  items: T[],
  perPage: number = 10
): UseClientPaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, currentPage, perPage]);

  const resetPage = useCallback(() => setCurrentPage(1), []);

  return {
    paginatedItems,
    currentPage,
    totalPages,
    setCurrentPage,
    resetPage,
  };
}
