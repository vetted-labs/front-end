import {
  Bell,
  FileText,
  Award,
  Coins,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Notification } from "@/types";

export type { Notification };

export function getNotificationIcon(type: string): LucideIcon {
  switch (type) {
    case "proposal_new":
    case "proposal_deadline":
    case "application_new":
    case "application_deadline":
      return FileText;
    case "application_status":
      return Award;
    case "guild_application":
      return Users;
    case "reward_earned":
      return Coins;
    default:
      return Bell;
  }
}

export function getNotificationColor(type: string): string {
  switch (type) {
    case "proposal_new":
    case "proposal_deadline":
    case "application_new":
    case "application_deadline":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "application_status":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "guild_application":
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400";
    case "reward_earned":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getApplicantTypeTag(applicantType?: "expert" | "candidate"): { label: string; className: string } | null {
  if (!applicantType) return null;
  if (applicantType === "expert") {
    return { label: "Expert", className: "bg-purple-500/15 text-purple-400" };
  }
  return { label: "Candidate", className: "bg-blue-500/15 text-blue-400" };
}

export { formatTimeAgo } from "@/lib/utils";

const NOTIFICATION_FALLBACK_URL = "/expert/notifications";

/**
 * Build a navigation URL from a notification, enriching guild application links
 * with the membership applications tab and applicationId.
 */
export function buildNotificationUrl(notification: Notification): string {
  try {
    if (!notification.link) return NOTIFICATION_FALLBACK_URL;

    const url = new URL(notification.link, window.location.origin);
    if (notification.type === "guild_application") {
      if (!url.searchParams.has("tab")) {
        url.searchParams.set("tab", "membershipApplications");
      }
      if (notification.applicationId && !url.searchParams.has("applicationId")) {
        url.searchParams.set("applicationId", notification.applicationId);
      }
    }
    return url.pathname + url.search;
  } catch {
    console.warn("Invalid notification link:", notification.link);
    return NOTIFICATION_FALLBACK_URL;
  }
}
