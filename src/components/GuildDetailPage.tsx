"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  Users,
  Briefcase,
  Award,
  Star,
  TrendingUp,
  CheckCircle2,
  Clock,
  MapPin,
  DollarSign,
  Target,
  Trophy,
  Zap,
  FileText,
  Calendar,
  LayoutDashboard,
  Coins,
  Activity,
  CheckCircle,
} from "lucide-react";
import { Alert, Button, PillTabs } from "@/components/ui";
import { guildsApi, guildApplicationsApi } from "@/lib/api";
import { getGuildIcon, getGuildColor, getGuildBgColor, getRoleBadgeColor } from "@/lib/guildHelpers";
import { formatSalaryRange } from "@/lib/utils";
import { useAuthContext } from "@/hooks/useAuthContext";
import { GuildActivityFeed } from "@/components/guild/GuildActivityTab";
import type { GuildActivity } from "@/components/guild/GuildActivityTab";
import type { Guild, Job, ExpertMember, CandidateMember } from "@/types";


/** Extended guild detail with nested members, jobs, and activity. */
interface GuildDetail extends Guild {
  expertCount: number;
  candidateCount: number;
  totalMembers: number;
  experts: ExpertMember[];
  candidates: CandidateMember[];
  openPositions: number;
  recentJobs: Job[];
  totalProposalsReviewed: number;
  averageApprovalTime: string;
  recentActivity: GuildActivity[];
  establishedDate: string;
}

interface MembershipStatus {
  isMember: boolean;
  status?: "pending" | "approved" | "rejected";
  appliedAt?: string;
  role?: "recruit" | "craftsman" | "master";
}

interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  memberId: string;
  walletAddress?: string;
  fullName: string;
  role: "recruit" | "craftsman" | "master" | "candidate";
  reputation: number;
  totalReviews?: number;
  successRate?: number;
  contributionScore: number;
  reputationChange?: string;
  trend?: "up" | "down" | "same";
}



