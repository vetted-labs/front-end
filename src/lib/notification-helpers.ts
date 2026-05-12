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
import { getNotificationPriority, NOTIFICATION_COLORS, STATUS_COLORS } from "@/config/colors";
import { getGuildReviewUrl, type ReviewApplicantType } from "@/lib/review-routing";

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

/** Returns true for notification types that represent an approaching deadline. */
export function isDeadlineNotification(type: string): boolean {
  return type === "proposal_deadline" || type === "application_deadline";
}

export function getNotificationColor(type: string): string {
  const priority = getNotificationPriority(type);
  return NOTIFICATION_COLORS[priority].icon;
}

export function getApplicantTypeTag(applicantType?: "expert" | "candidate"): { label: string; className: string } | null {
  if (!applicantType) return null;
  if (applicantType === "expert") {
    return { label: "Expert", className: STATUS_COLORS.info.badge };
  }
  return { label: "Candidate", className: STATUS_COLORS.info.badge };
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

export function getCompanyNotificationIcon(type: string): LucideIcon {
  return COMPANY_ICON_MAP[type] ?? Bell;
}

export function getCompanyNotificationColor(type: string): string {
  return getNotificationColor(type);
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

export function getCandidateNotificationIcon(type: string): LucideIcon {
  return CANDIDATE_ICON_MAP[type] ?? Bell;
}

export function getCandidateNotificationColor(type: string): string {
  return getNotificationColor(type);
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
 * with the review modal route that `/expert/voting` consumes.
 */
export function buildNotificationUrl(notification: Notification): string {
  try {
    const rawUrl = notification.link || (
      notification.guildId
        ? `/expert/guild/${encodeURIComponent(notification.guildId)}`
        : ""
    );
    if (!rawUrl) return NOTIFICATION_FALLBACK_URL;

    const url = new URL(rawUrl, window.location.origin);
    if (notification.type === "guild_application") {
      const applicationId =
        notification.applicationId ||
        url.searchParams.get("applicationId") ||
        url.searchParams.get("candidateApplicationId");
      const guildId =
        notification.guildId ||
        url.pathname.match(/^\/expert\/guild\/([^/]+)/)?.[1];
      const queryApplicantType = url.searchParams.get("applicantType");
      const applicantType: ReviewApplicantType =
        notification.applicantType ??
        (queryApplicantType === "candidate" || queryApplicantType === "expert"
          ? queryApplicantType
          : url.searchParams.has("candidateApplicationId")
            ? "candidate"
            : "expert");

      if (applicationId && guildId) {
        return getGuildReviewUrl(guildId, applicationId, applicantType);
      }
    }
    return url.pathname + url.search;
  } catch {
    logger.warn("Invalid notification link", notification.link, { silent: true });
    return NOTIFICATION_FALLBACK_URL;
  }
}
