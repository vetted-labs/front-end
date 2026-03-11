"use client";

import { useCallback } from "react";
import { candidateNotificationsApi } from "@/lib/api";
import { useNotificationCountPolling } from "./useNotificationCountPolling";

export const CANDIDATE_NOTIFICATION_READ_EVENT = "candidate-notification-read";

export function useCandidateNotificationCount(enabled: boolean) {
  const fetchFn = useCallback(() => candidateNotificationsApi.getUnreadCount(), []);
  return useNotificationCountPolling(fetchFn, CANDIDATE_NOTIFICATION_READ_EVENT, enabled);
}
