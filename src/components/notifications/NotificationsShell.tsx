"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Settings,
  Sparkles,
  Inbox,
  Briefcase,
  LayoutDashboard,
  ArrowUpRight,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useApi, useFetch } from "@/lib/hooks/useFetch";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";

import {
  candidateNotificationsApi,
  companyNotificationsApi,
  notificationsApi,
  extractApiError,
} from "@/lib/api";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

import {
  COMPANY_NOTIFICATION_READ_EVENT,
} from "@/lib/hooks/useCompanyNotificationCount";
import {
  CANDIDATE_NOTIFICATION_READ_EVENT,
} from "@/lib/hooks/useCandidateNotificationCount";
import { NOTIFICATION_READ_EVENT } from "@/lib/hooks/useNotificationCount";

import {
  getCompanyNotificationIcon,
  buildCompanyNotificationUrl,
} from "@/lib/company-notification-helpers";
import {
  getCandidateNotificationIcon,
  buildCandidateNotificationUrl,
} from "@/lib/candidate-notification-helpers";
import {
  getNotificationIcon,
  isDeadlineNotification,
  getApplicantTypeTag,
  buildNotificationUrl,
  formatTimeAgo,
} from "@/lib/notification-helpers";

import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CountdownBadge } from "@/components/ui/countdown-badge";
import { GuildBadge } from "@/components/ui/guild";
import { STATUS_COLORS, getNotificationPriority } from "@/config/colors";
import { DataSection } from "@/lib/motion";
import { NotificationSettingsModal } from "./NotificationSettingsModal";
import {
  TOUR_TARGETS,
  dataTourTarget,
} from "@/components/expert/onboarding/tourTargets";
import {
  STORY_LAB_NOTIFICATION_RESULT_ID,
  withStoryLabNotifications,
} from "@/components/expert/story-lab/storyLabFixtures";

import type {
  BaseNotification,
  CandidateNotification,
  CompanyNotification,
  Notification as ExpertNotification,
} from "@/types";

const NOTIFICATIONS_PER_PAGE = 20;

export type NotificationsUserType = "company" | "candidate" | "expert";

export interface NotificationsShellProps {
  userType: NotificationsUserType;
  /** Optional eyebrow override; default is `userType` upper-cased. */
  eyebrow?: string;
  /**
   * For company/candidate variants the parent page must gate via
   * `useRequireAuth(...)` and pass the resulting `ready` flag here.
   * Expert mode reads readiness from `useExpertAccount()` internally.
   */
  ready?: boolean;
  /**
   * Optional initial filter key (must match one of the filter tabs for the
   * given `userType`). Used by deep-link URLs like
   * `/expert/notifications?type=guild_feed` to preselect a tab on first render.
   * Unknown keys are ignored and the default ("all") is used.
   */
  initialFilter?: string;
}

interface FilterDef {
  key: string;
  label: string;
  /** Notification types belonging to this filter. */
  types?: string[];
}

const COMPANY_FILTERS: FilterDef[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  {
    key: "applications",
    label: "Applications",
    types: ["application_received", "application_status_change", "guild_report_ready"],
  },
  { key: "messages", label: "Messages", types: ["new_message", "meeting_scheduled"] },
  { key: "job_updates", label: "Job updates", types: ["job_expired", "job_low_applications"] },
];

const CANDIDATE_FILTERS: FilterDef[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  {
    key: "applications",
    label: "Applications",
    types: [
      "application_status_change",
      "application_accepted",
      "application_rejected",
      "interview_scheduled",
    ],
  },
  { key: "messages", label: "Messages", types: ["new_message"] },
];

const EXPERT_FILTERS: FilterDef[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  {
    key: "reviews",
    label: "Reviews",
    types: [
      "proposal_new",
      "proposal_deadline",
      "application_new",
      "application_deadline",
      "application_status",
    ],
  },
  { key: "rewards", label: "Rewards", types: ["reward_earned"] },
  { key: "guild", label: "Guild", types: ["guild_application"] },
  {
    key: "guild_feed",
    label: "Guild feed",
    types: ["guild_post_reply", "guild_post_mention"],
  },
];

