"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  MessageSquare,
  ArrowRight,
  Zap,
  PlusCircle,
  Plus,
  Video,
  ExternalLink,
  Calendar,
  FileText,
  Edit,
  ChevronRight,
  Settings,
  CheckCircle,
  Activity,
  Clock,
} from "lucide-react";
import { useAuthContext } from "@/hooks/useAuthContext";
import { companyApi, dashboardApi, jobsApi, messagingApi, extractApiError } from "@/lib/api";
import { STATUS_COLORS, getCandidateStatusDot } from "@/config/colors";
import type { CompanyActivityItem } from "@/types/api-responses";
import { useFetch } from "@/lib/hooks/useFetch";
import { StatCard } from "@/components/dashboard/StatCard";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { PIPELINE_STAGES } from "@/lib/statusTransitions";
import { Alert } from "@/components/ui/alert";

import { logger } from "@/lib/logger";
import { formatTimeAgo } from "@/lib/notification-helpers";
import type { Job, DashboardStats, CompanyApplication, MeetingDetails, ApplicationStatus } from "@/types";
import type { LucideIcon } from "lucide-react";

function getActivityIcon(actionType: string): { icon: LucideIcon; bg: string; color: string } {
  switch (actionType) {
    case "job_created":
      return { icon: Briefcase, bg: STATUS_COLORS.positive.bgSubtle, color: STATUS_COLORS.positive.text };
    case "job_updated":
      return { icon: Edit, bg: STATUS_COLORS.info.bgSubtle, color: STATUS_COLORS.info.text };
    case "status_changed":
      return { icon: FileText, bg: STATUS_COLORS.warning.bgSubtle, color: STATUS_COLORS.warning.text };
    case "message_sent":
      return { icon: MessageSquare, bg: STATUS_COLORS.positive.bgSubtle, color: STATUS_COLORS.positive.text };
    case "meeting_scheduled":
      return { icon: Video, bg: STATUS_COLORS.info.bgSubtle, color: STATUS_COLORS.info.text };
    default:
      return { icon: Zap, bg: STATUS_COLORS.neutral.bgSubtle, color: STATUS_COLORS.neutral.text };
  }
}

interface DashboardMeeting {
  conversationId: string;
  candidateName: string;
  details: MeetingDetails;
}

interface CriticalDashboardData {
  companyName: string;
  stats: DashboardStats;
  recentJobs: Job[];
}

async function loadCriticalData(userId: string | null): Promise<CriticalDashboardData> {
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

  return { companyName, stats, recentJobs };
}

/** Build pipeline columns from recent applications */
function buildPipeline(apps: CompanyApplication[]): Record<ApplicationStatus, CompanyApplication[]> {
  const pipeline: Record<string, CompanyApplication[]> = {};
  for (const stage of PIPELINE_STAGES) {
    pipeline[stage] = [];
  }
  for (const app of apps) {
    if (pipeline[app.status]) {
      pipeline[app.status].push(app);
    }
  }
  return pipeline as Record<ApplicationStatus, CompanyApplication[]>;
}

