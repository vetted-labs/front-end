"use client";

import { useCallback } from "react";
import { companyNotificationsApi } from "@/lib/api";
import { useNotificationCountPolling } from "./useNotificationCountPolling";

export const COMPANY_NOTIFICATION_READ_EVENT = "company-notification-read";

export function useCompanyNotificationCount(enabled: boolean) {
  const fetchFn = useCallback(() => companyNotificationsApi.getUnreadCount(), []);
  return useNotificationCountPolling(fetchFn, COMPANY_NOTIFICATION_READ_EVENT, enabled);
}
