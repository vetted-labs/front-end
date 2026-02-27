"use client";

import Link from "next/link";
import {
  Briefcase,
  Users,
  MessageSquare,
  Clock,
  ArrowRight,
  Zap,
  PlusCircle,
  Video,
  ExternalLink,
  Calendar,
  FileText,
  Edit,
} from "lucide-react";
import { useAuthContext } from "@/hooks/useAuthContext";
import { companyApi, dashboardApi, jobsApi, messagingApi } from "@/lib/api";
import type { CompanyActivityItem } from "@/types/api-responses";
import { useFetch } from "@/lib/hooks/useFetch";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/ui/statusbadge";
import { Alert } from "@/components/ui/alert";

import { formatTimeAgo } from "@/lib/notification-helpers";
import type { Job, DashboardStats, CompanyApplication, Conversation, MeetingDetails } from "@/types";
import type { LucideIcon } from "lucide-react";

function getActivityIcon(actionType: string): { icon: LucideIcon; bg: string; color: string } {
  switch (actionType) {
    case "job_created":
      return { icon: Briefcase, bg: "bg-green-500/10", color: "text-green-600 dark:text-green-400" };
    case "job_updated":
      return { icon: Edit, bg: "bg-blue-500/10", color: "text-blue-600 dark:text-blue-400" };
    case "status_changed":
      return { icon: FileText, bg: "bg-amber-500/10", color: "text-amber-600 dark:text-amber-400" };
    case "message_sent":
      return { icon: MessageSquare, bg: "bg-green-500/10", color: "text-green-600 dark:text-green-400" };
    case "meeting_scheduled":
      return { icon: Video, bg: "bg-purple-500/10", color: "text-purple-600 dark:text-purple-400" };
    default:
      return { icon: Zap, bg: "bg-gray-500/10", color: "text-gray-600 dark:text-gray-400" };
  }
}

interface UpcomingMeeting {
  conversationId: string;
  candidateName: string;
  details: MeetingDetails;
}

interface CompanyDashboardData {
  companyName: string;
  stats: DashboardStats;
  recentJobs: Job[];
  recentApplications: CompanyApplication[];
  unreadCount: number;
  meetings: UpcomingMeeting[];
  activityFeed: CompanyActivityItem[];
}

async function loadDashboardData(userId: string | null): Promise<CompanyDashboardData> {
  // Critical data -- fetch in parallel
  const [profile, statsData, jobsData] = await Promise.all([
    companyApi.getProfile(),
    dashboardApi.getStats(userId ?? undefined),
    jobsApi.getAll({ companyId: userId ?? undefined }),
  ]);

  const profileData = profile as { name?: string; companyName?: string };
  const companyName = profileData.name || profileData.companyName || "";
  const stats = statsData as DashboardStats;
  const allJobs = (Array.isArray(jobsData) ? jobsData : []) as Job[];
  const recentJobs = allJobs.slice(0, 5);

  // Non-critical data -- individual try/catch so failures don't block the dashboard
  let activityFeed: CompanyActivityItem[] = [];
  let recentApplications: CompanyApplication[] = [];
  let unreadCount = 0;
  let meetings: UpcomingMeeting[] = [];

  try {
    const appsResult = await companyApi.getApplications({ limit: 5 });
    const appsList = Array.isArray(appsResult) ? appsResult : (appsResult?.applications ?? []);
    recentApplications = appsList;
  } catch {
    // Applications failed -- proceed without them
  }

  try {
    activityFeed = await companyApi.getActivity(10);
  } catch {
    // Activity feed failed -- proceed without it
  }

  try {
    const counts = (await messagingApi.getUnreadCounts()) as { total: number };
    unreadCount = counts.total ?? 0;
  } catch {
    // Unread counts failed -- default 0
  }

  // Upcoming meetings -- scan recent conversations for meeting_scheduled messages
  try {
    const allConvs = (await messagingApi.getCompanyConversations()) as Conversation[];
    const convsList = Array.isArray(allConvs) ? allConvs : [];
    const upcomingMeetings: UpcomingMeeting[] = [];

    // Check the most recent conversations for meetings (limit to 10 to avoid excessive API calls)
    const toCheck = convsList.slice(0, 10);
    const convDetails = await Promise.all(
      toCheck.map((c) =>
        messagingApi.getConversation(c.id).catch(() => null)
      )
    );

    const now = new Date();
    for (let i = 0; i < convDetails.length; i++) {
      const detail = convDetails[i] as { messages?: Array<{ type: string; meetingDetails?: MeetingDetails }> } | null;
      if (!detail?.messages) continue;

      for (const msg of detail.messages) {
        if (msg.type === "meeting_scheduled" && msg.meetingDetails) {
          const meetingDate = new Date(msg.meetingDetails.scheduledAt);
          if (meetingDate > now) {
            upcomingMeetings.push({
              conversationId: toCheck[i].id,
              candidateName: toCheck[i].candidateName,
              details: msg.meetingDetails,
            });
          }
        }
      }
    }

    upcomingMeetings.sort(
      (a, b) => new Date(a.details.scheduledAt).getTime() - new Date(b.details.scheduledAt).getTime()
    );
    meetings = upcomingMeetings.slice(0, 5);
  } catch {
    // Meetings failed -- proceed without them
  }

  return {
    companyName,
    stats,
    recentJobs,
    recentApplications,
    unreadCount,
    meetings,
    activityFeed,
  };
}

