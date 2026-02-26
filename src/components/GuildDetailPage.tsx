"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import {
  Users,
  Briefcase,
  Award,
  CheckCircle2,
  Clock,
  MapPin,
  DollarSign,
  Target,
  Trophy,
  Zap,
  Calendar,
  LayoutDashboard,
  Coins,
} from "lucide-react";
import { Alert, Button, PillTabs } from "@/components/ui";
import { guildsApi, guildApplicationsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { getGuildIcon, getGuildColor, getGuildBgColor } from "@/lib/guildHelpers";
import { formatSalaryRange } from "@/lib/utils";
import { useAuthContext } from "@/hooks/useAuthContext";
import { GuildActivityFeed } from "@/components/guild/GuildActivityTab";
import type { GuildActivity } from "@/components/guild/GuildActivityTab";
import { GuildFeedTab } from "@/components/guild/GuildFeedTab";
import { GuildPublicOverviewTab } from "@/components/guild/GuildPublicOverviewTab";
import { GuildExpertsListTab } from "@/components/guild/GuildExpertsListTab";
import { GuildCandidatesListTab } from "@/components/guild/GuildCandidatesListTab";
import { GuildLeaderboardContent } from "@/components/guild/GuildLeaderboardContent";
import type { GuildPublicDetail, GuildLeaderboardEntry, GuildApplicationSummary, GuildApplication, Job, ExpertMember, CandidateMember, ExpertRole } from "@/types";


/** Extended guild detail with resolved members, jobs, and activity for the page. */
interface GuildDetail extends GuildPublicDetail {
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
  role?: ExpertRole;
}

type LeaderboardEntry = GuildLeaderboardEntry;



export default function GuildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const auth = useAuthContext();
  const guildId = decodeURIComponent(params.guildId as string);

  const [activeTab, setActiveTab] = useState<"feed" | "overview" | "experts" | "candidates" | "jobs" | "activity" | "leaderboard">("feed");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const isAuthenticated = auth.isAuthenticated || isConnected;

  const { data: guildData, isLoading, error } = useFetch<{ guild: GuildDetail; membership: MembershipStatus }>(
    async () => {
      // Fetch public guild details
      const raw = await guildsApi.getPublicDetail(guildId);
      const experts: ExpertMember[] = Array.isArray(raw.experts) ? raw.experts : [];
      const candidates: CandidateMember[] = Array.isArray(raw.candidates) ? raw.candidates : [];
      const recentJobs: Job[] = Array.isArray(raw.recentJobs) ? raw.recentJobs : [];
      let recentActivity: GuildActivity[] = Array.isArray(raw.recentActivity)
        ? (raw.recentActivity as GuildActivity[])
        : [];

      // Fetch guild applications (candidate + expert proposals) for activity
      let candidateApps: GuildApplicationSummary[] = [];
      let guildProposals: GuildApplication[] = [];
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
        candidateApps.forEach((app) => {
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
        guildProposals.forEach((p) => {
          const ts = p.created_at;
          if (!ts) return;
          // Skip if we already have this person as a candidate app
          if (candidateApps.some((a) => a.candidateEmail === p.candidate_email && a.id !== p.id)) return;
          const statusLabel = p.status === "approved" ? "approved" : p.status === "rejected" ? "rejected" : "pending review";
          derived.push({
            id: `proposal-${p.id}`,
            type: "application_submitted",
            actor: p.candidate_name || "A member",
            details: `submitted an application · ${statusLabel}`,
            timestamp: ts,
          });
        });
        derived.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        recentActivity = derived.slice(0, 50);
      }

      const guild: GuildDetail = {
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

      // If authenticated, check membership status
      let membershipResult: MembershipStatus = { isMember: false };
      const userId = auth.userId || address;
      if (userId) {
        try {
          const membershipData = await guildsApi.checkMembership(userId, guildId);
          membershipResult = {
            isMember: membershipData.isMember,
            role: membershipData.role as ExpertRole | undefined,
          };
        } catch {
          // Not a member - that's okay
          membershipResult = { isMember: false };
        }
      }

      return { guild, membership: membershipResult };
    },
    {
      onError: () => {
        toast.error("Failed to load guild details");
      },
    }
  );

  const guild = guildData?.guild ?? null;
  const membership = guildData?.membership ?? null;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const entries = await guildsApi.getLeaderboard(guildId, { limit: 100 });
        setLeaderboard((entries || []).filter((e) => e.role !== "candidate"));
      } catch {
        setLeaderboard([]);
      }
    };
    if (activeTab === "leaderboard" && leaderboard.length === 0) {
      fetchLeaderboard();
    }
  }, [activeTab, guildId, leaderboard.length]);

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
    <div className="relative min-h-screen bg-gradient-to-b from-background via-background to-muted overflow-x-hidden animate-page-enter">
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
                  {guild.totalVetdStaked != null
                    ? Number(guild.totalVetdStaked).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : guild.statistics?.totalVetdStaked != null
                    ? Number(guild.statistics.totalVetdStaked).toLocaleString(undefined, { maximumFractionDigits: 0 })
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
              { value: "feed" as const, label: "Feed" },
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
          {/* Feed Tab */}
          {activeTab === "feed" && (
            <GuildFeedTab
              guildId={guildId}
              isMember={membership?.isMember ?? false}
              membershipRole={membership?.role}
              userType={auth.userType}
            />
          )}

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <GuildPublicOverviewTab
              guild={guild}
              isMember={!!showMemberBadge}
              isPending={!!showPendingStatus}
              onNavigate={(path) => router.push(path)}
              onTabChange={(tab) => setActiveTab(tab as typeof activeTab)}
              onApply={handleApplyToGuild}
            />
          )}

          {/* Experts Tab */}
          {activeTab === "experts" && (
            <GuildExpertsListTab
              experts={guild.experts || []}
              onNavigate={(path) => router.push(path)}
            />
          )}

          {/* Candidates Tab */}
          {activeTab === "candidates" && (
            <GuildCandidatesListTab candidates={guild.candidates || []} />
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
            <GuildLeaderboardContent
              leaderboard={leaderboard}
              onNavigate={(path) => router.push(path)}
            />
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
