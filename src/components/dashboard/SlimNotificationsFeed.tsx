"use client";

import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import {
  type Notification,
  getNotificationIcon,
  getNotificationColor,
  formatTimeAgo,
  buildNotificationUrl,
} from "@/lib/notification-helpers";
import { STATUS_COLORS } from "@/config/colors";

interface SlimNotificationsFeedProps {
  walletAddress: string;
}

export function SlimNotificationsFeed({
  walletAddress,
}: SlimNotificationsFeedProps) {
  const router = useRouter();

  const { data, isLoading } = useFetch(
    () => notificationsApi.getNotifications(walletAddress, { limit: 4 }),
    { skip: !walletAddress }
  );

  const notifications: Notification[] = Array.isArray(data)
    ? data
    : (data as { notifications?: Notification[] })?.notifications ?? [];

  const handleClick = (notification: Notification) => {
    // Mark as read in background
    if (!notification.isRead) {
      notificationsApi.markAsRead(notification.id, walletAddress).catch(() => {});
    }
    const url = buildNotificationUrl(notification);
    if (url) router.push(url);
  };

  return (
    <div className="bg-card border border-border/60 rounded-[14px] p-5 h-full">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">
          Notifications
        </span>
        <button
          onClick={() => router.push("/expert/notifications")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all →
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">All caught up</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-4">
          {notifications.slice(0, 4).map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const color = getNotificationColor(notification.type);

            return (
              <button
                key={notification.id}
                onClick={() => handleClick(notification)}
                className="flex items-start gap-3 p-2.5 rounded-[10px] bg-muted/30 border border-border/40 text-left hover:bg-muted/50 transition-colors"
              >
                <div
                  className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon
                    className="w-[14px] h-[14px]"
                    style={{ color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">
                    {notification.title}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {notification.message}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatTimeAgo(notification.createdAt)}
                  </div>
                </div>
                {!notification.isRead && (
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS.info.dot} shrink-0 mt-2`} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
