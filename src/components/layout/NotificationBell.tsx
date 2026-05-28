"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";
import { notificationsApi, extractApiError } from "@/lib/api";
import { useNotificationCount, NOTIFICATION_READ_EVENT } from "@/lib/hooks/useNotificationCount";
import {
  type Notification,
  getNotificationIcon,
  getNotificationColor,
  getApplicantTypeTag,
  formatTimeAgo,
  buildNotificationUrl,
} from "@/lib/notification-helpers";
import { useExpertStatus } from "@/lib/hooks/useExpertStatus";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  /**
   * Optional filter on notification types — e.g.
   * `["guild_post_reply", "guild_post_mention"]`. When provided, the badge
   * count is scoped to only these types, and clicking the bell navigates
   * straight to `href` instead of opening the recent-notifications dropdown.
   */
  types?: string[];
  /**
   * Override the destination when the user clicks through. Defaults to
   * `/expert/notifications`. If `types` is also set, this bell renders as a
   * simple `next/link` (no dropdown).
   */
  href?: string;
}

const DEFAULT_HREF = "/expert/notifications";

// Real-time toast on new guild-feed activity is intentionally deferred —
// polling cadence is set by useNotificationCount; a WebSocket pass will
// pick this up in a future iteration.
export function NotificationBell({ types, href }: NotificationBellProps = {}) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { expertStatus } = useExpertStatus();
  const isApprovedExpert = expertStatus === "approved";
  const unreadCount = useNotificationCount({
    walletAddress: address,
    enabled: isConnected && isApprovedExpert,
    types,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  // Defer the first real render until after hydration: wagmi's `useAccount`
  // and `useExpertStatus` (localStorage) only resolve to truthy values on the
  // client, so rendering them on the server-built first paint causes a
  // hydration mismatch in the parent tree.
  const [hasMounted, setHasMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

  // eslint-disable-next-line no-restricted-syntax -- mark client-only after first paint to avoid SSR/CSR hydration mismatch from wagmi + localStorage
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentionally flips client-only flag after the first paint to defer the SSR/CSR boundary
    setHasMounted(true);
  }, []);

  // eslint-disable-next-line no-restricted-syntax -- fetches on dropdown open with optimistic read updates
  useEffect(() => {
    if (!isOpen || !address) return;

    const fetchRecent = async () => {
      setIsLoading(true);
      setFetchError(false);
      try {
        const result = await notificationsApi.getNotifications(address, { limit: 5 });
        setNotifications(result?.notifications ?? []);
      } catch {
        setFetchError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecent();
  }, [isOpen, address]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!address) return;

    if (!notification.isRead) {
      const snapshot = notifications;
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      try {
        await notificationsApi.markAsRead(notification.id, address);
        window.dispatchEvent(new Event(NOTIFICATION_READ_EVENT));
      } catch (err) {
        setNotifications(snapshot);
        toast.error(extractApiError(err, "Couldn't mark as read"));
      }
    }

    setIsOpen(false);
    router.push(buildNotificationUrl(notification));
  };

  if (!hasMounted) return null;
  if (!isConnected || !address || !isApprovedExpert) return null;

  // Filtered/scoped bell renders as a simple Link with a badge — no dropdown.
  if (types && types.length > 0) {
    const targetHref = href ?? DEFAULT_HREF;
    return (
      <Link
        href={targetHref}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[min(90vw,320px)] rounded-xl border border-border bg-card shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {unreadCount} new
              </span>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8" role="status">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="sr-only">Loading notifications</span>
              </div>
            ) : fetchError ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Could not load notifications</p>
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
                        <div className="flex items-center gap-2 min-w-0">
                          <p
                            className={cn(
                              "truncate text-sm text-foreground",
                              !notification.isRead && "font-semibold"
                            )}
                          >
                            {notification.title}
                          </p>
                          {applicantTag && (
                            <span className={`px-1.5 py-0.5 text-xs font-medium uppercase tracking-wider rounded-full flex-shrink-0 ${applicantTag.className}`}>
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
                      <p className="mt-1 text-xs text-muted-foreground/70">
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
                router.push(href ?? DEFAULT_HREF);
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
