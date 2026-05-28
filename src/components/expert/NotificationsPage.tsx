"use client";

import { useSearchParams } from "next/navigation";
import { NotificationsShell } from "@/components/notifications/NotificationsShell";

export default function ExpertNotificationsPage() {
  // Deep-link support: `/expert/notifications?type=guild_feed` preselects the
  // Guild feed tab (which surfaces `guild_post_reply` and `guild_post_mention`).
  // Unknown values fall back to the default filter inside the shell.
  const searchParams = useSearchParams();
  const initialFilter = searchParams?.get("type") ?? undefined;
  return (
    <NotificationsShell
      userType="expert"
      initialFilter={initialFilter}
    />
  );
}
