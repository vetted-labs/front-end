"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "vetted:bookmarked-posts";

function readBookmarks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeBookmarks(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

/**
 * localStorage-backed bookmark toggle hook.
 * Returns `isBookmarked(id)` checker and `toggleBookmark(id)` callback.
 */
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(readBookmarks);

  const isBookmarked = useCallback(
    (postId: string) => bookmarks.has(postId),
    [bookmarks]
  );

  const toggleBookmark = useCallback((postId: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      writeBookmarks(next);
      return next;
    });
  }, []);

  const bookmarkCount = bookmarks.size;

  return { isBookmarked, toggleBookmark, bookmarkCount };
}
