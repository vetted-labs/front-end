"use client";

import Link from "next/link";
import {
  Clock,
  Eye,
  TrendingUp,
  CheckCircle,
  XCircle,
  Briefcase,
  Users,
  Building2,
  MapPin,
  ArrowRight,
  Search,
  UserPen,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { candidateApi, applicationsApi, messagingApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch } from "@/lib/hooks/useFetch";
import { formatTimeAgo } from "@/lib/notification-helpers";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import type { CandidateProfile, CandidateApplication, ApplicationStats, GuildApplicationSummary } from "@/types";
import type { Conversation } from "@/types/messaging";
import { UpcomingMeetings } from "@/components/dashboard/UpcomingMeetings";


const STATUS_ICONS: Record<string, typeof Clock> = {
  pending:     Clock,
  reviewing:   Eye,
  interviewed: TrendingUp,
  accepted:    CheckCircle,
  rejected:    XCircle,
};

interface DashboardData {
  profile: CandidateProfile;
  applications: CandidateApplication[];
  stats: ApplicationStats;
  guildApplications: GuildApplicationSummary[];
  conversations: Conversation[];
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
  } catch {
    // Non-critical — proceed without guild applications
  }

  let convos: Conversation[] = [];
  try {
    const convosData = await messagingApi.getCandidateConversations();
    convos = Array.isArray(convosData) ? convosData : (convosData as { conversations?: Conversation[] })?.conversations || [];
  } catch {
    // Non-critical — proceed without conversations
  }

  return {
    profile: profileData as CandidateProfile,
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
  };
}

export default function CandidateDashboard() {
  const { ready } = useRequireAuth("candidate");

  const { data, isLoading } = useFetch(
    () => fetchDashboardData(),
    { skip: !ready }
  );

  const profile = data?.profile ?? null;
  const applications = data?.applications ?? [];
  const stats = data?.stats ?? { total: 0, pending: 0, reviewing: 0, interviewed: 0, accepted: 0, rejected: 0 };
  const guildApplications = data?.guildApplications ?? [];
  const conversations = data?.conversations ?? [];

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

  const recentApplications = applications.slice(0, 5);
  const recentGuildApps = guildApplications.slice(0, 3);
  // Show unread first, then most recent
  const recentConversations = [...conversations]
    .sort((a, b) => (b.unreadCount > 0 ? 1 : 0) - (a.unreadCount > 0 ? 1 : 0) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // Active stats to show (non-zero, or always show total + pending)
  const statEntries: { key: string; label: string; value: number; color: string }[] = [
    { key: "total",    label: "Applied",     value: stats.total,       color: "text-primary" },
    { key: "pending",  label: "Pending",     value: stats.pending,     color: "text-amber-500" },
    { key: "reviewing",label: "In Review",   value: stats.reviewing,   color: "text-blue-500" },
    { key: "accepted", label: "Accepted",    value: stats.accepted,    color: "text-emerald-500" },
    { key: "rejected", label: "Rejected",    value: stats.rejected,    color: "text-red-500" },
  ];

  return (
    <div className="min-h-full relative animate-page-enter">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Welcome back, {profile.fullName?.split(" ")[0]}
            </h1>
            {profile.headline && (
              <p className="text-sm text-muted-foreground mt-1">{profile.headline}</p>
            )}
          </div>
          <Link
            href="/candidate/profile"
            className="flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-card/60 backdrop-blur text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            <UserPen className="w-3.5 h-3.5" />
            Edit Profile
          </Link>
        </div>

        {/* Stats row — compact, glassy */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {statEntries.map(({ key, label, value, color }) => (
            <div
              key={key}
              className="flex-shrink-0 flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 backdrop-blur-md px-4 py-3 min-w-[120px]"
            >
              <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
              <span className="text-xs text-muted-foreground leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Applications — takes 3 cols */}
          <div className="lg:col-span-3 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Recent Applications
              </h2>
              {applications.length > 5 && (
                <Link
                  href="/candidate/applications"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
            {recentApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-6">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">No applications yet — start exploring</p>
                <Link
                  href="/browse/jobs"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full bg-gradient-to-r from-primary to-accent text-[hsl(var(--gradient-button-text))] hover:opacity-90 transition-opacity"
                >
                  <Briefcase className="w-4 h-4" />
                  Browse Jobs
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {recentApplications.map((app) => {
                  const statusStyle = APPLICATION_STATUS_CONFIG[app.status] || APPLICATION_STATUS_CONFIG.pending;
                  const Icon = STATUS_ICONS[app.status] || Clock;
                  return (
                    <Link
                      key={app.id}
                      href={`/browse/jobs/${app.job.id}`}
                      className="flex items-center gap-4 w-full px-5 py-3.5 text-left hover:bg-muted/30 transition-colors group"
                    >
                      <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${statusStyle.className} border flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
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
                      <span className={`flex-shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${statusStyle.className}`}>
                        {statusStyle.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column — 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Guild Applications */}
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
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
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
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
                    const statusColor = app.status === "approved"
                      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                      : app.status === "rejected"
                      ? "text-red-500 bg-red-500/10 border-red-500/20"
                      : "text-amber-500 bg-amber-500/10 border-amber-500/20";
                    return (
                      <div key={app.id} className="px-5 py-3.5">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {app.guildName || app.guild?.name || "Guild"}
                          </p>
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize ${statusColor}`}>
                            {app.status}
                          </span>
                        </div>
                        {app.jobTitle && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {app.jobTitle}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Meetings */}
            <UpcomingMeetings userType="candidate" />

            {/* Recent Messages */}
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Messages
                  </h2>
                  {totalUnread > 0 && (
                    <span className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                      {totalUnread}
                    </span>
                  )}
                </div>
                {conversations.length > 0 && (
                  <Link
                    href="/candidate/messages"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              {recentConversations.length === 0 ? (
                <div className="flex flex-col items-center py-10 px-6">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
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
                      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                        convo.unreadCount > 0
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted/50 border border-border/40"
                      }`}>
                        <Building2 className={`w-4 h-4 ${convo.unreadCount > 0 ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className={`text-sm truncate ${
                            convo.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"
                          }`}>
                            {convo.companyName}
                          </p>
                          {convo.unreadCount > 0 && (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{convo.jobTitle}</p>
                        {convo.lastMessage && (
                          <p className={`text-xs mt-1 truncate ${
                            convo.unreadCount > 0 ? "text-foreground/70 font-medium" : "text-muted-foreground"
                          }`}>
                            {convo.lastMessage.senderType === "candidate" ? "You: " : ""}{convo.lastMessage.content}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatTimeAgo(convo.lastMessage?.createdAt || convo.updatedAt)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Quick Actions
                </h2>
              </div>
              <div className="p-2">
                {[
                  { label: "Browse Jobs",   icon: Briefcase,      href: "/browse/jobs" },
                  { label: "Messages",      icon: MessageSquare,  href: "/candidate/messages" },
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
    </div>
  );
}
