import {
  Bell,
  FileText,
  Award,
  Coins,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Notification } from "@/types";
import { logger } from "@/lib/logger";

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

// --- Company notification helpers ---

import {
  UserPlus,
  RefreshCw,
  FileCheck,
  MessageSquare,
  Calendar,
  Clock,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  XCircle,
  Briefcase,
} from "lucide-react";
import type { BaseNotification } from "@/types";

const COMPANY_ICON_MAP: Record<string, LucideIcon> = {
  application_received: UserPlus,
  application_status_change: RefreshCw,
  guild_report_ready: FileCheck,
  new_message: MessageSquare,
  meeting_scheduled: Calendar,
  job_expired: Clock,
  job_low_applications: AlertTriangle,
  weekly_summary: BarChart3,
};

const COMPANY_COLOR_MAP: Record<string, string> = {
  application_received: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  application_status_change: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  guild_report_ready: "bg-green-500/10 text-green-600 dark:text-green-400",
  new_message: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  meeting_scheduled: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  job_expired: "bg-red-500/10 text-red-600 dark:text-red-400",
  job_low_applications: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  weekly_summary: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
};

export function getCompanyNotificationIcon(type: string): LucideIcon {
  return COMPANY_ICON_MAP[type] ?? Bell;
}

export function getCompanyNotificationColor(type: string): string {
  return COMPANY_COLOR_MAP[type] ?? "bg-muted text-muted-foreground";
}

// --- Candidate notification helpers ---

const CANDIDATE_ICON_MAP: Record<string, LucideIcon> = {
  application_status_change: RefreshCw,
  application_accepted: CheckCircle,
  application_rejected: XCircle,
  interview_scheduled: Calendar,
  new_message: MessageSquare,
  job_recommendation: Briefcase,
};

const CANDIDATE_COLOR_MAP: Record<string, string> = {
  application_status_change: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  application_accepted: "bg-green-500/10 text-green-600 dark:text-green-400",
  application_rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
  interview_scheduled: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  new_message: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  job_recommendation: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

export function getCandidateNotificationIcon(type: string): LucideIcon {
  return CANDIDATE_ICON_MAP[type] ?? Bell;
}

export function getCandidateNotificationColor(type: string): string {
  return CANDIDATE_COLOR_MAP[type] ?? "bg-muted text-muted-foreground";
}

// --- Generic URL builder (works for any notification variant) ---

export function buildGenericNotificationUrl(notification: BaseNotification, fallbackUrl: string): string {
  try {
    if (!notification.link) return fallbackUrl;
    const url = new URL(notification.link, window.location.origin);
    return url.pathname + url.search;
  } catch {
    logger.warn("Invalid notification link", notification.link, { silent: true });
    return fallbackUrl;
  }
}

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
    logger.warn("Invalid notification link", notification.link, { silent: true });
    return NOTIFICATION_FALLBACK_URL;
  }
}
