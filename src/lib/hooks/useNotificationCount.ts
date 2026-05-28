"use client";

import { useCallback, useMemo } from "react";
import { notificationsApi } from "@/lib/api";
import { useNotificationCountPolling } from "./useNotificationCountPolling";

/**
 * Dispatch this event after marking notification(s) as read to instantly
 * refresh the unread count in the sidebar badge and notification bell.
 */
export const NOTIFICATION_READ_EVENT = "notification-read";

export interface UseNotificationCountOptions {
  walletAddress?: string;
  enabled?: boolean;
  /**
   * Optional notification-type filter. When set, the unread count is scoped
   * to only these types (e.g. ["guild_post_reply", "guild_post_mention"]).
   * If the backend ignores the param, the hook still returns the full
   * unread count — callers should not crash on that.
   */
  types?: string[];
}

/**
 * Hook signatures:
 *   useNotificationCount(address, enabled)            // legacy positional form
 *   useNotificationCount({ walletAddress, enabled })  // object form
 *   useNotificationCount({ walletAddress, enabled, types: [...] })
 *
 * Returns the unread count as a number (kept for backwards-compat with all
 * existing call sites — see AppSidebar and NotificationBell).
 */
export function useNotificationCount(
  address: string | undefined,
  enabled: boolean,
): number;
export function useNotificationCount(opts: UseNotificationCountOptions): number;
export function useNotificationCount(
  addressOrOpts: string | UseNotificationCountOptions | undefined,
  maybeEnabled?: boolean,
): number {
  const isObjectForm =
    typeof addressOrOpts === "object" && addressOrOpts !== null;
  const address = isObjectForm
    ? (addressOrOpts as UseNotificationCountOptions).walletAddress
    : (addressOrOpts as string | undefined);
  const enabled = isObjectForm
    ? (addressOrOpts as UseNotificationCountOptions).enabled ?? true
    : !!maybeEnabled;
  const types = isObjectForm
    ? (addressOrOpts as UseNotificationCountOptions).types
    : undefined;

  // Stable key for the types array so useCallback deps don't churn.
  const typesKey = useMemo(
    () => (types && types.length > 0 ? [...types].sort().join(",") : ""),
    [types],
  );

  const isActive = enabled && !!address;
  const fetchFn = useCallback(
    () =>
      notificationsApi.getUnreadCount(
        address!,
        typesKey ? typesKey.split(",") : undefined,
      ),
    [address, typesKey],
  );
  return useNotificationCountPolling(fetchFn, NOTIFICATION_READ_EVENT, isActive);
}
