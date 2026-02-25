"use client";

import { useState, useEffect, useCallback } from "react";
import { notificationsApi } from "@/lib/api";

/**
 * Dispatch this event after marking notification(s) as read to instantly
 * refresh the unread count in the sidebar badge and notification bell.
 */
export const NOTIFICATION_READ_EVENT = "notification-read";

export function useNotificationCount(address: string | undefined, enabled: boolean) {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!enabled || !address) return;
    try {
      const result = await notificationsApi.getUnreadCount(address);
      setCount(result?.count || 0);
    } catch {
      // Silently fail — badge just won't show
    }
  }, [enabled, address]);

  useEffect(() => {
    if (!enabled || !address) {
      setCount(0);
      return;
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30000);

    // Instantly refresh when a notification is marked as read
    const handler = () => fetchCount();
    window.addEventListener(NOTIFICATION_READ_EVENT, handler);

    return () => {
      clearInterval(interval);
      window.removeEventListener(NOTIFICATION_READ_EVENT, handler);
    };
  }, [enabled, address, fetchCount]);

  return count;
}