export default function GuildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const auth = useAuthContext();
  const guildId = decodeURIComponent(params.guildId as string);

  const [guild, setGuild] = useState<GuildDetail | null>(null);
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "experts" | "candidates" | "jobs" | "activity" | "leaderboard">("overview");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);


  const isAuthenticated = auth.isAuthenticated || isConnected;

  useEffect(() => {
    fetchGuildData();
  }, [guildId, isConnected, address]);

  const fetchGuildData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch public guild details
      const raw: any = await guildsApi.getPublicDetail(guildId);
      const experts: ExpertMember[] = Array.isArray(raw.experts) ? raw.experts : [];
      const candidates: CandidateMember[] = Array.isArray(raw.candidates) ? raw.candidates : [];
      const recentJobs: Job[] = Array.isArray(raw.recentJobs) ? raw.recentJobs : [];
      let recentActivity: GuildActivity[] = Array.isArray(raw.recentActivity) ? raw.recentActivity : [];

      // Fetch guild applications (candidate + expert proposals) for activity
      let candidateApps: any[] = [];
      let guildProposals: any[] = [];
      try {
        const [candResult, proposalResult] = await Promise.allSettled([
          guildsApi.getCandidateApplications(guildId),
          guildApplicationsApi.getByGuild(guildId),
        ]);
        if (candResult.status === "fulfilled") {
          candidateApps = Array.isArray(candResult.value) ? candResult.value : [];
        }
        if (proposalResult.status === "fulfilled") {
          guildProposals = Array.isArray(proposalResult.value) ? proposalResult.value : [];
        }
      } catch {
        // Non-critical — activity will just lack application events
      }

      // Derive activity from existing data when backend returns none
      if (recentActivity.length === 0) {
        const derived: GuildActivity[] = [];
        experts.forEach((e) => {
          if (e.joinedAt) {
            derived.push({
              id: `expert-join-${e.id}`,
              type: "expert_joined",
              actor: e.fullName,
              details: `joined as ${e.role || "expert"}`,
              timestamp: e.joinedAt,
            });
          }
        });
        candidates.forEach((c) => {
          if (c.joinedAt) {
            derived.push({
              id: `candidate-join-${c.id}`,
              type: "candidate_joined",
              actor: c.fullName,
              details: "joined as a candidate member",
              timestamp: c.joinedAt,
            });
          }
        });
        recentJobs.forEach((j) => {
          if (j.createdAt) {
            derived.push({
              id: `job-posted-${j.id}`,
              type: "job_posted",
              actor: j.title,
              details: `new position opened · ${j.location || "Remote"} · ${j.type || "Full-time"}`,
              timestamp: j.createdAt,
            });
          }
        });
        // Candidate guild applications (pending/approved/rejected)
        candidateApps.forEach((app: any) => {
          const ts = app.submittedAt || app.createdAt;
          if (!ts) return;
          const statusLabel = app.status === "approved" ? "approved" : app.status === "rejected" ? "rejected" : "pending review";
          derived.push({
            id: `cand-app-${app.id}`,
            type: "application_submitted",
            actor: app.candidateName || "A candidate",
            details: `applied to join${app.jobTitle ? ` for ${app.jobTitle}` : ""} · ${statusLabel}`,
            timestamp: ts,
          });
        });
        // Expert/legacy guild proposals
        guildProposals.forEach((p: any) => {
          const ts = p.createdAt;
          if (!ts) return;
          // Skip if we already have this person as a candidate app
          if (candidateApps.some((a: any) => a.candidateEmail === p.candidateEmail && a.id !== p.id)) return;
          const statusLabel = p.status === "approved" ? "approved" : p.status === "rejected" ? "rejected" : "pending review";
          derived.push({
            id: `proposal-${p.id}`,
            type: "application_submitted",
            actor: p.candidateName || "A member",
            details: `submitted an application · ${statusLabel}`,
            timestamp: ts,
          });
        });
        derived.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        recentActivity = derived.slice(0, 50);
      }

      const guildData: GuildDetail = {
        ...raw,
        experts,
        candidates,
        recentJobs,
        recentActivity,
        expertCount: raw.expertCount ?? experts.length,
        candidateCount: raw.candidateCount ?? candidates.length,
        totalMembers: raw.totalMembers ?? raw.memberCount ?? 0,
        openPositions: raw.openPositions ?? recentJobs.length,
        totalProposalsReviewed: raw.totalProposalsReviewed ?? raw.statistics?.vettedProposals ?? 0,
        averageApprovalTime: raw.averageApprovalTime ?? "—",
        establishedDate: raw.establishedDate ?? raw.createdAt ?? "",
      };
      setGuild(guildData);

      // If authenticated, check membership status
      const userId = auth.userId || address;

      if (userId) {
        try {
          const membershipData: any = await guildsApi.checkMembership(userId, guildId);
          setMembership(membershipData);
        } catch (err) {
          // Not a member - that's okay
          setMembership({ isMember: false });
        }
      }
    } catch (err) {
      console.error("[Guild Page] Error loading guild:", err);
      setError("Failed to load guild details. Please try again later.");
      setGuild(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const leaderboardData: any = await guildsApi.getLeaderboard(guildId, { limit: 100 });
      const entries = leaderboardData.leaderboard || [];
      setLeaderboard(entries.filter((e: any) => e.role !== "candidate"));
    } catch (err) {
      // Silently fall back to mock data if backend isn't ready
      // console.error("[Guild Page] Failed to fetch leaderboard:", err);

      // Use mock leaderboard data if backend isn't ready
      const mockLeaderboard: LeaderboardEntry[] = [
        {
          rank: 1,
          previousRank: 2,
          memberId: "expert-1",
          fullName: "Sarah Chen",
          role: "master",
          reputation: 1850,
          totalReviews: 48,
          successRate: 94,
          contributionScore: 950,
          reputationChange: "+150",
          trend: "up",
        },
        {
          rank: 2,
          previousRank: 1,
          memberId: "expert-2",
          fullName: "Michael Rodriguez",
          role: "craftsman",
          reputation: 1420,
          totalReviews: 35,
          successRate: 91,
          contributionScore: 820,
          reputationChange: "+80",
          trend: "down",
        },
        {
          rank: 3,
          previousRank: 4,
          memberId: "expert-3",
          fullName: "Emily Watson",
          role: "craftsman",
          reputation: 1280,
          totalReviews: 29,
          successRate: 89,
          contributionScore: 750,
          reputationChange: "+120",
          trend: "up",
        },
        {
          rank: 4,
          previousRank: 3,
          memberId: "expert-4",
          fullName: "James Kim",
          role: "recruit",
          reputation: 850,
          totalReviews: 18,
          successRate: 85,
          contributionScore: 580,
          reputationChange: "-20",
          trend: "down",
        },
      ];

      setLeaderboard(mockLeaderboard);
    }
  };

  useEffect(() => {
    if (activeTab === "leaderboard" && leaderboard.length === 0) {
      fetchLeaderboard();
    }
  }, [activeTab]);

  const handleApplyToGuild = () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?type=candidate&redirect=/guilds/${guildId}/apply`);
      return;
    }
    // Wallet-connected users (experts) go through the expert application flow
    if (isConnected) {
      router.push(`/expert/apply?guild=${encodeURIComponent(guildId)}`);
      return;
    }
    router.push(`/guilds/${guildId}/apply`);
  };

  if (isLoading) {
    return null;
  }

  if (error || !guild) {
    return (
      <div className="min-h-screen min-h-full overflow-x-hidden flex items-center justify-center">
        <Alert variant="error">{error || "Guild not found"}</Alert>
      </div>
    );
  }

  const showApplyButton = !membership?.isMember && membership?.status !== "pending";
  const showPendingStatus = membership?.status === "pending";
  const showMemberBadge = membership?.isMember;

  return (
    <div className="relative bg-gradient-to-b from-background via-background to-muted overflow-x-hidden animate-page-enter">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -top-20 right-[-10%] h-[360px] w-[360px] rounded-full bg-orange-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] bg-[size:140px_140px] opacity-20" />
      </div>
      <div className="relative z-10">
      {/* Hero Section */}
      <div className={`relative overflow-hidden bg-gradient-to-r ${getGuildBgColor(guild.name)} border-b border-border/60`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.2),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="rounded-3xl border border-border bg-card/80 backdrop-blur p-6 sm:p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_25px_60px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${getGuildColor(guild.name)} rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-white/10 flex-shrink-0`}>
                  {(() => {
                    const GuildIcon = getGuildIcon(guild.name);
                    return <GuildIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />;
                  })()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground">{guild.name}</h1>
                    {showMemberBadge && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/40 rounded-full shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-emerald-300 text-xs">Member</span>
                          {membership.role && (
                            <>
                              <span className="text-emerald-300/70">•</span>
                              <span className={`font-semibold text-xs capitalize ${
                                membership.role === 'master'
                                  ? 'text-amber-300'
                                  : membership.role === 'craftsman'
                                  ? 'text-primary'
                                  : 'text-blue-300'
                              }`}>
                                {membership.role}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {showPendingStatus && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border border-amber-500/40 rounded-full shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Clock className="w-4 h-4 text-amber-300 animate-pulse" />
                        <span className="font-semibold text-amber-200 text-xs">Pending Review</span>
                      </div>
                    )}
                  </div>
                  <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed mb-4">
                    {guild.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 lg:ml-auto">
                {membership?.isMember && auth.userType === "expert" && (
                  <button
                    onClick={() => router.push(`/expert/guild/${guildId}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card/70 border border-border rounded-full hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Expert Dashboard
                  </button>
                )}
                {showApplyButton && (
                  <Button onClick={handleApplyToGuild} size="lg" className="px-8 rounded-full">
                    Apply to Join Guild
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="font-semibold text-foreground">
                  {guild.totalMembers || (guild.expertCount + guild.candidateCount)} Members
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-foreground">{guild.expertCount} Experts</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">{guild.openPositions} Open Roles</span>
              </div>
              {guild.establishedDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Est. {new Date(guild.establishedDate).getFullYear()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Guild Stats Bar */}

      <div className="border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-4 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="w-5 h-5 text-primary" />
                <p className="text-2xl font-bold text-foreground">{guild.totalProposalsReviewed || 0}</p>
              </div>
              <p className="text-sm text-muted-foreground">Applications Reviewed</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-4 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <p className="text-2xl font-bold text-foreground">{guild.averageApprovalTime || "24h"}</p>
              </div>
              <p className="text-sm text-muted-foreground">Avg Approval Time</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-4 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <p className="text-2xl font-bold text-foreground">{guild.candidates?.length || guild.candidateCount || 0}</p>
              </div>
              <p className="text-sm text-muted-foreground">Vetted Candidates</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-4 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-green-500" />
                <p className="text-2xl font-bold text-foreground">
                  {(guild as any).totalVetdStaked != null
                    ? Number((guild as any).totalVetdStaked).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : (guild as any).statistics?.totalVetdStaked != null
                    ? Number((guild as any).statistics.totalVetdStaked).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : "0"}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Total VETD Staked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="border-b border-border/60 mb-8 pb-2">
          <PillTabs
            tabs={[
              { value: "overview" as const, label: "Overview" },
              { value: "experts" as const, label: `Experts (${guild.experts?.length || guild.expertCount || 0})` },
              { value: "candidates" as const, label: `Candidates (${guild.candidates?.length || guild.candidateCount || 0})` },
              { value: "jobs" as const, label: `Jobs (${guild.recentJobs?.length || 0})` },
              { value: "activity" as const, label: "Activity" },
              { value: "leaderboard" as const, label: "Leaderboard" },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Tab Content */}
        <div className="pb-12">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Top Experts */}
                <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.35)]">
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    Top Experts
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {(guild.experts || []).slice(0, 4).map((expert) => (
                      <button
                        key={expert.id}
                        onClick={() => router.push(`/experts/${expert.walletAddress}`)}
                        className="rounded-xl border border-border/80 bg-card/60 p-4 hover:border-primary/40 hover:shadow-lg transition-all hover:-translate-y-0.5 text-left cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{expert.fullName}</h3>
                            <span
                              className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${getRoleBadgeColor(
                                expert.role
                              )}`}
                            >
                              {expert.role.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-primary">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="font-bold">{expert.reputation}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(expert.expertise ?? []).slice(0, 3).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-muted/60 text-foreground text-xs rounded-md border border-border/60"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                        {(expert.totalReviews ?? 0) > 0 && (
                          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                            {expert.totalReviews} reviews • {expert.successRate}% success rate
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {(guild.experts || []).length > 4 && (
                    <button
                      onClick={() => setActiveTab("experts")}
                      className="mt-4 text-sm text-primary hover:underline"
                    >
                      View all {guild.experts?.length || guild.expertCount} experts →
                    </button>
                  )}
                </div>

                {/* Recent Jobs */}
                <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.35)]">
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    Recent Positions
                  </h2>
                  {guild.recentJobs && guild.recentJobs.length > 0 ? (
                    <div className="space-y-3">
                      {guild.recentJobs.slice(0, 5).map((job) => (
                        <button
                          key={job.id}
                          onClick={() => router.push(`/browse/jobs/${job.id}`)}
                          className="w-full rounded-xl border border-border/80 bg-card/60 p-4 hover:border-primary/40 hover:shadow-lg transition-all hover:-translate-y-0.5 text-left"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground mb-2">{job.title}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {job.location}
                                </span>
                                <span className="px-2 py-1 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 text-xs font-medium rounded">
                                  {job.type}
                                </span>
                                {(job.salary.min || job.salary.max) && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-4 h-4" />
                                    {formatSalaryRange(job.salary)}
                                  </span>
                                )}
                                {(job.applicants ?? 0) > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {job.applicants} applicants
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(job.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No recent job postings
                    </p>
                  )}
                  <button
                    onClick={() => setActiveTab("jobs")}
                    className="mt-4 text-sm text-primary hover:underline"
                  >
                    View all jobs →
                  </button>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Why Join */}
                <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.35)]">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Why Join This Guild?
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Vetted by Experts</p>
                        <p className="text-sm text-muted-foreground">
                          Get reviewed and endorsed by industry professionals
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Exclusive Access</p>
                        <p className="text-sm text-muted-foreground">
                          Apply to guild-specific job openings
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Build Reputation</p>
                        <p className="text-sm text-muted-foreground">
                          Earn reputation points and stand out to employers
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Community Support</p>
                        <p className="text-sm text-muted-foreground">
                          Connect with peers and mentors in your field
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Recent Activity */}
                {guild.recentActivity && guild.recentActivity.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.35)]">
                    <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Recent Activity
                    </h3>
                    <GuildActivityFeed
                      activities={guild.recentActivity}
                      compact
                      maxItems={8}
                      maxHeight="320px"
                      onViewAll={() => setActiveTab("activity")}
                    />
                  </div>
                )}

                {/* CTA */}
                {!showMemberBadge && !showPendingStatus && (
                  <div className="bg-gradient-to-br from-primary/15 via-primary/10 to-accent/10 rounded-2xl border border-primary/30 p-6 shadow-[0_0_30px_rgba(255,122,0,0.12)]">
                    <h3 className="text-lg font-bold text-foreground mb-2">Ready to Join?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Submit your application and get vetted by our expert community
                    </p>
                    <Button onClick={handleApplyToGuild} className="w-full">
                      Apply Now
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Experts Tab */}
          {activeTab === "experts" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Expert Members</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(guild.experts || []).map((expert) => (
                  <button
                    key={expert.id}
                    onClick={() => router.push(`/experts/${expert.walletAddress}`)}
                    className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.35)] hover:border-primary/50 hover:shadow-lg transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg mb-2 group-hover:text-primary transition-colors">{expert.fullName}</h3>
                        <span
                          className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${getRoleBadgeColor(
                            expert.role
                          )}`}
                        >
                          {expert.role.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-primary mb-1">
                          <Star className="w-5 h-5 fill-current" />
                          <span className="font-bold text-lg">{expert.reputation}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">reputation</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(expert.expertise ?? []).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-muted/60 text-foreground text-xs rounded-md border border-border/60"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Reviews</p>
                          <p className="font-semibold text-foreground">{expert.totalReviews || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Success Rate</p>
                          <p className="font-semibold text-foreground">{expert.successRate || 0}%</p>
                        </div>
                      </div>
                      {expert.joinedAt && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Joined {new Date(expert.joinedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {(guild.experts || []).length === 0 && (
                <p className="text-center text-muted-foreground py-12">No experts in this guild yet</p>
              )}
            </div>
          )}

          {/* Candidates Tab */}
          {activeTab === "candidates" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Candidate Members</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guild.candidates && guild.candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.35)] hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg mb-1">{candidate.fullName}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{candidate.headline}</p>
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full capitalize">
                          {candidate.experienceLevel}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-primary mb-1">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="font-bold">{candidate.reputation || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Endorsements</p>
                          <p className="font-semibold text-foreground">{candidate.endorsements || 0}</p>
                        </div>
                        {candidate.joinedAt && (
                          <div>
                            <p className="text-muted-foreground">Member Since</p>
                            <p className="font-semibold text-foreground text-xs">
                              {new Date(candidate.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {(!guild.candidates || guild.candidates.length === 0) && (
                <p className="text-center text-muted-foreground py-12">No candidates in this guild yet</p>
              )}
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === "jobs" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Open Positions</h2>
              {guild.recentJobs && guild.recentJobs.length > 0 ? (
                <div className="space-y-4">
                  {guild.recentJobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => router.push(`/browse/jobs/${job.id}`)}
                      className="w-full bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-foreground mb-3">{job.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {job.location}
                            </span>
                            <span className="px-2 py-1 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 text-xs font-medium rounded">
                              {job.type}
                            </span>
                            {(job.salary.min || job.salary.max) && (
                              <span className="flex items-center gap-1 font-semibold text-green-700">
                                <DollarSign className="w-4 h-4" />
                                {formatSalaryRange(job.salary)}
                              </span>
                            )}
                            {(job.applicants ?? 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {job.applicants} applicants
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No open positions at the moment</p>
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <GuildActivityFeed activities={guild.recentActivity || []} />
          )}

          {/* Leaderboard Tab */}
          {activeTab === "leaderboard" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">Guild Leaderboard</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Top {leaderboard.length} Experts</span>
                </div>
              </div>

              {leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <button
                      key={entry.memberId}
                      onClick={() => {
                        // Route to expert profile if expert, otherwise don't navigate (candidates don't have public profiles yet)
                        if (entry.role !== 'candidate' && entry.walletAddress) {
                          router.push(`/experts/${entry.walletAddress}`);
                        }
                      }}
                      className={`w-full bg-card border rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all text-left ${
                        entry.role !== 'candidate' && entry.walletAddress ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        index < 3 ? "border-2 border-amber-500/30 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20" : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank Badge */}
                        <div className="flex-shrink-0">
                          {index === 0 ? (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                              <Trophy className="w-7 h-7 text-white" />
                            </div>
                          ) : index === 1 ? (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg">
                              <Trophy className="w-7 h-7 text-white" />
                            </div>
                          ) : index === 2 ? (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-700 to-amber-800 flex items-center justify-center shadow-lg">
                              <Trophy className="w-7 h-7 text-white" />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                              <span className="text-xl font-bold text-foreground">#{entry.rank}</span>
                            </div>
                          )}
                        </div>

                        {/* Member Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg text-foreground">{entry.fullName}</h3>
                            <span
                              className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${getRoleBadgeColor(
                                entry.role
                              )}`}
                            >
                              {entry.role.toUpperCase()}
                            </span>
                            {entry.trend && (
                              <div className="flex items-center gap-1">
                                {entry.trend === "up" ? (
                                  <TrendingUp className="w-4 h-4 text-green-600" />
                                ) : entry.trend === "down" ? (
                                  <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                                ) : null}
                                {entry.previousRank && (
                                  <span className="text-xs text-muted-foreground">
                                    {entry.previousRank > entry.rank
                                      ? `+${entry.previousRank - entry.rank}`
                                      : entry.previousRank < entry.rank
                                      ? `-${entry.rank - entry.previousRank}`
                                      : "—"}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-amber-500 fill-current" />
                              <div>
                                <p className="text-sm font-bold text-foreground">{entry.reputation}</p>
                                <p className="text-xs text-muted-foreground">Reputation</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-primary" />
                              <div>
                                <p className="text-sm font-bold text-foreground">{entry.contributionScore}</p>
                                <p className="text-xs text-muted-foreground">Earnings</p>
                              </div>
                            </div>
                            {entry.totalReviews !== undefined && (
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <div>
                                  <p className="text-sm font-bold text-foreground">{entry.totalReviews}</p>
                                  <p className="text-xs text-muted-foreground">Reviews</p>
                                </div>
                              </div>
                            )}
                            {entry.successRate !== undefined && (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <div>
                                  <p className="text-sm font-bold text-foreground">{entry.successRate}%</p>
                                  <p className="text-xs text-muted-foreground">Success Rate</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Reputation Change Badge */}
                          {entry.reputationChange && (
                            <div className="mt-2">
                              <span
                                className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                                  entry.reputationChange.startsWith("+")
                                    ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                                    : entry.reputationChange.startsWith("-")
                                    ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                }`}
                              >
                                {entry.reputationChange} this month
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Trophy className="w-20 h-20 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-lg text-muted-foreground mb-2">No leaderboard data available</p>
                  <p className="text-sm text-muted-foreground">
                    Rankings will appear as members earn reputation
                  </p>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