/** Deterministic avatar color based on name */
function getAvatarBg(name: string): string {
  const colors = [
    "bg-primary/20 text-primary",
    "bg-info-blue/20 text-info-blue",
    "bg-positive/20 text-positive",
    "bg-rank-officer/20 text-rank-officer",
    "bg-rank-craftsman/20 text-rank-craftsman",
    "bg-warning/20 text-warning",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const PIPELINE_COL_ACCENT: Record<string, string> = {
  pending: "border-t-primary",
  reviewing: "border-t-warning",
  interviewed: "border-t-info-blue",
  accepted: "border-t-positive",
};

export function CompanyDashboardOverview() {
  const { userId } = useAuthContext();

  // Critical data — renders stats, jobs, and welcome header immediately
  const { data, isLoading, error } = useFetch(
    () => loadCriticalData(userId),
  );

  // Non-critical data — loaded progressively after the critical render
  const [recentApplications, setRecentApplications] = useState<CompanyApplication[]>([]);
  const [activityFeed, setActivityFeed] = useState<CompanyActivityItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [meetings, setMeetings] = useState<DashboardMeeting[]>([]);
  const nonCriticalFetched = useRef(false);

  // eslint-disable-next-line no-restricted-syntax -- progressive non-critical data loading after initial render
  useEffect(() => {
    if (!data || nonCriticalFetched.current) return;
    nonCriticalFetched.current = true;

    // Fire all non-critical fetches in parallel, updating state as each resolves
    companyApi.getApplications({ limit: 20 }).then((appsResult) => {
      const appsList = appsResult?.applications ?? [];
      setRecentApplications(appsList);
    }).catch((err) => {
      logger.warn("Failed to load recent applications", extractApiError(err));
    });

    companyApi.getActivity(10).then((feed) => {
      setActivityFeed(feed);
    }).catch((err) => {
      logger.debug("Failed to load activity feed", extractApiError(err));
    });

    messagingApi.getUnreadCounts().then((counts) => {
      setUnreadCount((counts as { total: number }).total ?? 0);
    }).catch((err) => {
      logger.debug("Failed to load unread counts", extractApiError(err));
    });

    // Meetings — heavier fetch (conversations + details)
    (async () => {
      try {
        const convsList = await messagingApi.getCompanyConversations();
        const toCheck = convsList.slice(0, 10);
        const convDetails = await Promise.all(
          toCheck.map((c) => messagingApi.getConversation(c.id).catch(() => null))
        );

        const now = new Date();
        const upcomingMeetings: DashboardMeeting[] = [];
        for (let i = 0; i < convDetails.length; i++) {
          const detail = convDetails[i];
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
        setMeetings(upcomingMeetings.slice(0, 5));
      } catch {
        // Meetings failed — proceed without them
      }
    })();
  }, [data]);

  const companyName = data?.companyName ?? "";
  const stats = data?.stats ?? null;
  const recentJobs = data?.recentJobs ?? [];
  const pipeline = buildPipeline(recentApplications);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between mb-8 pb-5 border-b border-border/30 dark:border-border">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white font-display font-bold text-xl">
                {companyName ? companyName.charAt(0).toUpperCase() : "C"}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground tracking-tight">
                {companyName || "Dashboard"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Here&apos;s your hiring overview
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/settings"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted/30 dark:hover:bg-muted/20 hover:text-foreground transition-all"
            >
              <Settings className="w-4 h-4 opacity-60" />
              Settings
            </Link>
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Post New Job
            </Link>
          </div>
        </div>

        {/* ═══ METRICS ═══ */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Briefcase}
            label="Active Jobs"
            value={stats?.activeJobs ?? 0}
            accentColor="primary"
          />
          <StatCard
            icon={Users}
            label="Total Applicants"
            value={stats?.totalApplicants ?? 0}
            accentColor="positive"
          />
          <StatCard
            icon={MessageSquare}
            label="Unread Messages"
            value={unreadCount}
            subtext={unreadCount > 0 ? "new" : undefined}
            subtextVariant={unreadCount > 0 ? "success" : "default"}
            accentColor="info"
          />
          <StatCard
            icon={Clock}
            label="Avg Days to Hire"
            value={stats?.averageTimeToHire ?? "\u2014"}
            accentColor="warning"
          />
        </div>

        {/* ═══ HIRING PIPELINE (Kanban) ═══ */}
        {recentApplications.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden mb-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/20 dark:border-border">
              <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Hiring Pipeline
              </h2>
              <Link href="/dashboard/candidates" className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                View Full Pipeline
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PIPELINE_STAGES.map((stage) => {
                  const apps = pipeline[stage] ?? [];
                  const config = APPLICATION_STATUS_CONFIG[stage];
                  return (
                    <div key={stage} className="flex flex-col">
                      {/* Column header */}
                      <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/20 border border-border/20 dark:border-border border-t-2 ${PIPELINE_COL_ACCENT[stage] ?? "border-t-border"} mb-2`}>
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {config?.label ?? stage}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground/60 tabular-nums">
                          {apps.length}
                        </span>
                      </div>

                      {/* Candidate cards */}
                      <div className="space-y-1.5">
                        {apps.slice(0, 3).map((app) => (
                          <Link
                            key={app.id}
                            href="/dashboard/candidates"
                            className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/10 border border-border/15 dark:border-border hover:bg-muted/20 dark:hover:bg-muted/20 hover:border-border/30 transition-all group"
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${getAvatarBg(app.candidate.fullName)}`}>
                              <span className="text-xs font-medium">
                                {app.candidate.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{app.candidate.fullName}</p>
                              <p className="text-xs text-muted-foreground/50 truncate">{app.job.title}</p>
                            </div>
                          </Link>
                        ))}
                        {apps.length > 3 && (
                          <p className="text-xs text-muted-foreground/40 text-center py-1">
                            +{apps.length - 3} more
                          </p>
                        )}
                        {apps.length === 0 && (
                          <div className="py-4 text-center">
                            <p className="text-xs text-muted-foreground/30">No candidates</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ MAIN CONTENT GRID ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 mb-6">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-6">

            {/* Recent Activity */}
            {activityFeed.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/20 dark:border-border">
                  <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Recent Activity
                  </h2>
                </div>
                <div className="divide-y divide-border/10 dark:divide-white/[0.03]">
                  {activityFeed.slice(0, 8).map((item) => {
                    const iconConfig = getActivityIcon(item.actionType);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconConfig.bg}`}>
                          <iconConfig.icon className={`w-3.5 h-3.5 ${iconConfig.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground/90 truncate">
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground/50 truncate mt-0.5">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground/40 flex-shrink-0 tabular-nums">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Applications */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/20 dark:border-border">
                <h2 className="text-sm font-display font-bold text-foreground">
                  Recent Applications
                </h2>
                <Link href="/dashboard/candidates" className="text-xs text-primary hover:text-primary/80 font-medium">
                  View All
                </Link>
              </div>
              {recentApplications.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground mb-0.5">No applications yet</p>
                  <p className="text-xs text-muted-foreground/60">
                    Applications will appear here as candidates apply
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/10 dark:divide-white/[0.03]">
                  {recentApplications.slice(0, 5).map((app) => (
                    <Link
                      key={app.id}
                      href="/dashboard/candidates"
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 dark:hover:bg-muted/20 transition-colors group"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getAvatarBg(app.candidate.fullName)}`}>
                        <span className="text-xs font-medium">
                          {app.candidate.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {app.candidate.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground/50 truncate">
                          {app.job.title} &middot; {formatTimeAgo(app.appliedAt)}
                        </p>
                      </div>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getCandidateStatusDot(app.status)}`} />
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-6">

            {/* Your Jobs */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/20 dark:border-border">
                <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  Your Jobs
                </h2>
                <Link href="/dashboard/jobs" className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                  Manage
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {recentJobs.length === 0 ? (
                <div className="text-center py-10">
                  <Briefcase className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground mb-0.5">No jobs posted</p>
                  <p className="text-xs text-muted-foreground/60 mb-3">
                    Post your first job to start receiving applications
                  </p>
                  <Link
                    href="/jobs/new"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Post a Job
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/10 dark:divide-white/[0.03]">
                  {recentJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/dashboard/jobs/${job.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 dark:hover:bg-muted/20 transition-colors group"
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          job.status === "active" ? "bg-positive" : job.status === "paused" ? "bg-warning" : "bg-muted-foreground/30"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {job.title}
                          </p>
                          <p className="text-xs text-muted-foreground/50 mt-0.5">
                            {job.location} &middot; {job.applicants ?? 0} applicants
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
                      </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Meetings */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/20 dark:border-border">
                <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Upcoming Meetings
                </h2>
              </div>
              {meetings.length === 0 ? (
                <div className="text-center py-10">
                  <Video className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground mb-0.5">No upcoming meetings</p>
                  <p className="text-xs text-muted-foreground/60">
                    Schedule interviews from your conversations
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/10 dark:divide-white/[0.03]">
                  {meetings.map((meeting, idx) => {
                    const date = new Date(meeting.details.scheduledAt);
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={`${meeting.conversationId}-${idx}`}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-info-blue/10 flex items-center justify-center flex-shrink-0">
                          <Video className="w-3.5 h-3.5 text-info-blue" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {meeting.details.title}
                          </p>
                          <p className="text-xs text-muted-foreground/50 mt-0.5">
                            {meeting.candidateName} &middot;{" "}
                            {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {meeting.details.duration ? ` &middot; ${meeting.details.duration}min` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isToday && (
                            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              Today
                            </span>
                          )}
                          {meeting.details.meetingUrl && (
                            <a
                              href={meeting.details.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
                            >
                              Join
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pending Actions */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/20 dark:border-border">
                <Zap className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-display font-bold text-foreground">
                  Pending Actions
                </h2>
              </div>
              <div className="p-4 space-y-1.5">
                {unreadCount > 0 && (
                  <Link
                    href="/dashboard/messages"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/20 dark:hover:bg-muted/20 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-positive/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-3.5 h-3.5 text-positive" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Unread Messages</p>
                      <p className="text-xs text-muted-foreground/50">
                        {unreadCount} unread {unreadCount === 1 ? "message" : "messages"}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
                  </Link>
                )}

                {recentApplications.some((a) => a.status === "pending") && (
                  <Link
                    href="/dashboard/candidates"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/20 dark:hover:bg-muted/20 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">New Applications</p>
                      <p className="text-xs text-muted-foreground/50">
                        {recentApplications.filter((a) => a.status === "pending").length} to review
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
                  </Link>
                )}

                {unreadCount === 0 && !recentApplications.some((a) => a.status === "pending") && (
                  <div className="text-center py-6">
                    <CheckCircle className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground mb-0.5">All Caught Up</p>
                    <p className="text-xs text-muted-foreground/50">
                      No pending actions at the moment
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ QUICK ACTIONS ═══ */}
        <div className="rounded-xl border border-border bg-card px-6 py-4 flex items-center gap-3 flex-wrap">
          <Link
            href="/dashboard/candidates"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted/30 dark:hover:bg-muted/20 hover:text-foreground transition-all"
          >
            <Users className="w-4 h-4 opacity-50" />
            Candidates
            {recentApplications.filter(a => a.status === "pending").length > 0 && (
              <span className="text-xs font-bold text-white bg-primary px-1.5 py-0.5 rounded-full">
                {recentApplications.filter(a => a.status === "pending").length}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/messages"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted/30 dark:hover:bg-muted/20 hover:text-foreground transition-all"
          >
            <MessageSquare className="w-4 h-4 opacity-50" />
            Messages
            {unreadCount > 0 && (
              <span className="text-xs font-bold text-white bg-primary px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/jobs"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted/30 dark:hover:bg-muted/20 hover:text-foreground transition-all"
          >
            <Briefcase className="w-4 h-4 opacity-50" />
            Manage Jobs
          </Link>
          <div className="flex-1" />
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Post New Job
          </Link>
        </div>

      </div>
    </div>
  );
}
