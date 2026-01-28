"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  Bell,
  FileText,
  Award,
  Coins,
  Users,
  Check,
  CheckCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { ExpertNavbar } from "@/components/ExpertNavbar";
import { notificationsApi } from "@/lib/api";
import { LoadingState } from "@/components/ui/loadingstate";
import { Alert } from "@/components/ui/alert";

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

type FilterType = "all" | "unread" | "proposal_new" | "proposal_deadline" | "application_status" | "guild_application" | "reward_earned";

export default function NotificationsPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]); // Store all notifications for badge counts
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // Always fetch ALL notifications without filters
      const filters: any = { limit: 50 };

      const result: any = await notificationsApi.getNotifications(address, filters);
      const data = result.data || result;

      const notificationsData = Array.isArray(data) ? data : [];
      setNotifications(notificationsData);
      setAllNotifications(notificationsData); // Store all notifications for badge counts
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!address) return;

    try {
      // Mark as read if not already read
      if (!notification.isRead) {
        await notificationsApi.markAsRead(notification.id, address);

        // Update local state in both arrays
        const updateFn = (n: Notification) =>
          n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n;

        setNotifications((prev) => prev.map(updateFn));
        setAllNotifications((prev) => prev.map(updateFn));
      }

      // Navigate to the link
      router.push(notification.link);
    } catch (err) {
      console.error("Error marking notification as read:", err);
      // Still navigate even if marking as read fails
      router.push(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!address) return;

    setIsMarkingAllRead(true);

    try {
      await notificationsApi.markAllAsRead(address);

      // Update local state - mark all as read in both arrays
      const updateFn = (n: Notification) => ({ ...n, isRead: true, readAt: new Date().toISOString() });

      setNotifications((prev) => prev.map(updateFn));
      setAllNotifications((prev) => prev.map(updateFn));
    } catch (err) {
      console.error("Error marking all as read:", err);
      setError("Failed to mark all notifications as read");
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
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
  };

  const getNotificationColor = (type: string) => {
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
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <ExpertNavbar />
        <LoadingState message="Loading notifications..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <ExpertNavbar />
        <div className="flex items-center justify-center py-20">
          <Alert variant="error">{error}</Alert>
        </div>
      </div>
    );
  }

  // Calculate badge counts from ALL notifications (not filtered)
  const unreadCount = allNotifications.filter((n) => !n.isRead).length;
  const proposalCount = allNotifications.filter((n) => n.type.includes("proposal")).length;
  const applicationCount = allNotifications.filter((n) => n.type.includes("application")).length;
  const rewardCount = allNotifications.filter((n) => n.type === "reward_earned").length;

  // Filter notifications for display only (client-side filtering)
  const filteredNotifications =
    activeFilter === "all"
      ? allNotifications
      : activeFilter === "unread"
      ? allNotifications.filter((n) => !n.isRead)
      : allNotifications.filter((n) => n.type === activeFilter);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <ExpertNavbar />

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
            onClick={() => setActiveFilter("proposal_new")}
            className={`px-4 py-2 font-medium rounded-lg transition-all whitespace-nowrap ${
              activeFilter === "proposal_new"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border"
            }`}
          >
            Proposals
            {proposalCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-foreground/20 text-xs font-semibold rounded-full">
                {proposalCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter("application_status")}
            className={`px-4 py-2 font-medium rounded-lg transition-all whitespace-nowrap ${
              activeFilter === "application_status"
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

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full bg-card rounded-2xl p-6 border transition-all text-left hover:shadow-lg hover:border-primary/50 ${
                    isUnread
                      ? "border-primary/20 bg-card"
                      : "border-border opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getNotificationColor(
                        notification.type
                      )}`}
                    >
                      <Icon className="w-6 h-6" />
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
        </div>
      </div>
    </div>
  );
}
