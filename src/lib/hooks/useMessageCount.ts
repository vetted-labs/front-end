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
    try {
      const result = await messagingApi.getUnreadCounts();
      setCount(result?.total || 0);
    } catch {
      // Stop polling if backend messaging endpoints don't exist yet (404).
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
    fetchCount();
    const interval = setInterval(fetchCount, 15000);

    const handler = () => {
      failedRef.current = false;
      fetchCount();
    };
    window.addEventListener(MESSAGE_READ_EVENT, handler);

    return () => {
      clearInterval(interval);
      window.removeEventListener(MESSAGE_READ_EVENT, handler);
    };
  }, [enabled, fetchCount]);

  return count;
}
