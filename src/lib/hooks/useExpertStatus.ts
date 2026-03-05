"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "expertStatus";

type ExpertStatus = string | null;

/**
 * Centralizes all reads/writes of `localStorage.getItem("expertStatus")`.
 * Provides cross-tab sync via the `storage` event and an in-tab custom event
 * so components in the same tab stay in sync when the value changes.
 */
export function useExpertStatus() {
  const [status, setStatus] = useState<ExpertStatus>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    // Cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setStatus(e.newValue);
      }
    };

    // Same-tab sync via custom event
    const onCustom = () => {
      setStatus(localStorage.getItem(STORAGE_KEY));
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("expertStatusChange", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("expertStatusChange", onCustom);
    };
  }, []);

  const setExpertStatus = useCallback((value: string) => {
    localStorage.setItem(STORAGE_KEY, value);
    setStatus(value);
    window.dispatchEvent(new Event("expertStatusChange"));
  }, []);

  const clearExpertStatus = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStatus(null);
    window.dispatchEvent(new Event("expertStatusChange"));
  }, []);

  return { expertStatus: status, setExpertStatus, clearExpertStatus };
}