const FILTER_DEFS: Record<NotificationsUserType, FilterDef[]> = {
  company: COMPANY_FILTERS,
  candidate: CANDIDATE_FILTERS,
  expert: EXPERT_FILTERS,
};

const COPY: Record<NotificationsUserType, { eyebrow: string; subtitle: string; emptyCta: { href: string; label: string } }> = {
  company: {
    eyebrow: "COMPANY",
    subtitle: "Stay updated with applications, messages, and job activity.",
    emptyCta: { href: "/dashboard", label: "Visit your dashboard" },
  },
  candidate: {
    eyebrow: "CANDIDATE",
    subtitle: "Stay updated with your applications, interviews, and messages.",
    emptyCta: { href: "/browse/jobs", label: "Browse jobs" },
  },
  expert: {
    eyebrow: "EXPERT",
    subtitle: "Reviews, rewards, and guild activity at a glance.",
    emptyCta: { href: "/expert/dashboard", label: "Go to dashboard" },
  },
};

const READ_EVENT_BY_TYPE: Record<NotificationsUserType, string> = {
  company: COMPANY_NOTIFICATION_READ_EVENT,
  candidate: CANDIDATE_NOTIFICATION_READ_EVENT,
  expert: NOTIFICATION_READ_EVENT,
};

/** Generic shape carrying just the visual fields the row renders. */
interface NormalizedNotification extends BaseNotification {
  guildName?: string;
  applicantType?: "expert" | "candidate";
}

function groupByDate<T extends BaseNotification>(notifications: T[]): { label: string; items: T[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: T[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] },
  ];

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    if (d >= today) groups[0].items.push(n);
    else if (d >= yesterday) groups[1].items.push(n);
    else if (d >= weekAgo) groups[2].items.push(n);
    else groups[3].items.push(n);
  }

  return groups.filter((g) => g.items.length > 0);
}

function getPriorityStyles(type: string): {
  stripe: string;
  iconBg: string;
  isUrgent: boolean;
} {
  const priority = getNotificationPriority(type);
  switch (priority) {
    case "urgent":
      return { stripe: "bg-negative", iconBg: "bg-negative/12 text-negative", isUrgent: true };
    case "positive":
      return { stripe: "bg-positive", iconBg: "bg-positive/12 text-positive", isUrgent: false };
    case "action":
      return { stripe: "bg-primary", iconBg: "bg-primary/12 text-primary", isUrgent: false };
    default:
      return { stripe: "bg-info-blue", iconBg: "bg-info-blue/12 text-info-blue", isUrgent: false };
  }
}

/**
 * Normalize the per-user-type notification into the shared shape used by the
 * row renderer. For expert notifications we forward the optional guildName
 * and applicantType passthrough fields.
 */
function normalize(
  userType: NotificationsUserType,
  n: CompanyNotification | CandidateNotification | ExpertNotification,
): NormalizedNotification {
  if (userType === "expert") {
    const e = n as ExpertNotification;
    return {
      id: e.id,
      type: e.type,
      title: e.title,
      message: e.message,
      link: e.link,
      isRead: e.isRead,
      readAt: e.readAt,
      createdAt: e.createdAt,
      expiresAt: e.expiresAt,
      applicationId: e.applicationId,
      guildName: e.guildName,
      applicantType: e.applicantType,
    };
  }
  return n as BaseNotification;
}

function getIconFor(userType: NotificationsUserType, type: string): LucideIcon {
  if (userType === "company") return getCompanyNotificationIcon(type);
  if (userType === "candidate") return getCandidateNotificationIcon(type);
  return getNotificationIcon(type);
}

