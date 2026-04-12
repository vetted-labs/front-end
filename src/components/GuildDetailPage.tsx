"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { toast } from "sonner";
import { CheckCircle2, Clock } from "lucide-react";
import { Alert } from "@/components/ui";
import { guildsApi, guildApplicationsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { useAuthContext } from "@/hooks/useAuthContext";
import { PillTabs } from "@/components/ui/pill-tabs";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { GuildHeader } from "@/components/guild/GuildHeader";
import { GuildFeedTab } from "@/components/guild/GuildFeedTab";
import { GuildActivityFeed } from "@/components/guild/GuildActivityTab";
import { GuildMembersTab } from "@/components/guild/GuildMembersTab";
import { GuildJobsTab } from "@/components/guild/GuildJobsTab";
import { GuildLeaderboardTab } from "@/components/guild/GuildLeaderboardTab";
import { GuildDetailSkeleton } from "@/components/ui/page-skeleton";
import { transformLeaderboardData } from "@/lib/guildDetailHelpers";
import type { GuildPageDetail, GuildLeaderboardEntry, GuildMembershipCheck, GuildApplication, Job, ExpertMember, CandidateMember, ExpertRole, CandidateGuildApplication, GuildActivity, LeaderboardExpert, LeaderboardEntry } from "@/types";

type PublicTab = "feed" | "jobs" | "activity" | "members" | "leaderboard";

export default function GuildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useExpertAccount();
  const auth = useAuthContext();
  const guildId = decodeURIComponent(params.guildId as string);

  const [activeTab, setActiveTab] = useState<PublicTab>("feed");
  const [leaderboardData, setLeaderboardData] = useState<{
    topExperts: LeaderboardExpert[]; currentUser: LeaderboardExpert | null;
  }>({ topExperts: [], currentUser: null });
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"all" | "month" | "week">("all");
  const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);

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

      // Prefer the actual array lengths over raw counts — backend sometimes returns 0 even
      // when the members array is populated (VET-63).
      const resolvedExpertCount = experts.length || raw.expertCount || 0;
      const resolvedCandidateCount = candidates.length || raw.candidateCount || 0;

      const guild: GuildPageDetail = {
        ...raw,
        experts, candidates, recentJobs, recentActivity,
        expertCount: resolvedExpertCount,
        candidateCount: resolvedCandidateCount,
        totalMembers:
          raw.totalMembers ||
          raw.memberCount ||
          resolvedExpertCount + resolvedCandidateCount,
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

  // eslint-disable-next-line no-restricted-syntax -- lazy-load leaderboard when tab becomes active
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const entries = await guildsApi.getLeaderboard(guildId, { limit: 100 });
        const filtered = (entries || []).filter((e: GuildLeaderboardEntry) => e.role !== "candidate");
        const transformed = transformLeaderboardData(
          filtered as unknown as LeaderboardEntry[],
          address || "",
          { expertRole: "recruit", reputation: 0, totalEndorsementEarnings: 0 }
        );
        setLeaderboardData(transformed);
        setLeaderboardLoaded(true);
      } catch {
        setLeaderboardData({ topExperts: [], currentUser: null });
      }
    };
    if (activeTab === "leaderboard" && !leaderboardLoaded) {
      fetchLeaderboard();
    }
  }, [activeTab, guildId, leaderboardLoaded, address]);

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

  const isMember = membership?.isMember ?? false;
  const isPending = membership?.status === "pending";

  return (
    <div className="relative min-h-screen text-foreground overflow-x-hidden">
      {/* Ambient background — same as expert view */}
      <div className="pointer-events-none absolute inset-0">
        <div className="profile-ambient-orb profile-ambient-orb-1" />
        <div className="profile-ambient-orb profile-ambient-orb-2" />
        <div className="profile-dot-grid" />
      </div>

      <div className="relative z-10">
        {/* Breadcrumb */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Breadcrumb items={[
            { label: "Guilds", href: "/guilds" },
            { label: guild.name },
          ]} />
        </div>

        {/* Guild Header — same bento grid, but without position/staking cards */}
        <GuildHeader
          guild={{
            name: guild.name,
            memberCount: guild.totalMembers || (guild.expertCount + guild.candidateCount),
            expertRole: membership?.role || "recruit",
            reputation: 0,
            description: guild.description,
            totalProposalsReviewed: guild.totalProposalsReviewed,
            averageApprovalTime: guild.averageApprovalTime,
            candidateCount: guild.candidateCount,
            openPositions: guild.openPositions,
            totalVetdStaked: (guild as unknown as { totalVetdStaked?: number }).totalVetdStaked,
          }}
          isMember={false}
        />

        {/* Join / Member status bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="flex items-center gap-3">
            {isMember && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-positive/10 border border-positive/20 text-sm font-medium text-positive">
                <CheckCircle2 className="w-4 h-4" />
                Member
                {membership?.role && (
                  <>
                    <span className="opacity-40 mx-1">·</span>
                    <span className="text-primary capitalize">{membership.role}</span>
                  </>
                )}
              </div>
            )}
            {isPending && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-warning/[0.08] border border-warning/20 text-sm font-medium text-warning">
                <Clock className="w-4 h-4" />
                Pending Review
              </div>
            )}
            {!isMember && !isPending && (
              <button
                onClick={handleApplyToGuild}
                className="inline-flex items-center gap-3 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-colors bg-primary hover:bg-primary/90"
              >
                Join Guild
              </button>
            )}
            {isMember && auth.userType === "expert" && (
              <button
                onClick={() => router.push(`/expert/guild/${guildId}`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted/20 border border-border text-sm font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
              >
                Expert Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-card p-4 text-center">
              <div className="text-lg font-bold">{guild.totalMembers || (guild.expertCount + guild.candidateCount) || 0}</div>
              <div className="text-xs text-muted-foreground">Expert Members</div>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <div className="text-lg font-bold">{guild.totalProposalsReviewed || 0}</div>
              <div className="text-xs text-muted-foreground">Reviews Completed</div>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <div className="text-lg font-bold">{guild.openPositions || guild.recentJobs?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Active Jobs</div>
            </div>
          </div>
        </div>

        {/* Tabs + content — same structure as expert view */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="sticky top-0 z-20 bg-background/85 border-b border-border -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-6">
            <PillTabs
              tabs={[
                { value: "feed" as const, label: "Feed" },
                { value: "jobs" as const, label: "Jobs" },
                { value: "activity" as const, label: "Activity" },
                { value: "members" as const, label: "Members" },
                { value: "leaderboard" as const, label: "Leaderboard" },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          <div role="tabpanel">
            {activeTab === "feed" && (
              <GuildFeedTab
                guildId={guildId}
                isMember={isMember}
                membershipRole={membership?.role as ExpertRole | undefined}
                userType={auth.userType}
              />
            )}
            {activeTab === "activity" && <GuildActivityFeed activities={guild.recentActivity || []} />}
            {activeTab === "members" && (
              <GuildMembersTab
                experts={guild.experts || []}
                candidates={guild.candidates || []}
                expertsCount={guild.expertCount}
                candidatesCount={guild.candidateCount}
              />
            )}
            {activeTab === "jobs" && (
              <GuildJobsTab
                jobs={guild.recentJobs || []}
                jobsCount={guild.openPositions || guild.recentJobs?.length || 0}
                guildId={guildId}
                guildName={guild.name}
              />
            )}
            {activeTab === "leaderboard" && (
              <GuildLeaderboardTab
                leaderboardData={leaderboardData}
                leaderboardPeriod={leaderboardPeriod}
                onPeriodChange={setLeaderboardPeriod}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
