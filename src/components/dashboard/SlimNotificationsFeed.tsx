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
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-5 h-full">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-zinc-200">
          Notifications
        </span>
        <button
          onClick={() => router.push("/expert/notifications")}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          View all →
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Bell className="w-5 h-5 text-zinc-600" />
          <p className="text-[12px] text-zinc-600">All caught up</p>
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
                className="flex items-start gap-3 p-2.5 rounded-[10px] bg-white/[0.02] border border-white/[0.04] text-left hover:bg-white/[0.04] transition-colors"
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
                  <div className="text-[12px] font-medium text-zinc-300 truncate">
                    {notification.title}
                  </div>
                  <div className="text-[11px] text-zinc-600 truncate">
                    {notification.message}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">
                    {formatTimeAgo(notification.createdAt)}
                  </div>
                </div>
                {!notification.isRead && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
