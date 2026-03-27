"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Eye,
  XCircle,
  Briefcase,
  Users,
  Building2,
  MapPin,
  Search,
  UserPen,
  ChevronRight,
  MessageSquare,
  Star,
  FileText,
  Calendar,
  Check,
  Circle,
  ArrowRight,
} from "lucide-react";
import { candidateApi, applicationsApi, messagingApi, extractApiError } from "@/lib/api";
import { STATUS_COLORS, STAT_ICON } from "@/config/colors";
import { logger } from "@/lib/logger";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch } from "@/lib/hooks/useFetch";
import { formatTimeAgo } from "@/lib/utils";
import { APPLICATION_STATUS_CONFIG, GUILD_APPLICATION_STATUS_CONFIG } from "@/config/constants";
import type { CandidateProfile, CandidateApplication, ApplicationStats, GuildApplicationSummary, CandidateRejectionFeedback } from "@/types";
import type { Conversation } from "@/types/messaging";
import { UpcomingMeetings } from "@/components/dashboard/UpcomingMeetings";
import { CelebrationDialog } from "@/components/candidate/CelebrationDialog";
import { RejectionFeedbackCard } from "@/components/candidate/RejectionFeedbackCard";


const CELEBRATED_KEY = "vetted:celebrated-acceptances";

function getCelebratedIds(): string[] {
  try {
    const raw = localStorage.getItem(CELEBRATED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function markCelebrated(id: string) {
  try {
    const ids = getCelebratedIds();
    if (!ids.includes(id)) {
      localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...ids, id]));
    }
  } catch {
    // Incognito or quota exceeded — silently ignore
  }
}

interface DashboardData {
  profile: CandidateProfile;
  applications: CandidateApplication[];
  stats: ApplicationStats;
  guildApplications: GuildApplicationSummary[];
  conversations: Conversation[];
  rejectionFeedback: Record<string, CandidateRejectionFeedback>;
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [profileData, applicationsData] = await Promise.all([
    candidateApi.getProfile(),
    applicationsApi.getAll(),
  ]);

  const apps = applicationsData.applications || [];

  let guildApps: GuildApplicationSummary[] = [];
  try {
    const guildAppsData = await candidateApi.getGuildApplications();
    guildApps = Array.isArray(guildAppsData) ? guildAppsData : [];
  } catch (err) {
    logger.debug("Non-critical: could not load guild applications", extractApiError(err));
  }

  let convos: Conversation[] = [];
  try {
    convos = await messagingApi.getCandidateConversations();
  } catch (err) {
    logger.debug("Non-critical: could not load conversations", extractApiError(err));
  }

  // Fetch rejection feedback for rejected guild applications
  const rejectionFeedback: Record<string, CandidateRejectionFeedback> = {};
  const rejectedGuildApps = guildApps.filter((a) => a.status === "rejected" || a.status === "finalized");
  await Promise.all(
    rejectedGuildApps.map(async (app) => {
      try {
        const feedback = await candidateApi.getGuildApplicationFeedback(app.id);
        if (feedback) rejectionFeedback[app.id] = feedback;
      } catch {
        // Feedback may not be available — silently skip
      }
    })
  );

  return {
    profile: profileData,
    applications: apps,
    stats: {
      total: apps.length,
      pending: apps.filter((a: CandidateApplication) => a.status === "pending").length,
      reviewing: apps.filter((a: CandidateApplication) => a.status === "reviewing").length,
      interviewed: apps.filter((a: CandidateApplication) => a.status === "interviewed").length,
      accepted: apps.filter((a: CandidateApplication) => a.status === "accepted").length,
      rejected: apps.filter((a: CandidateApplication) => a.status === "rejected").length,
    },
    guildApplications: guildApps,
    conversations: convos,
    rejectionFeedback,
  };
}

/* ── Pipeline helpers for dashboard mini-pipeline ── */

const PIPELINE_STEPS = ["Applied", "Review", "Interview", "Offer"] as const;

function getStepIndex(status: string): number {
  switch (status) {
    case "pending": return 0;
    case "reviewing": return 1;
    case "interviewed": return 2;
    case "accepted": return 3;
    default: return -1; // rejected
  }
}

