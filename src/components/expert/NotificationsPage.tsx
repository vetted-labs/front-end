"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
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
import { CountdownBadge } from "@/components/ui/countdown-badge";

type FilterType = "all" | "reviews" | "rewards" | "guild" | "system";

export default function NotificationsPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
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

  if (isLoading) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-full">
        <div className="flex items-center justify-center py-20">
          <Alert variant="error">{error}</Alert>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated with your guild activities and pending tasks
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllRead}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMarkingAllRead ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4" />
                  Mark All as Read
                </>
              )}
            </button>
          )}
        </div>

        {/* Filter Navigation */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
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
              className={`px-4 py-2 font-medium rounded-lg transition-all whitespace-nowrap ${
                activeFilter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border"
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${
                    key === "all" && unreadCount > 0
                      ? "bg-red-500 text-white"
                      : "bg-primary-foreground/20"
                  }`}
                >
                  {key === "all" ? unreadCount > 0 ? unreadCount : count : count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-card rounded-2xl p-12 text-center border border-border">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                {activeFilter === "all"
                  ? "You have no notifications yet."
                  : `No ${activeFilter} notifications found.`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const isUnread = !notification.isRead;
              const isClicked = clickedNotificationId === notification.id;
              const isDeadline = isDeadlineNotification(notification.type);

              const applicantTag = notification.type === "guild_application" ? getApplicantTypeTag(notification.applicantType) : null;

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  disabled={isClicked}
                  className={`w-full rounded-2xl p-6 border transition-all text-left hover:shadow-lg ${
                    isDeadline
                      ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/60"
                      : isUnread
                      ? "bg-card border-primary/20 hover:border-primary/50"
                      : "bg-card border-border opacity-75 hover:opacity-100 hover:border-primary/50"
                  } ${isClicked ? "opacity-60 cursor-wait" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getNotificationColor(
                        notification.type
                      )}`}
                    >
                      {isClicked ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className={`text-base font-semibold text-foreground ${
                              isUnread ? "font-bold" : ""
                            } ${isDeadline ? "text-amber-700 dark:text-amber-400" : ""}`}
                          >
                            {notification.title}
                          </h3>
                          {applicantTag && (
                            <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${applicantTag.className}`}>
                              {applicantTag.label}
                            </span>
                          )}
                          {isDeadline && notification.expiresAt && (
                            <CountdownBadge deadline={notification.expiresAt} label="Due" />
                          )}
                        </div>
                        {isUnread && (
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 mt-1.5 ${isDeadline ? "bg-amber-500" : "bg-primary"}`} />
                        )}
                      </div>
                      <p
                        className={`text-sm mb-2 ${
                          isDeadline
                            ? "text-amber-700/80 dark:text-amber-300/80 font-medium"
                            : isUnread
                            ? "text-muted-foreground font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {notification.guildName && (
                          <>
                            <span className="font-medium">{notification.guildName}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{formatTimeAgo(notification.createdAt)}</span>
                        {notification.isRead && notification.readAt && (
                          <>
                            <span>•</span>
                            <Check className="w-3 h-3" />
                            <span>Read</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}

          {/* Load More Button */}
          {hasMore && filteredNotifications.length > 0 && (
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="w-full py-4 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
    </div>
  );
}
