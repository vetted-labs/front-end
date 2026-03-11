"use client";

import { useCallback } from "react";
import { candidateNotificationsApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { CANDIDATE_NOTIFICATION_READ_EVENT } from "@/lib/hooks/useCandidateNotificationCount";
import {
  getCandidateNotificationIcon,
  getCandidateNotificationColor,
  buildCandidateNotificationUrl,
} from "@/lib/candidate-notification-helpers";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";
import type { CandidateNotification } from "@/types";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "applications", label: "Applications", types: ["application_status_change", "application_accepted", "application_rejected", "interview_scheduled"] },
  { key: "messages", label: "Messages", types: ["new_message"] },
];

export default function CandidateNotificationsPageWrapper() {
  const { ready } = useRequireAuth("candidate");

  const fetchNotifications = useCallback(
    (params: { limit: number; offset: number }) => candidateNotificationsApi.getNotifications(params),
    [],
  );

  const markAsRead = useCallback(
    (id: string) => candidateNotificationsApi.markAsRead(id),
    [],
  );

  const markAllAsRead = useCallback(
    () => candidateNotificationsApi.markAllAsRead(),
    [],
  );

  return (
    <NotificationsPage<CandidateNotification>
      subtitle="Stay updated with your applications, interviews, and messages"
      ready={ready}
      fetchNotifications={fetchNotifications}
      markAsRead={markAsRead}
      markAllAsRead={markAllAsRead}
      readEventName={CANDIDATE_NOTIFICATION_READ_EVENT}
      getIcon={getCandidateNotificationIcon}
      getColor={getCandidateNotificationColor}
      buildUrl={buildCandidateNotificationUrl}
      filters={FILTERS}
    />
  );
}
