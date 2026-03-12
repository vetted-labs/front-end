"use client";

import { useCallback } from "react";
import { notificationsApi } from "@/lib/api";
import { useNotificationCountPolling } from "./useNotificationCountPolling";

/**
 * Dispatch this event after marking notification(s) as read to instantly
 * refresh the unread count in the sidebar badge and notification bell.
 */
export const NOTIFICATION_READ_EVENT = "notification-read";

export function useNotificationCount(address: string | undefined, enabled: boolean) {
  const isActive = enabled && !!address;
  const fetchFn = useCallback(
    () => notificationsApi.getUnreadCount(address!),
    [address],
  );
  return useNotificationCountPolling(fetchFn, NOTIFICATION_READ_EVENT, isActive);
}
