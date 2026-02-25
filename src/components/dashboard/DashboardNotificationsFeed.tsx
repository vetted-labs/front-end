"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2 } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { NOTIFICATION_READ_EVENT } from "@/lib/hooks/useNotificationCount";
import {
  type Notification,
  getNotificationIcon,
  getNotificationColor,
  getApplicantTypeTag,
  formatTimeAgo,
  buildNotificationUrl,
} from "@/lib/notification-helpers";

interface DashboardNotificationsFeedProps {
  walletAddress: string;
}

export function DashboardNotificationsFeed({ walletAddress }: DashboardNotificationsFeedProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [clickedId, setClickedId] = useState<string | null>(null);

  const { isLoading } = useFetch(
    () => notificationsApi.getNotifications(walletAddress, { limit: 10 }),
    {
      skip: !walletAddress,
      onSuccess: (result) => setNotifications(Array.isArray(result) ? result : []),
    }
  );

  const handleClick = async (notification: Notification) => {
    setClickedId(notification.id);

    try {
      if (!notification.isRead) {
        await notificationsApi.markAsRead(notification.id, walletAddress);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          )
        );
        window.dispatchEvent(new Event(NOTIFICATION_READ_EVENT));
      }

      const navUrl = buildNotificationUrl(notification);
      router.push(navUrl);
    } catch {
      setClickedId(null);
      const navUrl = buildNotificationUrl(notification);
      router.push(navUrl);
    }
  };

  const displayed = filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Filter pills */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                filter === "all"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                filter === "unread"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Unread
            </button>
          </div>
          <button
            onClick={() => router.push("/expert/notifications")}
            className="text-xs text-primary hover:underline"
          >
            View All
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-lg bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-foreground mb-1">
              {filter === "unread" ? "All Caught Up!" : "No Notifications Yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {filter === "unread"
                ? "No unread notifications at the moment"
                : "Notifications will appear here as activity happens"}
            </p>
          </div>
        ) : (
          <div
            className="relative pl-5 border-l-2 border-border/40 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
            style={{ maxHeight: "360px" }}
          >
            {displayed.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const colorClass = getNotificationColor(notification.type);
              const isUnread = !notification.isRead;
              const isClicked = clickedId === notification.id;
              const applicantTag = notification.type === "guild_application" ? getApplicantTypeTag(notification.applicantType) : null;

              return (
                <div key={notification.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[calc(0.625rem+5px)] top-3 w-2 h-2 rounded-full ring-2 ring-background ${
                      isUnread ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  />
                  <button
                    onClick={() => handleClick(notification)}
                    disabled={isClicked}
                    className={`w-full text-left rounded-lg px-3 py-2.5 transition-all ${
                      isUnread
                        ? "hover:bg-primary/5 bg-primary/[0.02]"
                        : "hover:bg-muted/50 opacity-75 hover:opacity-100"
                    } ${isClicked ? "opacity-60 cursor-wait" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}
                      >
                        {isClicked ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm leading-snug ${isUnread ? "font-medium text-foreground" : "text-foreground"}`}>
                            {notification.title}
                          </p>
                          {applicantTag && (
                            <span className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded-full flex-shrink-0 ${applicantTag.className}`}>
                              {applicantTag.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground/70">
                          {notification.guildName && (
                            <>
                              <span className="font-medium">{notification.guildName}</span>
                              <span>·</span>
                            </>
                          )}
                          <span>{formatTimeAgo(notification.createdAt)}</span>
                          {isUnread && (
                            <>
                              <span>·</span>
                              <span className="text-primary font-medium">New</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
