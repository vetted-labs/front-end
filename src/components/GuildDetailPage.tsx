"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { toast } from "sonner";
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  LayoutDashboard,
} from "lucide-react";
import { Alert } from "@/components/ui";
import { guildsApi, guildApplicationsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { getGuildIcon } from "@/lib/guildHelpers";
import { formatSalaryRange } from "@/lib/utils";
import { useAuthContext } from "@/hooks/useAuthContext";
import { GuildActivityFeed } from "@/components/guild/GuildActivityTab";
import { GuildPublicOverviewTab } from "@/components/guild/GuildPublicOverviewTab";
import { GuildExpertsListTab } from "@/components/guild/GuildExpertsListTab";
import { GuildCandidatesListTab } from "@/components/guild/GuildCandidatesListTab";
import { GuildLeaderboardContent } from "@/components/guild/GuildLeaderboardContent";
import { getGuildDetailAccent } from "@/config/colors";
import { GuildDetailSkeleton } from "@/components/ui/page-skeleton";
import type { GuildPageDetail, GuildLeaderboardEntry, GuildMembershipCheck, GuildApplication, Job, ExpertMember, CandidateMember, ExpertRole, CandidateGuildApplication, GuildActivity } from "@/types";



export default function GuildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useExpertAccount();
  const auth = useAuthContext();
  const guildId = decodeURIComponent(params.guildId as string);

  const [activeTab, setActiveTab] = useState<"feed" | "overview" | "experts" | "candidates" | "jobs" | "activity" | "leaderboard">("feed");
  const [leaderboard, setLeaderboard] = useState<GuildLeaderboardEntry[]>([]);

  const isAuthenticated = auth.isAuthenticated || isConnected;

  const { data: guildData, isLoading, error } = useFetch<{ guild: GuildPageDetail; membership: GuildMembershipCheck }>(
    async () => {
      const raw = await guildsApi.getPublicDetail(guildId);
      const experts: ExpertMember[] = Array.isArray(raw.experts) ? raw.experts : [];
      const candidates: CandidateMember[] = Array.isArray(raw.candidates) ? raw.candidates : [];
      const recentJobs: Job[] = Array.isArray(raw.recentJobs) ? raw.recentJobs : [];
      let recentActivity: GuildActivity[] = Array.isArray(raw.recentActivity)
        ? (raw.recentActivity as GuildActivity[])
        : [];

      let candidateApps: CandidateGuildApplication[] = [];
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
        // Non-critical
      }

      if (recentActivity.length === 0) {
        const derived: GuildActivity[] = [];
        experts.forEach((e) => {
          if (e.joinedAt) {
            derived.push({ id: `expert-join-${e.id}`, type: "expert_joined", actor: e.fullName, details: `joined as ${e.role || "expert"}`, timestamp: e.joinedAt });
          }
        });
        candidates.forEach((c) => {
          if (c.joinedAt) {
            derived.push({ id: `candidate-join-${c.id}`, type: "candidate_joined", actor: c.fullName, details: "joined as a candidate member", timestamp: c.joinedAt });
          }
        });
        recentJobs.forEach((j) => {
          if (j.createdAt) {
            derived.push({ id: `job-posted-${j.id}`, type: "job_posted", actor: j.title, details: `new position opened · ${j.location || "Remote"} · ${j.type || "Full-time"}`, timestamp: j.createdAt });
          }
        });
        candidateApps.forEach((app) => {
          const ts = app.submittedAt;
          if (!ts) return;
          const statusLabel = app.status === "approved" ? "approved" : app.status === "rejected" ? "rejected" : "pending review";
          derived.push({ id: `cand-app-${app.id}`, type: "application_submitted", actor: app.candidateName || "A candidate", details: `applied to join${app.jobTitle ? ` for ${app.jobTitle}` : ""} · ${statusLabel}`, timestamp: ts });
        });
        guildProposals.forEach((p) => {
          const ts = p.created_at;
          if (!ts) return;
          if (candidateApps.some((a) => a.candidateEmail === p.candidate_email && a.id !== p.id)) return;
          const statusLabel = p.status === "approved" ? "approved" : p.status === "rejected" ? "rejected" : "pending review";
          derived.push({ id: `proposal-${p.id}`, type: "application_submitted", actor: p.candidate_name || "A member", details: `submitted an application · ${statusLabel}`, timestamp: ts });
        });
        derived.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        recentActivity = derived.slice(0, 50);
      }

      const guild: GuildPageDetail = {
        ...raw,
        experts, candidates, recentJobs, recentActivity,
        expertCount: raw.expertCount ?? experts.length,
        candidateCount: raw.candidateCount ?? candidates.length,
        totalMembers: raw.totalMembers ?? raw.memberCount ?? 0,
        openPositions: raw.openPositions ?? recentJobs.length,
        totalProposalsReviewed: raw.totalProposalsReviewed ?? raw.statistics?.vettedProposals ?? 0,
        averageApprovalTime: raw.averageApprovalTime ?? "—",
        establishedDate: raw.establishedDate ?? raw.createdAt ?? "",
      };

      let membershipResult: GuildMembershipCheck = { isMember: false };
      const userId = auth.userId || address;
      if (userId) {
        try {
          const membershipData = await guildsApi.checkMembership(userId, guildId);
          membershipResult = { isMember: membershipData.isMember, role: membershipData.role as ExpertRole | undefined };
        } catch {
          membershipResult = { isMember: false };
        }
      }

      return { guild, membership: membershipResult };
    },
    {
      onError: () => { toast.error("Failed to load guild details"); },
    }
  );

  const guild = guildData?.guild ?? null;
  const membership = guildData?.membership ?? null;

  // eslint-disable-next-line no-restricted-syntax -- fetch leaderboard on tab switch
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
    if (isConnected) {
      router.push(`/expert/apply?guild=${encodeURIComponent(guildId)}`);
      return;
    }
    router.push(`/guilds/${guildId}/apply`);
  };

  if (isLoading) return <GuildDetailSkeleton />;

  if (error || !guild) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="error">{error || "Guild not found"}</Alert>
      </div>
    );
  }

  const showApplyButton = !membership?.isMember && membership?.status !== "pending";
  const showPendingStatus = membership?.status === "pending";
  const showMemberBadge = membership?.isMember;
  const GuildIcon = getGuildIcon(guild.name);

  const guildAccent = getGuildDetailAccent(guild.name);
  const totalMembers = guild.totalMembers || (guild.expertCount + guild.candidateCount);

  return (
    <div
      className="guild-detail-page relative min-h-screen overflow-x-hidden"
      data-guild={guildAccent}
    >
      {/* Page content */}
      <div className="relative">

        {/* ═══ HERO ═══ */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground/50 mb-8">
            <button onClick={() => router.push("/guilds")} className="hover:text-muted-foreground transition-colors">
              Guilds
            </button>
            <span>/</span>
            <span className="text-[hsl(var(--gd))] font-medium">{guild.name.replace(/ Guild$/i, "")}</span>
          </div>

          <div className="flex items-start gap-6 mb-6">
            {/* Guild icon */}
            <div className="w-16 h-16 rounded-xl bg-[hsl(var(--gd)/0.08)] border border-[hsl(var(--gd)/0.2)] flex items-center justify-center flex-shrink-0">
              <GuildIcon className="w-8 h-8 text-[hsl(var(--gd))]" />
            </div>

            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-1.5">
                {guild.name}
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                {guild.description}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 mb-6 flex-wrap">
            <div>
              <p className="text-xl font-bold text-foreground tabular-nums">{totalMembers}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground tabular-nums">{guild.openPositions}</p>
              <p className="text-xs text-muted-foreground">Open Jobs</p>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground tabular-nums">{guild.totalProposalsReviewed || 0}</p>
              <p className="text-xs text-muted-foreground">Reviews</p>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground tabular-nums">{guild.expertCount}</p>
              <p className="text-xs text-muted-foreground">Experts</p>
            </div>
          </div>

          {/* Member badge / Apply / Pending */}
          <div className="flex items-center gap-3">
            {showMemberBadge && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-positive/10 border border-positive/20 text-sm font-medium text-positive">
                <CheckCircle2 className="w-4 h-4" />
                Member
                {membership.role && (
                  <>
                    <span className="opacity-40 mx-1">·</span>
                    <span className={membership.role === "master" ? "text-warning" : "text-[hsl(var(--gd))]"}>
                      {membership.role}
                    </span>
                  </>
                )}
              </div>
            )}
            {showPendingStatus && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-warning/[0.08] border border-warning/20 text-sm font-medium text-warning">
                <Clock className="w-4 h-4" />
                Pending Review
              </div>
            )}
            {showApplyButton && (
              <button
                onClick={handleApplyToGuild}
                className="inline-flex items-center gap-3 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-colors bg-[hsl(var(--gd))] hover:bg-[hsl(var(--gd)/0.9)]"
              >
                Join Guild
              </button>
            )}
            {membership?.isMember && auth.userType === "expert" && (
              <button
                onClick={() => router.push(`/expert/guild/${guildId}`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted/20 border border-border text-sm font-medium text-muted-foreground hover:border-[hsl(var(--gd)/0.3)] hover:text-foreground transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Expert Dashboard
              </button>
            )}
          </div>
        </div>

        {/* ═══ TAB BAR — Glassmorphic ═══ */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 p-1.5 bg-card border border-border rounded-xl mb-10 overflow-x-auto scrollbar-none">
            {(
              [
                { value: "feed" as const, label: "Overview" },
                { value: "leaderboard" as const, label: "Leaderboard" },
                { value: "experts" as const, label: "Members" },
                { value: "jobs" as const, label: "Jobs" },
                { value: "activity" as const, label: "Activity" },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                  activeTab === value
                    ? "text-[hsl(var(--gd))] bg-[hsl(var(--gd)/0.08)] border-[hsl(var(--gd)/0.15)] font-semibold"
                    : "text-muted-foreground/50 border-transparent hover:text-muted-foreground hover:bg-muted/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ═══ TAB CONTENT ═══ */}
          <div className="pb-16" role="tabpanel">
            {activeTab === "feed" && (
              <>
                {/* Overview tab replaces the old feed + overview combo */}
                <GuildPublicOverviewTab
                  guild={guild}
                  isMember={!!showMemberBadge}
                  isPending={!!showPendingStatus}
                  onNavigate={(path) => router.push(path)}
                  onTabChange={(tab) => setActiveTab(tab as typeof activeTab)}
                  onApply={handleApplyToGuild}
                />
              </>
            )}

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

            {activeTab === "experts" && (
              <>
                {/* Show experts + candidates in a combined members view */}
                <GuildExpertsListTab
                  experts={guild.experts || []}
                  onNavigate={(path) => router.push(path)}
                />
                {(guild.candidates?.length ?? 0) > 0 && (
                  <div className="mt-8">
                    <GuildCandidatesListTab candidates={guild.candidates || []} />
                  </div>
                )}
              </>
            )}

            {activeTab === "candidates" && (
              <GuildCandidatesListTab candidates={guild.candidates || []} />
            )}

            {activeTab === "jobs" && (
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-foreground mb-5 flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-[hsl(var(--gd))]" />
                  Open Positions
                </h2>
                {guild.recentJobs && guild.recentJobs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {guild.recentJobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => router.push(`/browse/jobs/${job.id}`)}
                        className="bg-muted/20 border border-border rounded-xl p-6 text-left transition-all hover:border-[hsl(var(--gd)/0.2)] hover:translate-y-[-2px]"
                      >
                        <h3 className="font-display text-base font-bold text-foreground mb-2 tracking-tight">
                          {job.title}
                        </h3>
                        {(job.salary.min || job.salary.max) && (
                          <p className="font-mono text-sm font-medium text-positive mb-3.5">
                            {formatSalaryRange(job.salary)}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {job.location && (
                            <span className="px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground bg-muted/30 border border-border">
                              {job.location}
                            </span>
                          )}
                          {job.type && (
                            <span className="px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground bg-muted/30 border border-border">
                              {job.type}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          {(job.applicants ?? 0) > 0 && (
                            <span className="flex items-center gap-2 text-xs text-muted-foreground/50">
                              <Users className="w-3.5 h-3.5" />
                              {job.applicants} applicants
                            </span>
                          )}
                          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[hsl(var(--gd)/0.08)] border border-[hsl(var(--gd)/0.15)] text-[hsl(var(--gd))] text-xs font-medium">
                            View
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/20 rounded-xl border border-border">
                    <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-60" />
                    <p className="text-muted-foreground">No open positions at the moment</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <GuildActivityFeed activities={guild.recentActivity || []} />
            )}

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
