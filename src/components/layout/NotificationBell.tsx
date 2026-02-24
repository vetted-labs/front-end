"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  Bell,
  FileText,
  Award,
  Coins,
  Users,
  Check,
} from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { useNotificationCount } from "@/lib/hooks/useNotificationCount";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  expertId: string;
  type: string;
  title: string;
  message: string;
  guildId?: string;
  guildName?: string;
  proposalId?: string;
  applicationId?: string;
  link: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
}

function formatTimeAgo(timestamp: string) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "proposal_new":
    case "proposal_deadline":
      return FileText;
    case "application_status":
      return Award;
    case "guild_application":
      return Users;
    case "reward_earned":
      return Coins;
    default:
      return Bell;
  }
}

function getNotificationColor(type: string) {
  switch (type) {
    case "proposal_new":
    case "proposal_deadline":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "application_status":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "guild_application":
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400";
    case "reward_earned":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

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
      }
    } catch {
      // Still navigate
    }

    setIsOpen(false);

    // Build URL with extra params for guild application notifications
    const url = new URL(notification.link, window.location.origin);
    if (notification.type === "guild_application" && notification.applicationId) {
      if (!url.searchParams.has("applicationId")) {
        url.searchParams.set("applicationId", notification.applicationId);
      }
      if (!url.searchParams.has("tab")) {
        url.searchParams.set("tab", "membershipApplications");
      }
    }
    router.push(url.pathname + url.search);
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
                        <p
                          className={cn(
                            "truncate text-sm text-foreground",
                            !notification.isRead && "font-semibold"
                          )}
                        >
                          {notification.title}
                        </p>
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
