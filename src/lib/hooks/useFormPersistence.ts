"use client";

import { useCallback, useState } from "react";
import { useMountEffect } from "@/lib/hooks/useMountEffect";

const STORAGE_KEY = "vetted:expert-application-draft";
const VERSION = 1;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface StoredDraft<T> {
  version: number;
  data: T;
  savedAt: number;
}

/**
 * Persists form data to localStorage so users can resume if they navigate away.
 *
 * @param onRestore - Called on mount with the saved data if a valid draft exists.
 *                    The caller distributes the data to the appropriate state setters.
 */
export function useFormPersistence<T>(
  onRestore: (data: T) => void
) {
  const [wasRestored, setWasRestored] = useState(false);

  useMountEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed: StoredDraft<T> = JSON.parse(stored);

      if (parsed.version !== VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      onRestore(parsed.data);
      setWasRestored(true);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  });

  const save = useCallback((data: T) => {
    try {
      const draft: StoredDraft<T> = {
        version: VERSION,
        data,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const dismissRestored = useCallback(() => {
    setWasRestored(false);
  }, []);

  return { save, clear, wasRestored, dismissRestored };
}
