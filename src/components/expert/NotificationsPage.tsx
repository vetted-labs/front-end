"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  Check,
  CheckCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { notificationsApi } from "@/lib/api";

const NOTIFICATIONS_PER_PAGE = 20;
import { NOTIFICATION_READ_EVENT } from "@/lib/hooks/useNotificationCount";
import {
  type Notification,
  getNotificationIcon,
  getNotificationColor,
  getApplicantTypeTag,
  formatTimeAgo,
  buildNotificationUrl,
} from "@/lib/notification-helpers";
import { LoadingState } from "@/components/ui/loadingstate";
import { Alert } from "@/components/ui/alert";

type FilterType = "all" | "unread" | "vetting_reviews" | "applications" | "reward_earned";

export default function NotificationsPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [clickedNotificationId, setClickedNotificationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      fetchNotifications();
    }
  }, [isConnected, address]); // Removed activeFilter from dependencies

  const fetchNotifications = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const filters: { limit: number; offset: number } = { limit: NOTIFICATIONS_PER_PAGE, offset: 0 };

      const result: any = await notificationsApi.getNotifications(address, filters);

      const notificationsData = Array.isArray(result) ? result : [];
      setAllNotifications(notificationsData);
      setHasMore(notificationsData.length >= NOTIFICATIONS_PER_PAGE);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (!address || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const result: any = await notificationsApi.getNotifications(address, {
        limit: NOTIFICATIONS_PER_PAGE,
        offset: allNotifications.length,
      });

      const moreData = Array.isArray(result) ? result : [];
      if (moreData.length === 0) {
        setHasMore(false);
      } else {
        setAllNotifications((prev) => [...prev, ...moreData]);
        setHasMore(moreData.length >= NOTIFICATIONS_PER_PAGE);
      }
    } catch (err) {
      console.error("Error loading more notifications:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [address, isLoadingMore, hasMore, allNotifications.length]);


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
      console.error("Error marking notification as read:", err);
      setClickedNotificationId(null);
      // Still navigate even if marking as read fails
      const navUrl = buildNotificationUrl(notification);
      router.push(navUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!address) return;

    setIsMarkingAllRead(true);

    try {
      await notificationsApi.markAllAsRead(address);

      // Update local state
      const updateFn = (n: Notification) => ({ ...n, isRead: true, readAt: new Date().toISOString() });

      setAllNotifications((prev) => prev.map(updateFn));
      window.dispatchEvent(new Event(NOTIFICATION_READ_EVENT));
    } catch (err) {
      console.error("Error marking all as read:", err);
      setError("Failed to mark all notifications as read");
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full">
        <LoadingState message="Loading notifications..." />
      </div>
    );
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
  const vettingCount = allNotifications.filter((n) => n.type === "proposal_new" || n.type === "proposal_deadline" || n.type === "application_new" || n.type === "application_deadline").length;
  const applicationCount = allNotifications.filter((n) => n.type === "application_status" || n.type === "guild_application").length;
  const rewardCount = allNotifications.filter((n) => n.type === "reward_earned").length;

  // Filter notifications for display only (client-side filtering)
  const filteredNotifications =
    activeFilter === "all"
      ? allNotifications
      : activeFilter === "unread"
      ? allNotifications.filter((n) => !n.isRead)
      : activeFilter === "vetting_reviews"
      ? allNotifications.filter((n) => n.type === "proposal_new" || n.type === "proposal_deadline" || n.type === "application_new" || n.type === "application_deadline")
      : activeFilter === "applications"
      ? allNotifications.filter((n) => n.type === "application_status" || n.type === "guild_application")
      : allNotifications.filter((n) => n.type === activeFilter);

  return (
    <div className="min-h-full">
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
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-4 py-2 font-medium rounded-lg transition-all whitespace-nowrap ${
              activeFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border"
            }`}
          >
            All
            {allNotifications.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-foreground/20 text-xs font-semibold rounded-full">
                {allNotifications.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter("unread")}
            className={`px-4 py-2 font-medium rounded-lg transition-all whitespace-nowrap ${
              activeFilter === "unread"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border"
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter("vetting_reviews")}
            className={`px-4 py-2 font-medium rounded-lg transition-all whitespace-nowrap ${
              activeFilter === "vetting_reviews"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border"
            }`}
          >
            Vetting Reviews
            {vettingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-foreground/20 text-xs font-semibold rounded-full">
                {vettingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter("applications")}
            className={`px-4 py-2 font-medium rounded-lg transition-all whitespace-nowrap ${
              activeFilter === "applications"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border"
            }`}
          >
            Applications
            {applicationCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-foreground/20 text-xs font-semibold rounded-full">
                {applicationCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter("reward_earned")}
            className={`px-4 py-2 font-medium rounded-lg transition-all whitespace-nowrap ${
              activeFilter === "reward_earned"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border"
            }`}
          >
            Rewards
            {rewardCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-foreground/20 text-xs font-semibold rounded-full">
                {rewardCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-card rounded-2xl p-12 text-center border border-border">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                {activeFilter === "unread"
                  ? "All caught up! No unread notifications."
                  : `No ${activeFilter === "all" ? "" : activeFilter + " "}notifications found.`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const isUnread = !notification.isRead;
              const isClicked = clickedNotificationId === notification.id;

              const applicantTag = notification.type === "guild_application" ? getApplicantTypeTag(notification.applicantType) : null;

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  disabled={isClicked}
                  className={`w-full bg-card rounded-2xl p-6 border transition-all text-left hover:shadow-lg hover:border-primary/50 ${
                    isUnread
                      ? "border-primary/20 bg-card"
                      : "border-border opacity-75 hover:opacity-100"
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
                        <div className="flex items-center gap-2">
                          <h3
                            className={`text-base font-semibold text-foreground ${
                              isUnread ? "font-bold" : ""
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {applicantTag && (
                            <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${applicantTag.className}`}>
                              {applicantTag.label}
                            </span>
                          )}
                        </div>
                        {isUnread && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 ml-2 mt-1.5" />
                        )}
                      </div>
                      <p
                        className={`text-sm text-muted-foreground mb-2 ${
                          isUnread ? "font-medium" : ""
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
