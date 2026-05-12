"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { toast } from "sonner";
import { Alert } from "@/components/ui";
import { guildsApi, guildApplicationsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { GuildDetailSkeleton } from "@/components/ui/page-skeleton";
import { transformLeaderboardData } from "@/lib/guildDetailHelpers";
import { GuildPublicHero } from "@/components/guild/public/GuildPublicHero";
import { GuildPublicTabs } from "@/components/guild/public/GuildPublicTabs";
import { GuildPublicFeedTab } from "@/components/guild/public/GuildPublicFeedTab";
import { GuildPublicJobsTab } from "@/components/guild/public/GuildPublicJobsTab";
import { GuildPublicActivityTab } from "@/components/guild/public/GuildPublicActivityTab";
import { GuildPublicMembersTab } from "@/components/guild/public/GuildPublicMembersTab";
import { GuildPublicLeaderboardTab } from "@/components/guild/public/GuildPublicLeaderboardTab";
import { formatVetd } from "@/lib/utils";
import type {
  GuildPageDetail,
  GuildLeaderboardEntry,
  GuildMembershipCheck,
  GuildApplication,
  Job,
  ExpertMember,
  CandidateMember,
  ExpertRole,
  CandidateGuildApplication,
  GuildActivity,
  LeaderboardExpert,
  LeaderboardEntry,
} from "@/types";

type PublicTab = "feed" | "jobs" | "activity" | "members" | "leaderboard";

export default function GuildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useExpertAccount();
  const auth = useAuthContext();
  const guildId = decodeURIComponent(params.guildId as string);

  const [activeTab, setActiveTab] = useState<PublicTab>("feed");
  const [leaderboardData, setLeaderboardData] = useState<{
    topExperts: LeaderboardExpert[];
    currentUser: LeaderboardExpert | null;
  }>({ topExperts: [], currentUser: null });
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"all" | "month" | "week">("all");
  const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);

  const isAuthenticated = auth.isAuthenticated || isConnected;

  const { data: guildData, isLoading, error } = useFetch<{
    guild: GuildPageDetail;
    membership: GuildMembershipCheck;
  }>(
    async () => {
      const raw = await guildsApi.getPublicDetail(guildId);
      const experts: ExpertMember[] = Array.isArray(raw.experts) ? raw.experts : [];
      const candidates: CandidateMember[] = Array.isArray(raw.candidates)
        ? raw.candidates
        : [];
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
        candidateApps.forEach((app) => {
          const ts = app.submittedAt;
          if (!ts) return;
          const statusLabel =
            app.status === "approved"
              ? "approved"
              : app.status === "rejected"
                ? "rejected"
                : "pending review";
          derived.push({
            id: `cand-app-${app.id}`,
            type: "application_submitted",
            actor: app.candidateName || "A candidate",
            details: `applied to join${app.jobTitle ? ` for ${app.jobTitle}` : ""} · ${statusLabel}`,
            timestamp: ts,
          });
        });
        guildProposals.forEach((p) => {
          const ts = p.created_at;
          if (!ts) return;
          if (
            candidateApps.some(
              (a) => a.candidateEmail === p.candidate_email && a.id !== p.id,
            )
          )
            return;
          const statusLabel =
            p.status === "approved"
              ? "approved"
              : p.status === "rejected"
                ? "rejected"
                : "pending review";
          derived.push({
            id: `proposal-${p.id}`,
            type: "application_submitted",
            actor: p.candidate_name || "A member",
            details: `submitted an application · ${statusLabel}`,
            timestamp: ts,
          });
        });
        derived.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        recentActivity = derived.slice(0, 50);
      }

      const resolvedExpertCount = experts.length || raw.expertCount || 0;
      const resolvedCandidateCount = candidates.length || raw.candidateCount || 0;

      const guild: GuildPageDetail = {
        ...raw,
        experts,
        candidates,
        recentJobs,
        recentActivity,
        expertCount: resolvedExpertCount,
        candidateCount: resolvedCandidateCount,
        totalMembers:
          raw.totalMembers ||
          raw.memberCount ||
          resolvedExpertCount + resolvedCandidateCount,
        openPositions: raw.openPositions ?? recentJobs.length,
        totalProposalsReviewed:
          raw.totalProposalsReviewed ?? raw.statistics?.vettedProposals ?? 0,
        averageApprovalTime: raw.averageApprovalTime ?? "—",
        establishedDate: raw.establishedDate ?? raw.createdAt ?? "",
      };

      let membershipResult: GuildMembershipCheck = { isMember: false };
      const userId = auth.userId || address;
      if (userId) {
        try {
          const membershipData = await guildsApi.checkMembership(userId, guildId);
          membershipResult = {
            isMember: membershipData.isMember,
            role: membershipData.role as ExpertRole | undefined,
          };
        } catch {
          membershipResult = { isMember: false };
        }
      }

      return { guild, membership: membershipResult };
    },
    {
      onError: () => {
        toast.error("Failed to load guild details");
      },
    },
  );

  const guild = guildData?.guild ?? null;
  const membership = guildData?.membership ?? null;

  // eslint-disable-next-line no-restricted-syntax -- lazy-load leaderboard when tab becomes active
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const entries = await guildsApi.getLeaderboard(guildId, { limit: 100 });
        const filtered = (entries || []).filter(
          (e: GuildLeaderboardEntry) => e.role !== "candidate",
        );
        const transformed = transformLeaderboardData(
          filtered as unknown as LeaderboardEntry[],
          address || "",
          { expertRole: "recruit", reputation: 0, totalEndorsementEarnings: 0 },
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
    if (auth.userType === "expert") {
      router.push(`/expert/apply?guild=${encodeURIComponent(guildId)}`);
      return;
    }
    router.push(`/guilds/${guildId}/apply`);
  };

  const handleShare = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
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

  // Pull derived/fallback stats so the strip always renders something useful.
  const totalMembers =
    guild.totalMembers || guild.expertCount + guild.candidateCount || 0;
  const reviewsTotal = guild.totalProposalsReviewed || 0;
  const stakedDisplay = guild.totalVetdStaked
    ? formatVetd(Number(guild.totalVetdStaked))
    : "—";
  // Consensus rate is not yet exposed by the backend at this surface — show
  // an em-dash so we don't display a fabricated number. Hook up once Phase 5
  // adds it to the public guild detail payload.
  const consensusPctDisplay: number | string = "—";
  const openRoles = guild.openPositions || guild.recentJobs?.length || 0;

  return (
    <div className="relative min-h-screen text-foreground overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="profile-ambient-orb profile-ambient-orb-1" />
        <div className="profile-ambient-orb profile-ambient-orb-2" />
        <div className="profile-dot-grid" />
      </div>

      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Breadcrumb
            items={[{ label: "Guilds", href: "/guilds" }, { label: guild.name }]}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <GuildPublicHero
            guildName={guild.name}
            description={guild.description}
            members={totalMembers}
            reviews={reviewsTotal}
            staked={stakedDisplay}
            consensusPct={consensusPctDisplay}
            openRoles={openRoles}
            membersDelta={guild.expertCount > 0 ? `${guild.expertCount} experts` : undefined}
            // We don't yet have a "this period" diff for reviews. Hide the
            // delta rather than fabricate one. Add a real value when the
            // statistics payload exposes a windowed count.
            reviewsDelta={undefined}
            stakedDelta="VETD across guild"
            consensusDelta={undefined}
            openRolesDelta={undefined}
            isMember={isMember}
            isPending={isPending}
            memberRole={membership?.role}
            onJoin={handleApplyToGuild}
            onShare={handleShare}
            extraAction={
              isMember && auth.userType === "expert" ? (
                <button
                  onClick={() => router.push(`/expert/guild/${guildId}`)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-surface-border bg-surface-2 text-xs font-medium text-foreground hover:bg-surface-3 transition-colors"
                >
                  Open expert dashboard
                </button>
              ) : null
            }
          />

          <GuildPublicTabs<PublicTab>
            tabs={[
              { value: "feed", label: "Feed" },
              { value: "jobs", label: "Jobs", count: openRoles },
              { value: "activity", label: "Activity" },
              { value: "members", label: "Members", count: guild.expertCount },
              { value: "leaderboard", label: "Leaderboard" },
            ]}
            active={activeTab}
            onChange={setActiveTab}
            meta={<span>Updated just now</span>}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          {activeTab === "feed" && (
            <GuildPublicFeedTab
              guildId={guildId}
              guildName={guild.name}
              guildDescription={guild.description}
              experts={guild.experts || []}
              isMember={isMember}
              membershipRole={membership?.role as ExpertRole | undefined}
              userType={auth.userType}
              onJoinClick={handleApplyToGuild}
            />
          )}
          {activeTab === "jobs" && (
            <GuildPublicJobsTab
              jobs={guild.recentJobs || []}
              guildName={guild.name}
              jobsCount={openRoles}
            />
          )}
          {activeTab === "activity" && (
            <GuildPublicActivityTab
              activities={guild.recentActivity || []}
              guildName={guild.name}
              experts={guild.experts || []}
            />
          )}
          {activeTab === "members" && (
            <GuildPublicMembersTab
              experts={guild.experts || []}
              expertsCount={guild.expertCount}
            />
          )}
          {activeTab === "leaderboard" && (
            <GuildPublicLeaderboardTab
              leaderboardData={leaderboardData}
              range={leaderboardPeriod}
              onRangeChange={setLeaderboardPeriod}
            />
          )}
        </div>
      </div>
    </div>
  );
}
