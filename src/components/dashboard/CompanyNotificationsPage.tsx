"use client";

import { useCallback } from "react";
import { companyNotificationsApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { COMPANY_NOTIFICATION_READ_EVENT } from "@/lib/hooks/useCompanyNotificationCount";
import {
  getCompanyNotificationIcon,
  getCompanyNotificationColor,
  buildCompanyNotificationUrl,
} from "@/lib/company-notification-helpers";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";
import type { CompanyNotification } from "@/types";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "applications", label: "Applications", types: ["application_received", "application_status_change", "guild_report_ready"] },
  { key: "messages", label: "Messages", types: ["new_message", "meeting_scheduled"] },
  { key: "job_updates", label: "Job Updates", types: ["job_expired", "job_low_applications"] },
];

export default function CompanyNotificationsPageWrapper() {
  const { ready } = useRequireAuth("company");

  const fetchNotifications = useCallback(
    (params: { limit: number; offset: number }) => companyNotificationsApi.getNotifications(params),
    [],
  );

  const markAsRead = useCallback(
    (id: string) => companyNotificationsApi.markAsRead(id),
    [],
  );

  const markAllAsRead = useCallback(
    () => companyNotificationsApi.markAllAsRead(),
    [],
  );

  return (
    <NotificationsPage<CompanyNotification>
      subtitle="Stay updated with applications, messages, and job activity"
      ready={ready}
      fetchNotifications={fetchNotifications}
      markAsRead={markAsRead}
      markAllAsRead={markAllAsRead}
      readEventName={COMPANY_NOTIFICATION_READ_EVENT}
      getIcon={getCompanyNotificationIcon}
      getColor={getCompanyNotificationColor}
      buildUrl={buildCompanyNotificationUrl}
      filters={FILTERS}
    />
  );
}