export function CompanyDashboardOverview() {
  const { userId } = useAuthContext();

  const { data, isLoading, error } = useFetch(
    () => loadDashboardData(userId),
  );

  const companyName = data?.companyName ?? "";
  const stats = data?.stats ?? null;
  const recentJobs = data?.recentJobs ?? [];
  const recentApplications = data?.recentApplications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const meetings = data?.meetings ?? [];
  const activityFeed = data?.activityFeed ?? [];

  if (isLoading) {
    return null;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <Alert variant="error">{error}</Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Welcome back{companyName ? `, ${companyName}` : ""}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s your hiring overview
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Active Jobs"
            value={stats?.activeJobs ?? 0}
            icon={Briefcase}
            iconBgColor="bg-primary/10"
            iconColor="text-primary"
          />
          <StatCard
            title="Total Applicants"
            value={stats?.totalApplicants ?? 0}
            icon={Users}
            iconBgColor="bg-blue-500/10"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            title="Unread Messages"
            value={unreadCount}
            icon={MessageSquare}
            iconBgColor="bg-green-500/10"
            iconColor="text-green-600 dark:text-green-400"
            badge={unreadCount > 0 ? { text: "New", variant: "info" } : undefined}
          />
          <StatCard
            title="Avg Days to Hire"
            value={stats?.averageTimeToHire ?? "—"}
            icon={Clock}
            iconBgColor="bg-orange-500/10"
            iconColor="text-orange-600 dark:text-orange-400"
          />
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 mb-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Recent Job Postings */}
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Job Postings
                </h2>
                <Link
                  href="/dashboard/jobs"
                  className="text-xs text-primary hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="p-5">
                {recentJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium text-foreground mb-1">No jobs posted yet</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Post your first job to start receiving applications
                    </p>
                    <Link
                      href="/jobs/new"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Post a Job
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/dashboard/jobs/${job.id}`}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-border/40 hover:border-primary/50 hover:shadow-sm transition-all group text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {job.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {job.location} · {job.type} · {job.applicants ?? 0} applicants
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <StatusBadge status={job.status ?? "active"} size="sm" />
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Applications */}
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Applications
                </h2>
                <Link
                  href="/dashboard/candidates"
                  className="text-xs text-primary hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="p-5">
                {recentApplications.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium text-foreground mb-1">No applications yet</p>
                    <p className="text-xs text-muted-foreground">
                      Applications will appear here as candidates apply
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentApplications.map((app) => (
                      <Link
                        key={app.id}
                        href="/dashboard/candidates"
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-border/40 hover:border-primary/50 hover:shadow-sm transition-all group text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {app.candidate.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {app.job.title} · {formatTimeAgo(app.appliedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <StatusBadge status={app.status} size="sm" />
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Pending Actions */}
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border/40">
                <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Pending Actions
                </h3>
              </div>
              <div className="p-4 space-y-2">
                {unreadCount > 0 && (
                  <Link
                    href="/dashboard/messages"
                    className="w-full flex items-start gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/50 hover:shadow-sm transition-all group"
                  >
                    <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
                      <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground text-sm mb-0.5">
                        Unread Messages
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {unreadCount} unread {unreadCount === 1 ? "message" : "messages"}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-2" />
                  </Link>
                )}

                {recentApplications.some((a) => a.status === "pending") && (
                  <Link
                    href="/dashboard/candidates"
                    className="w-full flex items-start gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/50 hover:shadow-sm transition-all group"
                  >
                    <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground text-sm mb-0.5">
                        New Applications
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {recentApplications.filter((a) => a.status === "pending").length} to review
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-2" />
                  </Link>
                )}

                {unreadCount === 0 && !recentApplications.some((a) => a.status === "pending") && (
                  <div className="text-center py-6">
                    <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium text-foreground mb-1">All Caught Up!</p>
                    <p className="text-xs text-muted-foreground">
                      No pending actions at the moment
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Meetings */}
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border/40">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Upcoming Meetings
                </h3>
              </div>
              <div className="p-4">
                {meetings.length === 0 ? (
                  <div className="text-center py-6">
                    <Video className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium text-foreground mb-1">No upcoming meetings</p>
                    <p className="text-xs text-muted-foreground">
                      Schedule interviews from your conversations
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meetings.map((meeting, idx) => {
                      const date = new Date(meeting.details.scheduledAt);
                      return (
                        <div
                          key={`${meeting.conversationId}-${idx}`}
                          className="flex items-start gap-3 p-3 rounded-xl border border-border/40"
                        >
                          <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {meeting.details.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {meeting.candidateName} · {date.toLocaleDateString()} at{" "}
                              {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {meeting.details.duration ? ` · ${meeting.details.duration}min` : ""}
                            </p>
                          </div>
                          {meeting.details.meetingUrl && (
                            <a
                              href={meeting.details.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline flex-shrink-0 mt-1"
                            >
                              Join
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Recent Activity Feed */}
        {activityFeed.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
            <div className="px-5 py-4 border-b border-border/40">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Activity
              </h2>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {activityFeed.slice(0, 10).map((item) => {
                  const iconConfig = getActivityIcon(item.actionType);
                  return (
                    <div
                      key={item.id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 text-left"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconConfig.bg}`}>
                        <iconConfig.icon className={`w-4 h-4 ${iconConfig.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
