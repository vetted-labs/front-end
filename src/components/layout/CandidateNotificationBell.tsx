"use client";

import { useCallback } from "react";
import { candidateNotificationsApi } from "@/lib/api";
import { useCandidateNotificationCount, CANDIDATE_NOTIFICATION_READ_EVENT } from "@/lib/hooks/useCandidateNotificationCount";
import { getCandidateNotificationIcon, getCandidateNotificationColor, buildCandidateNotificationUrl } from "@/lib/candidate-notification-helpers";
import { useAuthContext } from "@/hooks/useAuthContext";
import { NotificationBellDropdown } from "./NotificationBellDropdown";
import type { CandidateNotification } from "@/types";

export function CandidateNotificationBell() {
  const { userType } = useAuthContext();
  const isCandidate = userType === "candidate";
  const unreadCount = useCandidateNotificationCount(isCandidate);

  const fetchRecent = useCallback(async () => {
    const result = await candidateNotificationsApi.getNotifications({ limit: 5 });
    return result?.notifications ?? [];
  }, []);

  const markAsRead = useCallback(
    (id: string) => candidateNotificationsApi.markAsRead(id),
    [],
  );

  return (
    <NotificationBellDropdown<CandidateNotification>
      unreadCount={unreadCount}
      fetchRecent={fetchRecent}
      markAsRead={markAsRead}
      getIcon={getCandidateNotificationIcon}
      getColor={getCandidateNotificationColor}
      buildUrl={buildCandidateNotificationUrl}
      viewAllHref="/candidate/notifications"
      readEventName={CANDIDATE_NOTIFICATION_READ_EVENT}
    />
  );
}