function buildUrlFor(
  userType: NotificationsUserType,
  notification: NormalizedNotification,
  raw: CompanyNotification | CandidateNotification | ExpertNotification,
): string {
  if (userType === "company") return buildCompanyNotificationUrl(raw as CompanyNotification);
  if (userType === "candidate") return buildCandidateNotificationUrl(raw as CandidateNotification);
  // Expert builder requires the full Notification (uses applicationId / type).
  return buildNotificationUrl({
    ...(raw as ExpertNotification),
    applicationId: notification.applicationId,
  } as ExpertNotification);
}

export function NotificationsShell({
  userType,
  eyebrow,
  ready: readyProp,
  initialFilter,
}: NotificationsShellProps) {
  // Expert auth is wallet-based and resolved internally; company/candidate
  // pages must pass `ready` from `useRequireAuth(...)`.
  const expert = useExpertAccount();
  const { isActive: isStoryLabPreview } = useStoryLabContext();

  const ready =
    userType === "expert"
      ? expert.isConnected && !!expert.address
      : (readyProp ?? false);

  const router = useRouter();
  const filters = FILTER_DEFS[userType];
  const copy = COPY[userType];
  const readEventName = READ_EVENT_BY_TYPE[userType];

  const defaultFilterKey = filters[0]?.key ?? "all";
  const resolvedInitialFilter = useMemo(() => {
    if (!initialFilter) return defaultFilterKey;
    return filters.some((f) => f.key === initialFilter)
      ? initialFilter
      : defaultFilterKey;
  }, [initialFilter, filters, defaultFilterKey]);
  const [activeFilter, setActiveFilter] = useState<string>(resolvedInitialFilter);
  const [allNotifications, setAllNotifications] = useState<
    Array<CompanyNotification | CandidateNotification | ExpertNotification>
  >([]);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { execute: executeMarkAll, isLoading: isMarkingAllRead } = useApi();

  const fetchPage = useCallback(
    async (offset: number) => {
      if (userType === "company") {
        return companyNotificationsApi.getNotifications({
          limit: NOTIFICATIONS_PER_PAGE,
          offset,
        });
      }
      if (userType === "candidate") {
        return candidateNotificationsApi.getNotifications({
          limit: NOTIFICATIONS_PER_PAGE,
          offset,
        });
      }
      if (!expert.address) {
        throw new Error("Wallet not connected");
      }
      return notificationsApi.getNotifications(expert.address, {
        limit: NOTIFICATIONS_PER_PAGE,
        offset,
      });
    },
    [userType, expert.address],
  );

  const { isLoading, error } = useFetch(() => fetchPage(0), {
    skip: !ready,
    onSuccess: (result) => {
      const data = result?.notifications ?? [];
      const final =
        userType === "expert" && isStoryLabPreview
          ? withStoryLabNotifications(data as ExpertNotification[])
          : data;
      setAllNotifications(final);
      setHasMore(data.length >= NOTIFICATIONS_PER_PAGE);
    },
  });

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchPage(allNotifications.length);
      const moreData = result?.notifications ?? [];
      if (moreData.length === 0) {
        setHasMore(false);
      } else {
        setAllNotifications((prev) => [...prev, ...moreData]);
        setHasMore(moreData.length >= NOTIFICATIONS_PER_PAGE);
      }
    } catch (err) {
      logger.error("Error loading more notifications", err, { silent: true });
      toast.error(extractApiError(err, "Failed to load more notifications"));
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, fetchPage, allNotifications.length]);

  const markOneAsRead = useCallback(
    async (id: string) => {
      if (userType === "company") {
        await companyNotificationsApi.markAsRead(id);
      } else if (userType === "candidate") {
        await candidateNotificationsApi.markAsRead(id);
      } else {
        if (!expert.address) return;
        await notificationsApi.markAsRead(id, expert.address);
      }
    },
    [userType, expert.address],
  );

  const markAllAsRead = useCallback(async () => {
    if (userType === "company") {
      await companyNotificationsApi.markAllAsRead();
    } else if (userType === "candidate") {
      await candidateNotificationsApi.markAllAsRead();
    } else {
      if (!expert.address) return;
      await notificationsApi.markAllAsRead(expert.address);
    }
  }, [userType, expert.address]);

  const handleNotificationClick = async (
    raw: CompanyNotification | CandidateNotification | ExpertNotification,
  ) => {
    const normalized = normalize(userType, raw);
    setClickedId(normalized.id);
    try {
      if (!normalized.isRead) {
        await markOneAsRead(normalized.id);
        setAllNotifications((prev) =>
          prev.map((n) =>
            n.id === normalized.id
              ? ({ ...n, isRead: true, readAt: new Date().toISOString() } as typeof n)
              : n,
          ),
        );
        window.dispatchEvent(new Event(readEventName));
      }
      router.push(buildUrlFor(userType, normalized, raw));
    } catch (err) {
      logger.error("Error marking notification as read", err, { silent: true });
      toast.error(extractApiError(err, "Failed to mark notification as read"));
      setClickedId(null);
      router.push(buildUrlFor(userType, normalized, raw));
    }
  };

  const handleMarkAllAsRead = async () => {
    await executeMarkAll(() => markAllAsRead(), {
      onSuccess: () => {
        setAllNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }) as typeof n),
        );
        window.dispatchEvent(new Event(readEventName));
      },
      onError: (errorMsg) => {
        logger.error("Error marking all as read", errorMsg, { silent: true });
        toast.error(errorMsg || "Failed to mark all notifications as read");
      },
    });
  };

  // Counts + filtering ------------------------------------------------------

  const unreadCount = useMemo(
    () => allNotifications.filter((n) => !n.isRead).length,
    [allNotifications],
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return allNotifications;
    if (activeFilter === "unread") return allNotifications.filter((n) => !n.isRead);
    const filterConfig = filters.find((f) => f.key === activeFilter);
    if (!filterConfig?.types) return allNotifications;
    return allNotifications.filter((n) => filterConfig.types!.includes(n.type));
  }, [activeFilter, allNotifications, filters]);

  const filterTabs = useMemo(
    () =>
      filters.map((f) => {
        let count = 0;
        if (f.key === "all") count = allNotifications.length;
        else if (f.key === "unread") count = unreadCount;
        else if (f.types) count = allNotifications.filter((n) => f.types!.includes(n.type)).length;
        return { ...f, count };
      }),
    [filters, allNotifications, unreadCount],
  );

  const dateGroups = useMemo(
    () => groupByDate(filteredNotifications.map((n) => normalize(userType, n))),
    [filteredNotifications, userType],
  );

  // First deadline-typed expert notification (used to gate a tour target).
  const firstDeadlineId =
    userType === "expert"
      ? filteredNotifications.find((n) =>
          isDeadlineNotification(n.type),
        )?.id ?? null
      : null;

  if (userType !== "expert" && !ready) return null;

  if (userType === "expert" && (!expert.isConnected || !expert.address)) {
    return (
      <div className="min-h-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Alert variant="info">Connect your wallet to view notifications.</Alert>
        </div>
      </div>
    );
  }

  // Render -------------------------------------------------------------------

  const heroTourTarget =
    userType === "expert" ? dataTourTarget(TOUR_TARGETS.notificationsHeader) : {};
  const filterTourTarget =
    userType === "expert" ? dataTourTarget(TOUR_TARGETS.notificationsFilterTabs) : {};
  const listTourTarget =
    userType === "expert" ? dataTourTarget(TOUR_TARGETS.notificationsList) : {};
  const markAllTourTarget =
    userType === "expert" ? dataTourTarget(TOUR_TARGETS.notificationsMarkAllRead) : {};

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-[1]">
        {/* Hero */}
        <header
          className="flex items-start justify-between mb-9 flex-wrap gap-6"
          {...heroTourTarget}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">
              <Sparkles className="inline w-3 h-3 -mt-0.5 mr-1 opacity-70" />
              {eyebrow ?? copy.eyebrow}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.05] mb-3">
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              {copy.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <span
                className="inline-flex items-center gap-2 bg-primary/15 border border-primary/25 text-primary text-sm font-medium px-3.5 py-1 rounded-full"
                style={{ animation: "notif-badge-pulse 2s ease-in-out infinite" }}
              >
                <span className="w-[7px] h-[7px] bg-primary rounded-full animate-pulse" />
                {unreadCount} new
              </span>
            )}
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={isLoading || isMarkingAllRead || unreadCount === 0}
              className="inline-flex items-center gap-2 bg-card border border-border text-muted-foreground text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-muted/30 hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              {...markAllTourTarget}
            >
              {isMarkingAllRead ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Mark all read
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 grid place-items-center bg-card border border-border text-muted-foreground rounded-lg hover:bg-muted/30 hover:text-foreground transition-all"
              aria-label="Notification settings"
            >
              <Settings className="w-[18px] h-[18px]" />
            </button>
          </div>
        </header>

        {/* Filter rail */}
        <div
          className="flex flex-wrap sm:flex-nowrap gap-2 mb-9 overflow-x-auto pb-1 scrollbar-none"
          {...filterTourTarget}
        >
          {filterTabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeFilter === key
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`px-2 py-px text-xs font-medium rounded-lg ${
                    activeFilter === key ? "bg-primary/20" : "bg-muted/40"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <DataSection
          isLoading={isLoading}
          skeleton={
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 px-6 py-5 bg-card border border-border rounded-xl"
                >
                  <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <div {...listTourTarget}>
            {error ? (
              <div className="flex items-center justify-center py-20">
                <Alert variant="error">{error}</Alert>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <EmptyNotifications
                userType={userType}
                activeFilter={activeFilter}
                ctaHref={copy.emptyCta.href}
                ctaLabel={copy.emptyCta.label}
              />
            ) : (
              <div className="space-y-8">
                {dateGroups.map((group) => (
                  <div key={group.label}>
                    <p className="font-display text-xs font-bold tracking-[1.5px] uppercase text-muted-foreground/50 mb-4 pl-1">
                      {group.label}
                    </p>
                    <div className="space-y-3">
                      {group.items.map((notification) => {
                        const Icon = getIconFor(userType, notification.type);
                        const isUnread = !notification.isRead;
                        const isClicked = clickedId === notification.id;
                        const isDeadline =
                          userType === "expert" && isDeadlineNotification(notification.type);
                        const applicantTag =
                          userType === "expert" && notification.type === "guild_application"
                            ? getApplicantTypeTag(notification.applicantType)
                            : null;
                        const { stripe, iconBg, isUrgent } = getPriorityStyles(notification.type);
                        const raw = allNotifications.find((n) => n.id === notification.id);
                        if (!raw) return null;

                        const tourProps =
                          userType === "expert"
                            ? isStoryLabPreview &&
                              notification.id === STORY_LAB_NOTIFICATION_RESULT_ID
                              ? dataTourTarget(TOUR_TARGETS.notificationResultCard)
                              : notification.id === firstDeadlineId
                                ? dataTourTarget(TOUR_TARGETS.notificationsActionGroup)
                                : {}
                            : {};

                        return (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => handleNotificationClick(raw)}
                            disabled={isClicked}
                            {...tourProps}
                            className={`group w-full flex items-start gap-4 px-6 py-5 bg-card border border-border rounded-xl relative overflow-hidden cursor-pointer text-left transition-all duration-200 hover:bg-muted/30 hover:border-border hover:translate-y-[-1px] ${
                              isClicked ? "opacity-60 cursor-wait" : ""
                            } ${isUnread ? "" : "opacity-60"} ${
                              isUrgent ? "border-negative/12" : ""
                            }`}
                            style={
                              isUrgent
                                ? { animation: "notif-urgent-glow 3s ease-in-out infinite" }
                                : undefined
                            }
                          >
                            <div
                              className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-r ${stripe}`}
                            />
                            <div
                              className={`relative w-12 h-12 rounded-xl grid place-items-center shrink-0 ${iconBg}`}
                            >
                              {isClicked ? (
                                <Loader2 className="w-[22px] h-[22px] animate-spin" />
                              ) : (
                                <Icon className="w-[22px] h-[22px]" />
                              )}
                              {isUnread && (
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background animate-pulse" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3
                                  className={`text-sm leading-snug ${
                                    isUnread
                                      ? "font-semibold text-foreground"
                                      : "font-medium text-foreground"
                                  } ${isDeadline ? STATUS_COLORS.warning.text : ""}`}
                                >
                                  {notification.title}
                                </h3>
                                {applicantTag && (
                                  <span
                                    className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wider rounded-full ${applicantTag.className}`}
                                  >
                                    {applicantTag.label}
                                  </span>
                                )}
                                {isDeadline && notification.expiresAt && (
                                  <CountdownBadge deadline={notification.expiresAt} label="Due" />
                                )}
                              </div>
                              <p
                                className={`text-[13.5px] leading-relaxed line-clamp-2 mb-2 ${
                                  isDeadline
                                    ? `${STATUS_COLORS.warning.text} font-medium`
                                    : isUnread
                                      ? "text-muted-foreground font-medium"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground/50 font-medium">
                                {notification.guildName && (
                                  <>
                                    <GuildBadge guild={notification.guildName} size="xs" />
                                    <span>&bull;</span>
                                  </>
                                )}
                                <span>{formatTimeAgo(notification.createdAt)}</span>
                                {notification.isRead && notification.readAt && (
                                  <>
                                    <span>&bull;</span>
                                    <Check className="w-3 h-3" />
                                    <span>Read</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {/* Quick mark-as-read on hover (no navigation). */}
                            <div
                              role="button"
                              tabIndex={-1}
                              aria-label="Mark as read"
                              className="shrink-0 w-8 h-8 rounded-lg grid place-items-center text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:bg-muted/30 hover:text-muted-foreground transition-all mt-1"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (notification.isRead) return;
                                try {
                                  await markOneAsRead(notification.id);
                                  setAllNotifications((prev) =>
                                    prev.map((n) =>
                                      n.id === notification.id
                                        ? ({
                                            ...n,
                                            isRead: true,
                                            readAt: new Date().toISOString(),
                                          } as typeof n)
                                        : n,
                                    ),
                                  );
                                  window.dispatchEvent(new Event(readEventName));
                                } catch {
                                  toast.error("Failed to mark notification as read");
                                }
                              }}
                            >
                              <X className="w-4 h-4" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {hasMore && filteredNotifications.length > 0 && (
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="w-full py-4 mt-4 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load more notifications"
              )}
            </button>
          )}
        </DataSection>
      </div>

      <NotificationSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

interface EmptyProps {
  userType: NotificationsUserType;
  activeFilter: string;
  ctaHref: string;
  ctaLabel: string;
}

function EmptyNotifications({ userType, activeFilter, ctaHref, ctaLabel }: EmptyProps) {
  const router = useRouter();
  const Icon =
    userType === "candidate"
      ? Briefcase
      : userType === "company"
        ? LayoutDashboard
        : Inbox;
  const headline =
    activeFilter === "unread"
      ? "All caught up"
      : activeFilter === "all"
        ? "No notifications yet"
        : `No ${activeFilter.replace("_", " ")} notifications`;
  const sub =
    activeFilter === "unread"
      ? "You're up to date — nothing new to review."
      : "When new activity comes in, it will appear here.";
  return (
    <div className="bg-card rounded-xl p-12 text-center border border-border">
      <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center">
        <Bell className="w-7 h-7" />
      </div>
      <h3 className="font-display text-xl font-bold text-foreground mb-2">{headline}</h3>
      <p className="text-sm text-muted-foreground mb-6">{sub}</p>
      <button
        type="button"
        onClick={() => router.push(ctaHref)}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Icon className="w-4 h-4" />
        {ctaLabel}
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default NotificationsShell;
