"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { logger } from "@/lib/logger";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/notification-helpers";
import { Alert } from "@/components/ui/alert";
import type { BaseNotification } from "@/types";
import type { LucideIcon } from "lucide-react";

const NOTIFICATIONS_PER_PAGE = 20;

export interface NotificationFilterConfig {
  key: string;
  label: string;
  /** Which notification types belong to this filter (empty = special like "all" or "unread"). */
  types?: string[];
}

interface NotificationsPageProps<T extends BaseNotification> {
  /** Page subtitle. */
  subtitle: string;
  /** Whether the auth guard is ready. */
  ready: boolean;
  /** Fetch paginated notifications. */
  fetchNotifications: (params: { limit: number; offset: number }) => Promise<{ notifications: T[]; total: number }>;
  /** Mark a single notification as read. */
  markAsRead: (id: string) => Promise<unknown>;
  /** Mark all notifications as read. */
  markAllAsRead: () => Promise<unknown>;
  /** DOM event name dispatched when notifications are read. */
  readEventName: string;
  /** Get the icon for a notification type. */
  getIcon: (type: string) => LucideIcon;
  /** Get the color class for a notification type. */
  getColor: (type: string) => string;
  /** Build the navigation URL for a notification. */
  buildUrl: (notification: T) => string;
  /** Filter tabs config (first filter should be "all"). */
  filters: NotificationFilterConfig[];
}

export function NotificationsPage<T extends BaseNotification>({
  subtitle,
  ready,
  fetchNotifications,
  markAsRead,
  markAllAsRead: markAllAsReadApi,
  readEventName,
  getIcon,
  getColor,
  buildUrl,
  filters,
}: NotificationsPageProps<T>) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState(filters[0]?.key ?? "all");
  const [allNotifications, setAllNotifications] = useState<T[]>([]);
  const { execute: executeMarkAll, isLoading: isMarkingAllRead } = useApi();
  const [clickedNotificationId, setClickedNotificationId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { isLoading, error } = useFetch(
    () => fetchNotifications({ limit: NOTIFICATIONS_PER_PAGE, offset: 0 }),
    {
      skip: !ready,
      onSuccess: (result) => {
        const data = result?.notifications ?? [];
        setAllNotifications(data);
        setHasMore(data.length >= NOTIFICATIONS_PER_PAGE);
      },
    }
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchNotifications({
        limit: NOTIFICATIONS_PER_PAGE,
        offset: allNotifications.length,
      });
      const moreData = result?.notifications ?? [];
      if (moreData.length === 0) {
        setHasMore(false);
      } else {
        setAllNotifications((prev) => [...prev, ...moreData]);
        setHasMore(moreData.length >= NOTIFICATIONS_PER_PAGE);
      }
    } catch (err) {
      logger.error("Error loading more notifications", err, { silent: true });
      toast.error(err instanceof Error ? err.message : "Failed to load more notifications");
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, allNotifications.length, fetchNotifications]);

  const handleNotificationClick = async (notification: T) => {
    setClickedNotificationId(notification.id);
    try {
      if (!notification.isRead) {
        await markAsRead(notification.id);
        setAllNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          )
        );
        window.dispatchEvent(new Event(readEventName));
      }
      router.push(buildUrl(notification));
    } catch (err) {
      logger.error("Error marking notification as read", err, { silent: true });
      toast.error(err instanceof Error ? err.message : "Failed to mark notification as read");
      setClickedNotificationId(null);
      router.push(buildUrl(notification));
    }
  };

  const handleMarkAllAsRead = async () => {
    await executeMarkAll(
      () => markAllAsReadApi(),
      {
        onSuccess: () => {
          setAllNotifications((prev) =>
            prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
          );
          window.dispatchEvent(new Event(readEventName));
        },
        onError: (errorMsg) => {
          logger.error("Error marking all as read", errorMsg, { silent: true });
          toast.error(errorMsg || "Failed to mark all notifications as read");
        },
      }
    );
  };

  if (!ready || isLoading) return null;

  if (error) {
    return (
      <div className="min-h-full">
        <div className="flex items-center justify-center py-20">
          <Alert variant="error">{error}</Alert>
        </div>
      </div>
    );
  }

  // Compute per-filter counts
  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  const getFilteredNotifications = (filterKey: string): T[] => {
    if (filterKey === "all") return allNotifications;
    if (filterKey === "unread") return allNotifications.filter((n) => !n.isRead);
    const filterConfig = filters.find((f) => f.key === filterKey);
    if (!filterConfig?.types) return allNotifications;
    return allNotifications.filter((n) => filterConfig.types!.includes(n.type));
  };

  const filteredNotifications = getFilteredNotifications(activeFilter);

  const filterTabs = filters.map((f) => ({
    ...f,
    count: f.key === "all"
      ? allNotifications.length
      : f.key === "unread"
      ? unreadCount
      : getFilteredNotifications(f.key).length,
  }));

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Notifications</h1>
            <p className="text-muted-foreground">{subtitle}</p>
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
          {filterTabs.map(({ key, label, count }) => (
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
                <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${
                  key === "unread" && activeFilter !== key ? "bg-red-500 text-white" : "bg-primary-foreground/20"
                }`}>
                  {count}
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
                {activeFilter === "unread"
                  ? "All caught up! No unread notifications."
                  : `No ${activeFilter === "all" ? "" : activeFilter.replace("_", " ") + " "}notifications found.`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = getIcon(notification.type);
              const isUnread = !notification.isRead;
              const isClicked = clickedNotificationId === notification.id;

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
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getColor(
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
                        <h3
                          className={`text-base font-semibold text-foreground ${
                            isUnread ? "font-bold" : ""
                          }`}
                        >
                          {notification.title}
                        </h3>
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
