"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { notificationsApi } from "@/lib/api";

/**
 * Dispatch this event after marking notification(s) as read to instantly
 * refresh the unread count in the sidebar badge and notification bell.
 */
export const NOTIFICATION_READ_EVENT = "notification-read";

export function useNotificationCount(address: string | undefined, enabled: boolean) {
  const [count, setCount] = useState(0);
  const failedRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchCount = useCallback(async () => {
    if (!enabled || !address || failedRef.current) return;
    try {
      const result = await notificationsApi.getUnreadCount(address);
      if (mountedRef.current) {
        setCount(result?.count || 0);
      }
    } catch {
      // Stop polling on error (e.g. 404 for unregistered experts)
      failedRef.current = true;
    }
  }, [enabled, address]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !address) {
      setCount(0);
      return;
    }

    // Reset failure state when address/enabled changes
    failedRef.current = false;

    fetchCount();
    const interval = setInterval(fetchCount, 30000);

    // Instantly refresh when a notification is marked as read
    const handler = () => {
      failedRef.current = false;
      fetchCount();
    };
    window.addEventListener(NOTIFICATION_READ_EVENT, handler);

    return () => {
      clearInterval(interval);
      window.removeEventListener(NOTIFICATION_READ_EVENT, handler);
    };
  }, [enabled, address, fetchCount]);

  return count;
}
