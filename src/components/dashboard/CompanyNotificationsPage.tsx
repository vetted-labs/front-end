"use client";

import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { NotificationsShell } from "@/components/notifications/NotificationsShell";

export default function CompanyNotificationsPageWrapper() {
  const { ready } = useRequireAuth("company");
  return <NotificationsShell userType="company" ready={ready} />;
}
