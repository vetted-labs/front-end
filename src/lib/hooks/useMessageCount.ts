"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { messagingApi } from "@/lib/api";

/**
 * Dispatch this event after marking messages as read to instantly
 * refresh the unread count in the sidebar badge.
 */
export const MESSAGE_READ_EVENT = "message-read";

export function useMessageCount(enabled: boolean) {
  const [count, setCount] = useState(0);
  const failedRef = useRef(false);

  const fetchCount = useCallback(async () => {
    if (!enabled || failedRef.current) return;
    // Skip if no auth token — prevents 401 spam before login completes
    const hasToken = localStorage.getItem("authToken") || localStorage.getItem("companyAuthToken");
    if (!hasToken) return;
    try {
      const result = await messagingApi.getUnreadCounts();
      setCount(result?.total || 0);
    } catch {
      // Stop polling if backend messaging endpoints don't exist yet (404/401).
      failedRef.current = true;
      setCount(0);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    failedRef.current = false;
    // Defer initial fetch so page content renders first
    const initialTimer = setTimeout(fetchCount, 500);
    const interval = setInterval(fetchCount, 15000);

    const handler = () => {
      failedRef.current = false;
      fetchCount();
    };
    window.addEventListener(MESSAGE_READ_EVENT, handler);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener(MESSAGE_READ_EVENT, handler);
    };
  }, [enabled, fetchCount]);

  return count;
}
