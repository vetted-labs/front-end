"use client";

import { useCallback } from "react";
import { companyNotificationsApi } from "@/lib/api";
import { useCompanyNotificationCount, COMPANY_NOTIFICATION_READ_EVENT } from "@/lib/hooks/useCompanyNotificationCount";
import { getCompanyNotificationIcon, getCompanyNotificationColor, buildCompanyNotificationUrl } from "@/lib/company-notification-helpers";
import { useAuthContext } from "@/hooks/useAuthContext";
import { NotificationBellDropdown } from "./NotificationBellDropdown";
import type { CompanyNotification } from "@/types";

export function CompanyNotificationBell() {
  const { userType } = useAuthContext();
  const isCompany = userType === "company";
  const unreadCount = useCompanyNotificationCount(isCompany);

  const fetchRecent = useCallback(async () => {
    const result = await companyNotificationsApi.getNotifications({ limit: 5 });
    return result?.notifications ?? [];
  }, []);

  const markAsRead = useCallback(
    (id: string) => companyNotificationsApi.markAsRead(id),
    [],
  );

  return (
    <NotificationBellDropdown<CompanyNotification>
      unreadCount={unreadCount}
      fetchRecent={fetchRecent}
      markAsRead={markAsRead}
      getIcon={getCompanyNotificationIcon}
      getColor={getCompanyNotificationColor}
      buildUrl={buildCompanyNotificationUrl}
      viewAllHref="/dashboard/notifications"
      readEventName={COMPANY_NOTIFICATION_READ_EVENT}
    />
  );
}
