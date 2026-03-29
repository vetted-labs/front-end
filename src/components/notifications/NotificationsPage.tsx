"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCheck,
  AlertCircle,
  Loader2,
  Settings,
  X,
} from "lucide-react";
import { logger } from "@/lib/logger";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/notification-helpers";
import { Alert } from "@/components/ui/alert";
import { DataSection } from "@/lib/motion";
import { getNotificationPriority } from "@/config/colors";
import type { BaseNotification } from "@/types";
import type { LucideIcon } from "lucide-react";

const NOTIFICATIONS_PER_PAGE = 20;

export interface NotificationFilterConfig {
  key: string;
  label: string;
  /** Which notification types belong to this filter (empty = special like "all" or "unread"). */
  types?: string[];
  /** Optional icon for the filter tab */
  icon?: LucideIcon;
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

/** Group notifications by relative date */
function groupByDate<T extends BaseNotification>(notifications: T[]): { label: string; items: T[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: T[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This Week", items: [] },
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

/** Map notification type to priority-based left stripe and icon styling */
function getPriorityStyles(type: string): {
  stripe: string;
  iconBg: string;
  isUrgent: boolean;
} {
  const priority = getNotificationPriority(type);
  switch (priority) {
    case "urgent":
      return {
        stripe: "bg-negative",
        iconBg: "bg-negative/12 text-negative",
        isUrgent: true,
      };
    case "positive":
      return {
        stripe: "bg-positive",
        iconBg: "bg-positive/12 text-positive",
        isUrgent: false,
      };
    case "action":
      return {
        stripe: "bg-primary",
        iconBg: "bg-primary/12 text-primary",
        isUrgent: false,
      };
    default:
      return {
        stripe: "bg-info-blue",
        iconBg: "bg-info-blue/12 text-info-blue",
        isUrgent: false,
      };
  }
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

  // Compute per-filter counts (must be before early returns to keep hook order stable)
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

  const dateGroups = useMemo(() => groupByDate(filteredNotifications), [filteredNotifications]);

  if (!ready) return null;

  if (error) {
    return (
      <div className="min-h-full">
        <div className="flex items-center justify-center py-20">
          <Alert variant="error">{error}</Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-[1]">
        {/* Header */}
        <div className="flex items-center justify-between mb-9 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">
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
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllRead}
                className="inline-flex items-center gap-2 bg-card border border-border text-muted-foreground text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-muted/30 hover:border-border hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMarkingAllRead ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4" />
                )}
                Mark all read
              </button>
            )}
            <button className="w-10 h-10 grid place-items-center bg-card border border-border text-muted-foreground rounded-lg hover:bg-muted/30 hover:border-border hover:text-foreground transition-all" aria-label="Notification settings">
              <Settings className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-9 overflow-x-auto pb-1 scrollbar-none">
          {filterTabs.map(({ key, label, count, icon: TabIcon }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeFilter === key
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-muted/30 hover:border-border hover:text-foreground"
              }`}
            >
              {TabIcon && <TabIcon className="w-4 h-4 shrink-0" />}
              {label}
              {count > 0 && (
                <span className={`px-2 py-px text-xs font-medium rounded-lg ${
                  activeFilter === key ? "bg-primary/20" : "bg-muted/40"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications grouped by date */}
        <DataSection isLoading={isLoading} skeleton={null}>
        {filteredNotifications.length === 0 ? (
          <div className="bg-card rounded-xl p-12 text-center border border-border">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium text-foreground mb-2">No notifications</h3>
            <p className="text-muted-foreground">
              {activeFilter === "unread"
                ? "All caught up! No unread notifications."
                : `No ${activeFilter === "all" ? "" : activeFilter.replace("_", " ") + " "}notifications found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {dateGroups.map((group) => (
              <div key={group.label}>
                {/* Date label */}
                <p className="font-display text-xs font-bold tracking-[1.5px] uppercase text-muted-foreground/50 mb-4 pl-1">
                  {group.label}
                </p>

                <div className="space-y-3">
                  {group.items.map((notification) => {
                    const Icon = getIcon(notification.type);
                    const isUnread = !notification.isRead;
                    const isClicked = clickedNotificationId === notification.id;
                    const { stripe, iconBg, isUrgent } = getPriorityStyles(notification.type);

                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        disabled={isClicked}
                        className={`w-full flex items-start gap-4 px-6 py-5 bg-card border border-border rounded-xl relative overflow-hidden cursor-pointer text-left transition-all duration-200 hover:bg-muted/30 hover:border-border hover:translate-y-[-1px] ${
                          isClicked ? "opacity-60 cursor-wait" : ""
                        } ${
                          isUnread ? "" : "opacity-60"
                        } ${
                          isUrgent ? "border-negative/12" : ""
                        }`}
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
                          {/* Unread dot */}
                          {isUnread && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background animate-pulse" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm leading-snug mb-1 ${
                            isUnread ? "font-semibold text-white" : "font-medium text-foreground"
                          }`}>
                            {notification.title}
                          </h3>
                          <p className="text-[13.5px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/50 font-medium">
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

                        {/* Dismiss button (shows on hover) */}
                        <div className="shrink-0 w-8 h-8 rounded-lg grid place-items-center text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:bg-muted/30 hover:text-muted-foreground transition-all mt-1">
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

        {/* Load More Button */}
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
        </DataSection>
      </div>
    </div>
  );
}
