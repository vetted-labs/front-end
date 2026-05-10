"use client";

import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { NotificationsShell } from "@/components/notifications/NotificationsShell";

export default function CandidateNotificationsPageWrapper() {
  const { ready } = useRequireAuth("candidate");
  return <NotificationsShell userType="candidate" ready={ready} />;
}
