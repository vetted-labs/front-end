"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Bell, Check } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { useNotificationCount, NOTIFICATION_READ_EVENT } from "@/lib/hooks/useNotificationCount";
import {
  type Notification,
  getNotificationIcon,
  getNotificationColor,
  getApplicantTypeTag,
  formatTimeAgo,
  buildNotificationUrl,
} from "@/lib/notification-helpers";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const unreadCount = useNotificationCount(address, isConnected);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Fetch recent notifications when dropdown opens
  useEffect(() => {
    if (!isOpen || !address) return;

    const fetchRecent = async () => {
      setIsLoading(true);
      try {
        const result: unknown = await notificationsApi.getNotifications(address, { limit: 5 });
        setNotifications(Array.isArray(result) ? result : []);
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecent();
  }, [isOpen, address]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!address) return;

    try {
      if (!notification.isRead) {
        await notificationsApi.markAsRead(notification.id, address);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          )
        );
        window.dispatchEvent(new Event(NOTIFICATION_READ_EVENT));
      }
    } catch {
      // Still navigate
    }

    setIsOpen(false);
    router.push(buildNotificationUrl(notification));
  };

  if (!isConnected || !address) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-xl overflow-hidden dark:bg-card/80 dark:backdrop-blur-2xl dark:border-white/[0.08] z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {unreadCount} new
              </span>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const applicantTag = notification.type === "guild_application" ? getApplicantTypeTag(notification.applicantType) : null;
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted",
                      !notification.isRead && "bg-primary/5"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                        getNotificationColor(notification.type)
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p
                            className={cn(
                              "truncate text-sm text-foreground",
                              !notification.isRead && "font-semibold"
                            )}
                          >
                            {notification.title}
                          </p>
                          {applicantTag && (
                            <span className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded-full flex-shrink-0 ${applicantTag.className}`}>
                              {applicantTag.label}
                            </span>
                          )}
                        </div>
                        {!notification.isRead && (
                          <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                        )}
                        {notification.isRead && (
                          <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground/70">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/expert/notifications");
              }}
              className="flex w-full items-center justify-center px-4 py-3 text-sm font-medium text-primary hover:bg-muted transition-colors"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
