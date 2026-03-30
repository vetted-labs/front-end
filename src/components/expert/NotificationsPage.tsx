"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import {
  Check,
  CheckCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { notificationsApi, extractApiError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { toast } from "sonner";

const NOTIFICATIONS_PER_PAGE = 20;
import { NOTIFICATION_READ_EVENT } from "@/lib/hooks/useNotificationCount";
import {
  type Notification,
  getNotificationIcon,
  getNotificationColor,
  isDeadlineNotification,
  getApplicantTypeTag,
  formatTimeAgo,
  buildNotificationUrl,
} from "@/lib/notification-helpers";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CountdownBadge } from "@/components/ui/countdown-badge";
import { STATUS_COLORS } from "@/config/colors";
import { DataSection } from "@/lib/motion";

type FilterType = "all" | "reviews" | "rewards" | "guild" | "system";

export default function NotificationsPage() {
  const router = useRouter();
  const { address, isConnected } = useExpertAccount();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [clickedNotificationId, setClickedNotificationId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const { execute: executeLoadMore, isLoading: isLoadingMore } = useApi();
  const { execute: executeMarkAllRead, isLoading: isMarkingAllRead } = useApi();

  const { isLoading, error } = useFetch(
    () => notificationsApi.getNotifications(address!, { limit: NOTIFICATIONS_PER_PAGE, offset: 0 }),
    {
      skip: !isConnected || !address,
      onSuccess: (result) => {
        const notificationsData = result?.notifications ?? [];
        setAllNotifications(notificationsData);
        setHasMore(notificationsData.length >= NOTIFICATIONS_PER_PAGE);
      },
    }
  );

  const loadMore = useCallback(async () => {
    if (!address || isLoadingMore || !hasMore) return;

    await executeLoadMore(
      () => notificationsApi.getNotifications(address, {
        limit: NOTIFICATIONS_PER_PAGE,
        offset: allNotifications.length,
      }),
      {
        onSuccess: (result) => {
          const typed = result as { notifications?: Notification[] } | undefined;
          const moreData = typed?.notifications ?? [];
          if (moreData.length === 0) {
            setHasMore(false);
          } else {
            setAllNotifications((prev) => [...prev, ...moreData]);
            setHasMore(moreData.length >= NOTIFICATIONS_PER_PAGE);
          }
        },
        onError: (err) => toast.error(err),
      }
    );
  }, [address, isLoadingMore, hasMore, allNotifications.length, executeLoadMore]);


  const handleNotificationClick = async (notification: Notification) => {
    if (!address) return;

    setClickedNotificationId(notification.id);

    try {
      // Mark as read if not already read
      if (!notification.isRead) {
        await notificationsApi.markAsRead(notification.id, address);

        // Update local state
        const updateFn = (n: Notification) =>
          n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n;

        setAllNotifications((prev) => prev.map(updateFn));
        window.dispatchEvent(new Event(NOTIFICATION_READ_EVENT));
      }

      // Build navigation URL, enriching guild application links with applicationId
      const navUrl = buildNotificationUrl(notification);
      router.push(navUrl);
    } catch (err) {
      logger.error("Error marking notification as read", err, { silent: true });
      toast.error(extractApiError(err, "Failed to mark notification as read"));
      setClickedNotificationId(null);
      // Still navigate even if marking as read fails
      const navUrl = buildNotificationUrl(notification);
      router.push(navUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!address) return;

    await executeMarkAllRead(
      () => notificationsApi.markAllAsRead(address),
      {
        onSuccess: () => {
          setAllNotifications((prev) =>
            prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
          );
          window.dispatchEvent(new Event(NOTIFICATION_READ_EVENT));
        },
        onError: (err) => toast.error(err),
      }
    );
  };

  // Calculate badge counts from ALL notifications (not filtered)
  const unreadCount = allNotifications.filter((n) => !n.isRead).length;
  const reviewsCount = allNotifications.filter((n) =>
    n.type === "proposal_new" || n.type === "proposal_deadline" ||
    n.type === "application_new" || n.type === "application_deadline" ||
    n.type === "application_status"
  ).length;
  const rewardCount = allNotifications.filter((n) => n.type === "reward_earned").length;
  const guildCount = allNotifications.filter((n) => n.type === "guild_application").length;
  const systemCount = allNotifications.filter((n) =>
    n.type !== "proposal_new" && n.type !== "proposal_deadline" &&
    n.type !== "application_new" && n.type !== "application_deadline" &&
    n.type !== "application_status" && n.type !== "reward_earned" &&
    n.type !== "guild_application"
  ).length;

  // Filter notifications for display only (client-side filtering)
  const filteredNotifications =
    activeFilter === "all"
      ? allNotifications
      : activeFilter === "reviews"
      ? allNotifications.filter((n) =>
          n.type === "proposal_new" || n.type === "proposal_deadline" ||
          n.type === "application_new" || n.type === "application_deadline" ||
          n.type === "application_status"
        )
      : activeFilter === "rewards"
      ? allNotifications.filter((n) => n.type === "reward_earned")
      : activeFilter === "guild"
      ? allNotifications.filter((n) => n.type === "guild_application")
      : allNotifications.filter((n) =>
          n.type !== "proposal_new" && n.type !== "proposal_deadline" &&
          n.type !== "application_new" && n.type !== "application_deadline" &&
          n.type !== "application_status" && n.type !== "reward_earned" &&
          n.type !== "guild_application"
        );

  // Group filtered notifications by date
  const dateGroups = (() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const groups: { label: string; items: typeof filteredNotifications }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "This Week", items: [] },
      { label: "Earlier", items: [] },
    ];
    for (const n of filteredNotifications) {
      const d = new Date(n.createdAt);
      if (d >= today) groups[0].items.push(n);
      else if (d >= yesterday) groups[1].items.push(n);
      else if (d >= weekAgo) groups[2].items.push(n);
      else groups[3].items.push(n);
    }
    return groups.filter((g) => g.items.length > 0);
  })();

  // Priority stripe helper
  const getPriorityStyles = (type: string) => {
    if (isDeadlineNotification(type)) {
      return { stripe: "bg-negative", iconBg: "bg-negative/12 text-negative", isUrgent: true };
    }
    if (type === "reward_earned") {
      return { stripe: "bg-positive", iconBg: "bg-positive/12 text-positive", isUrgent: false };
    }
    if (type === "guild_application" || type === "application_new" || type === "proposal_new") {
      return { stripe: "bg-primary", iconBg: "bg-primary/12 text-primary", isUrgent: false };
    }
    return { stripe: "bg-info-blue", iconBg: "bg-info-blue/12 text-info-blue", isUrgent: false };
  };

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-[1]">
        {/* Header */}
        <div className="flex items-center justify-between mb-9 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span
                className="inline-flex items-center gap-2 bg-primary/15 border border-primary/25 text-primary text-sm font-medium px-3.5 py-1 rounded-full"
                style={{ animation: "notif-badge-pulse 2s ease-in-out infinite" }}
              >
                <span className="w-[7px] h-[7px] bg-primary rounded-full animate-pulse" />
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAllAsRead}
              disabled={isLoading || isMarkingAllRead || unreadCount === 0}
              className="inline-flex items-center gap-2 bg-card border border-border text-muted-foreground text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-muted/30 hover:border-border hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMarkingAllRead ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Mark all read
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-9 overflow-x-auto pb-1 scrollbar-none">
          {(
            [
              { key: "all", label: "All", count: allNotifications.length },
              { key: "reviews", label: "Reviews", count: reviewsCount },
              { key: "rewards", label: "Rewards", count: rewardCount },
              { key: "guild", label: "Guild", count: guildCount },
              { key: "system", label: "System", count: systemCount },
            ] as { key: FilterType; label: string; count: number }[]
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeFilter === key
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-muted/30 hover:border-border hover:text-foreground"
              }`}
            >
              {label}
              {!isLoading && count > 0 && (
                <span className={`px-2 py-px text-xs font-medium rounded-lg ${
                  activeFilter === key ? "bg-primary/20" : "bg-muted/40"
                }`}>
                  {key === "all" && unreadCount > 0 ? unreadCount : count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notification list area */}
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
          {error ? (
            <div className="flex items-center justify-center py-20">
              <Alert variant="error">{error}</Alert>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-card rounded-xl p-12 text-center border border-border">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                {activeFilter === "all"
                  ? "You have no notifications yet."
                  : `No ${activeFilter} notifications found.`}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {dateGroups.map((group) => (
                <div key={group.label}>
                  <p className="font-display text-xs font-bold tracking-[1.5px] uppercase text-muted-foreground/50 mb-4 pl-1">
                    {group.label}
                  </p>
                  <div className="space-y-3">
                    {group.items.map((notification) => {
                      const Icon = getNotificationIcon(notification.type);
                      const isUnread = !notification.isRead;
                      const isClicked = clickedNotificationId === notification.id;
                      const isDeadline = isDeadlineNotification(notification.type);
                      const applicantTag = notification.type === "guild_application" ? getApplicantTypeTag(notification.applicantType) : null;
                      const { stripe, iconBg, isUrgent } = getPriorityStyles(notification.type);

                      return (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          disabled={isClicked}
                          className={`w-full flex items-start gap-4 px-6 py-5 bg-card border border-border rounded-xl relative overflow-hidden cursor-pointer text-left transition-all duration-200 hover:bg-muted/30 hover:border-border hover:translate-y-[-1px] ${
                            isClicked ? "opacity-60 cursor-wait" : ""
                          } ${isUnread ? "" : "opacity-60"} ${isUrgent ? "border-negative/12" : ""}`}
                          style={isUrgent ? { animation: "notif-urgent-glow 3s ease-in-out infinite" } : undefined}
                        >
                          {/* Priority stripe */}
                          <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-r ${stripe}`} />

                          {/* Icon */}
                          <div className={`relative w-12 h-12 rounded-xl grid place-items-center shrink-0 ${iconBg}`}>
                            {isClicked ? (
                              <Loader2 className="w-[22px] h-[22px] animate-spin" />
                            ) : (
                              <Icon className="w-[22px] h-[22px]" />
                            )}
                            {isUnread && (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background animate-pulse" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className={`text-sm leading-snug ${isUnread ? "font-bold text-foreground" : "font-medium text-foreground"} ${isDeadline ? STATUS_COLORS.warning.text : ""}`}>
                                {notification.title}
                              </h3>
                              {applicantTag && (
                                <span className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wider rounded-full ${applicantTag.className}`}>
                                  {applicantTag.label}
                                </span>
                              )}
                              {isDeadline && notification.expiresAt && (
                                <CountdownBadge deadline={notification.expiresAt} label="Due" />
                              )}
                            </div>
                            <p className={`text-sm leading-relaxed line-clamp-2 mb-2 ${
                              isDeadline
                                ? `${STATUS_COLORS.warning.text} font-medium`
                                : isUnread
                                ? "text-muted-foreground font-medium"
                                : "text-muted-foreground"
                            }`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/50 font-medium">
                              {notification.guildName && (
                                <>
                                  <span className="font-medium">{notification.guildName}</span>
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
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DataSection>

        {/* Load More */}
        {hasMore && filteredNotifications.length > 0 && (
          <button
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
      </div>
    </div>
  );
}