function MiniPipeline({ status }: { status: string }) {
  const isRejected = status === "rejected";
  const currentStep = getStepIndex(status);

  return (
    <div className="flex items-center gap-0 mt-2">
      {PIPELINE_STEPS.map((label, i) => {
        const isCompleted = !isRejected && currentStep > i;
        const isCurrent = !isRejected && currentStep === i;
        const isOffer = i === PIPELINE_STEPS.length - 1;

        return (
          <div key={label} className="flex items-center">
            {/* Node */}
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isCompleted
                  ? isOffer
                    ? "bg-warning text-warning-foreground"
                    : "bg-primary text-primary-foreground"
                  : isCurrent
                    ? "border-2 border-primary text-primary"
                    : isRejected && i === currentStep + 1
                      ? "bg-negative text-white"
                      : "border border-border text-muted-foreground/40 bg-muted/30"
              }`}
              title={label}
            >
              {isCompleted ? (
                <Check className="w-2.5 h-2.5" />
              ) : isCurrent ? (
                <Circle className="w-2 h-2 fill-current" />
              ) : isRejected && i === currentStep + 1 ? (
                <XCircle className="w-2.5 h-2.5" />
              ) : null}
            </div>
            {/* Connector line */}
            {i < PIPELINE_STEPS.length - 1 && (
              <div
                className={`w-5 h-0.5 ${
                  isCompleted
                    ? "bg-primary/50"
                    : "bg-border/40"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Profile completeness calculator ── */

function getProfileCompletion(profile: CandidateProfile): { percentage: number; items: { label: string; done: boolean }[] } {
  const items = [
    { label: "Full name added", done: !!profile.fullName },
    { label: "Headline set", done: !!profile.headline },
    { label: "Bio written", done: !!profile.bio },
    { label: "Resume uploaded", done: !!profile.resumeUrl },
    { label: "LinkedIn connected", done: !!profile.linkedIn },
    { label: "GitHub linked", done: !!profile.github },
  ];
  const done = items.filter((i) => i.done).length;
  const percentage = Math.round((done / items.length) * 100);
  return { percentage, items };
}

/* ── Profile Ring SVG ── */

function ProfileRing({ percentage, size = 110 }: { percentage: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-border/20"
          strokeWidth={5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-primary"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-display text-primary tabular-nums">{percentage}%</span>
        <span className="text-xs text-muted-foreground">Complete</span>
      </div>
    </div>
  );
}

export default function CandidateDashboard() {
  const { ready } = useRequireAuth("candidate");

  const { data, isLoading } = useFetch(
    () => fetchDashboardData(),
    { skip: !ready }
  );

  const profile = data?.profile ?? null;
  const applications = useMemo(() => data?.applications ?? [], [data?.applications]);
  const stats = data?.stats ?? { total: 0, pending: 0, reviewing: 0, interviewed: 0, accepted: 0, rejected: 0 };
  const guildApplications = data?.guildApplications ?? [];
  const conversations = data?.conversations ?? [];
  const rejectionFeedback = data?.rejectionFeedback ?? {};

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const celebrationApp = useMemo(() => {
    if (applications.length === 0) return null;
    const celebrated = getCelebratedIds();
    return applications.find(
      (app) => app.status === "accepted" && !celebrated.includes(app.id) && !dismissedIds.has(app.id)
    ) ?? null;
  }, [applications, dismissedIds]);

  const handleDismissCelebration = () => {
    if (celebrationApp) {
      markCelebrated(celebrationApp.id);
      setDismissedIds(prev => new Set(prev).add(celebrationApp.id));
    }
  };

  if (!ready) return null;

  if (isLoading) {
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Profile not found</p>
          <Link href="/auth/login?type=candidate" className="text-primary hover:underline">
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  const profileCompletion = getProfileCompletion(profile);
  const recentApplications = applications.slice(0, 5);
  const recentGuildApps = guildApplications.slice(0, 3);
  const recentConversations = [...conversations]
    .sort((a, b) => (b.unreadCount > 0 ? 1 : 0) - (a.unreadCount > 0 ? 1 : 0) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const firstName = profile.fullName?.split(" ")[0] || "there";
  const initials = profile.fullName
    ? profile.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="min-h-full relative animate-page-enter">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">

        {/* ── Welcome Header ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-white font-display font-bold text-xl flex-shrink-0">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
                Welcome back, {firstName}
              </h1>
              {profile.headline && (
                <p className="text-sm text-muted-foreground mt-0.5">{profile.headline}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/candidate/profile"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <UserPen className="w-3.5 h-3.5" />
              Edit Profile
            </Link>
            <Link
              href="/browse/jobs"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Search className="w-3.5 h-3.5" />
              Browse Jobs
            </Link>
          </div>
        </div>

        {/* ── Quick Stats Strip ── */}
        <div className="flex items-stretch gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {/* Applications */}
          <div className="flex-1 min-w-[150px] flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${STAT_ICON.bg}`}>
              <FileText className={`w-[18px] h-[18px] ${STAT_ICON.text}`} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xl font-display font-bold tabular-nums text-foreground">{stats.total}</span>
              <span className="text-xs text-muted-foreground font-medium">Applications</span>
            </div>
          </div>

          {/* Interviews */}
          <div className="flex-1 min-w-[150px] flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${STAT_ICON.bg}`}>
              <Calendar className={`w-[18px] h-[18px] ${STAT_ICON.text}`} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xl font-display font-bold tabular-nums text-foreground">{stats.interviewed}</span>
              <span className="text-xs text-muted-foreground font-medium">Interviews</span>
            </div>
          </div>

          {/* Offers -- golden glow */}
          <div className="flex-1 min-w-[150px] flex items-center gap-3 rounded-xl border border-warning/20 bg-card px-4 py-3.5 relative overflow-hidden">
            <div className="absolute inset-0 bg-transparent pointer-events-none rounded-xl" />
            <div className="relative w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-warning/15">
              <Star className="w-[18px] h-[18px] text-warning" />
            </div>
            <div className="relative flex flex-col gap-0.5">
              <span className="text-xl font-display font-bold tabular-nums text-warning">{stats.accepted}</span>
              <span className="text-xs text-muted-foreground font-medium">{stats.accepted === 1 ? "Offer" : "Offers"}</span>
            </div>
          </div>

          {/* In Review */}
          <div className="flex-1 min-w-[150px] flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${STAT_ICON.bg}`}>
              <Eye className={`w-[18px] h-[18px] ${STAT_ICON.text}`} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xl font-display font-bold tabular-nums text-foreground">{stats.reviewing}</span>
              <span className="text-xs text-muted-foreground font-medium">In Review</span>
            </div>
          </div>

          {/* Profile Strength Mini Ring */}
          <div className="flex-1 min-w-[160px] flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
            <div className="relative flex-shrink-0" style={{ width: 40, height: 40 }}>
              <svg width={40} height={40} className="-rotate-90">
                <circle cx={20} cy={20} r={16} fill="none" className="stroke-border/20" strokeWidth={3} />
                <circle
                  cx={20} cy={20} r={16}
                  fill="none"
                  className="stroke-primary"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 16}
                  strokeDashoffset={2 * Math.PI * 16 - (profileCompletion.percentage / 100) * 2 * Math.PI * 16}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary font-display">
                {profileCompletion.percentage}%
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xl font-display font-bold tabular-nums text-foreground">{profileCompletion.percentage}%</span>
              <span className="text-xs text-muted-foreground font-medium">Profile Strength</span>
            </div>
          </div>
        </div>

        {/* ── Two-Column Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── Left Column (3 cols) ── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Active Applications */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground/50" />
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider font-display">
                    Active Applications
                  </h2>
                </div>
                {applications.length > 5 && (
                  <Link
                    href="/candidate/applications"
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    View All ({applications.length}) <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              {recentApplications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 px-6">
                  <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
                    <Search className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">No applications yet -- start exploring</p>
                  <Link
                    href="/browse/jobs"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Briefcase className="w-4 h-4" />
                    Browse Jobs
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {recentApplications.map((app) => {
                    const statusStyle = APPLICATION_STATUS_CONFIG[app.status] || APPLICATION_STATUS_CONFIG.pending;
                    const companyInitial = app.job.companyName ? app.job.companyName[0].toUpperCase() : "?";
                    return (
                      <Link
                        key={app.id}
                        href={`/browse/jobs/${app.job.id}`}
                        className="flex items-start gap-4 w-full px-5 py-4 text-left hover:bg-muted/30 transition-colors group"
                      >
                        {/* Company avatar */}
                        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-sm font-bold text-muted-foreground">
                          {companyInitial}
                        </div>
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {app.job.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                {app.job.companyName && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {app.job.companyName}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {app.job.location}
                                </span>
                              </div>
                            </div>
                            <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${statusStyle.className}`}>
                              {statusStyle.label}
                            </span>
                          </div>
                          {/* Mini pipeline */}
                          <MiniPipeline status={app.status} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Meetings */}
            <UpcomingMeetings userType="candidate" />
          </div>

          {/* ── Right Column (2 cols) ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Profile Completion Ring */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider font-display">
                  Profile Completion
                </h2>
              </div>
              <div className="px-5 py-5">
                <div className="flex flex-col items-center mb-4">
                  <ProfileRing percentage={profileCompletion.percentage} />
                </div>
                <div className="space-y-2">
                  {profileCompletion.items.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2.5 py-1.5 text-sm ${item.done ? "text-muted-foreground" : "text-foreground"}`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                        item.done ? STATUS_COLORS.positive.bgSubtle : "bg-muted/40"
                      }`}>
                        {item.done ? (
                          <Check className={`w-3 h-3 ${STATUS_COLORS.positive.icon}`} />
                        ) : (
                          <Circle className="w-3 h-3 text-muted-foreground/40" />
                        )}
                      </div>
                      <span className="text-sm">{item.label}</span>
                    </div>
                  ))}
                </div>
                {profileCompletion.percentage < 100 && (
                  <Link
                    href="/candidate/profile"
                    className="block w-full mt-4 px-4 py-2.5 text-center text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Complete Your Profile
                  </Link>
                )}
              </div>
            </div>

            {/* Guild Applications */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider font-display">
                  Guild Applications
                </h2>
                {guildApplications.length > 3 && (
                  <Link
                    href="/candidate/guilds"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              {recentGuildApps.length === 0 ? (
                <div className="flex flex-col items-center py-10 px-6">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">No guild applications</p>
                  <Link
                    href="/guilds"
                    className="text-xs text-primary hover:underline"
                  >
                    Explore Guilds
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {recentGuildApps.map((app) => {
                    const guildStatusConfig = GUILD_APPLICATION_STATUS_CONFIG[app.status] || GUILD_APPLICATION_STATUS_CONFIG.pending;
                    const feedback = rejectionFeedback[app.id];
                    return (
                      <div key={app.id}>
                        <div className="px-5 py-3.5">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {app.guildName || app.guild?.name || "Guild"}
                            </p>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${guildStatusConfig.className}`}>
                              {guildStatusConfig.label}
                            </span>
                          </div>
                          {app.jobTitle && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              {app.jobTitle}
                            </p>
                          )}
                        </div>
                        {feedback && (
                          <div className="px-3 pb-3">
                            <RejectionFeedbackCard feedback={feedback} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider font-display">
                    Messages
                  </h2>
                  {totalUnread > 0 && (
                    <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                      {totalUnread}
                    </span>
                  )}
                </div>
                {conversations.length > 0 && (
                  <Link
                    href="/candidate/messages"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View Inbox <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              {recentConversations.length === 0 ? (
                <div className="flex flex-col items-center py-10 px-6">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {recentConversations.map((convo) => (
                    <Link
                      key={convo.id}
                      href={`/candidate/messages?conversation=${convo.id}`}
                      className="flex items-start gap-3 w-full px-5 py-3.5 text-left hover:bg-muted/30 transition-colors group"
                    >
                      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center relative ${
                        convo.unreadCount > 0
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted/50 border border-border"
                      }`}>
                        <Building2 className={`w-4 h-4 ${convo.unreadCount > 0 ? "text-primary" : "text-muted-foreground"}`} />
                        {convo.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className={`text-sm truncate ${
                            convo.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"
                          }`}>
                            {convo.companyName}
                          </p>
                          <span className="text-xs text-muted-foreground/60 flex-shrink-0">
                            {formatTimeAgo(convo.lastMessage?.createdAt || convo.updatedAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{convo.jobTitle}</p>
                        {convo.lastMessage && (
                          <p className={`text-xs mt-1 truncate ${
                            convo.unreadCount > 0 ? "text-foreground/70 font-medium" : "text-muted-foreground"
                          }`}>
                            {convo.lastMessage.senderType === "candidate" ? "You: " : ""}{convo.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider font-display">
                  Quick Actions
                </h2>
              </div>
              <div className="p-2">
                {[
                  { label: "Browse Jobs",    icon: Briefcase,      href: "/browse/jobs" },
                  { label: "Messages",       icon: MessageSquare,  href: "/candidate/messages" },
                  { label: "Explore Guilds", icon: Users,          href: "/guilds" },
                  { label: "Edit Profile",   icon: UserPen,        href: "/candidate/profile" },
                ].map(({ label, icon: QIcon, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors group"
                  >
                    <QIcon className="w-4 h-4 text-primary" />
                    <span className="flex-1 text-left">{label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {celebrationApp && (
        <CelebrationDialog
          application={celebrationApp}
          open={!!celebrationApp}
          onClose={handleDismissCelebration}
        />
      )}
    </div>
  );
}
