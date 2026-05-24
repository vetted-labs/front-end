"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings, ExternalLink, Star, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { canLoadGuildWorkspaceData } from "@/lib/guild-workspace-readiness";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { useFetch } from "@/lib/hooks/useFetch";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";
import { fetchAndNormalizeGuildData, transformLeaderboardData } from "@/lib/guildDetailHelpers";
import { STORY_LAB_GUILD } from "@/components/expert/story-lab/storyLabFixtures";
import {
  blockchainApi,
  expertApi,
  extractApiError,
  governanceApi,
  guildApplicationsApi,
  guildFeedApi,
  guildsApi,
} from "@/lib/api";
import { logger } from "@/lib/logger";
import { formatTimeAgo } from "@/lib/utils";
import { getGuildIdentity } from "@/lib/guildIdentity";
import { getGuildIconName } from "@/lib/guildHelpers";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { cn } from "@/lib/utils";
import type {
  ExpertRole,
  GuildApplication,
  GuildDetailData,
  GuildPost,
  GuildStakeInfo,
  GuildWorkspaceKpis,
  GuildWorkspacePeriodStats,
  GuildWorkspaceProposal,
  GuildWorkspaceQueueResponse,
  GuildWorkspaceStakePosition,
  GuildWorkspaceTab,
  GovernanceProposalDetail,
} from "@/types";
import { GUILD_WORKSPACE_TABS } from "@/types";
import { GuildKpiTile } from "./GuildKpiTile";
import { GuildQueueTab } from "./GuildQueueTab";
import { GuildMyReviewsTab } from "./GuildMyReviewsTab";
import { GuildGovernanceTab } from "./GuildGovernanceTab";
import { GuildInternalFeedTab } from "./GuildInternalFeedTab";
import { GuildEarningsTab } from "./GuildEarningsTab";
import { GuildMembersTab } from "./GuildMembersTab";
import { GuildLeaderboardTab } from "./GuildLeaderboardTab";

interface GuildWorkspacePageProps {
  guildId: string;
}

interface KpiBundle {
  kpis: GuildWorkspaceKpis;
  stakePosition: GuildWorkspaceStakePosition;
  periodStats: GuildWorkspacePeriodStats;
}

interface ChatterPreview {
  id: string;
  author: string;
  role?: string;
  timeAgo: string;
  body: string;
}

/**
 * Map the camelCase governance proposal detail to the workspace's normalized
 * proposal shape, scoped to a single guild. Falls back to client-side guild
 * filtering because the global active-proposals endpoint can't filter on
 * server side reliably yet.
 */
function mapGovernanceProposal(
  raw: GovernanceProposalDetail,
): GuildWorkspaceProposal {
  const totalVotes = raw.votes_for + raw.votes_against + raw.votes_abstain;
  const supportPercent = raw.approval_percent != null
    ? raw.approval_percent
    : totalVotes > 0
      ? (raw.votes_for / totalVotes) * 100
      : 0;
  const status: GuildWorkspaceProposal["status"] = raw.finalized
    ? raw.outcome === "passed"
      ? "passed"
      : "rejected"
    : "open";
  return {
    id: raw.id,
    title: raw.title,
    proposerName: raw.proposer_name,
    proposerWallet: raw.proposer_wallet,
    proposedAt: raw.created_at,
    votesCast: raw.voter_count ?? totalVotes,
    totalVoters: raw.quorum_required || totalVotes,
    supportPercent,
    deadline: raw.voting_deadline,
    status,
    hasVoted: raw.has_voted,
    myVote: raw.my_vote as GuildWorkspaceProposal["myVote"] | undefined,
  };
}

/**
 * Build a workspace KPI bundle from the various data sources. Each input is
 * optional — when a source 404s we leave its slice at zero rather than
 * blanking the entire bundle, so the user still sees the data points that
 * did load (stake position from blockchain even when the queue endpoint is
 * down, for example).
 */
function buildKpiBundle(args: {
  guild: GuildDetailData;
  queue?: GuildWorkspaceQueueResponse;
  assigned: GuildApplication[];
  guildStake?: GuildStakeInfo;
  governanceForGuild: GuildWorkspaceProposal[];
  guildEarningsTotalUsd: number;
  guildEarningsCount: number;
}): KpiBundle {
  const {
    guild,
    queue,
    assigned,
    guildStake,
    governanceForGuild,
    guildEarningsTotalUsd,
    guildEarningsCount,
  } = args;

  // Queue counts — derive from full items list when available, else lean on
  // the server-provided KPI numbers.
  const items = queue?.items ?? [];
  const queueCount = items.length || (queue?.kpis?.queueCount ?? 0);
  const queueUrgent = items.filter((i) => i.bucket === "due_soon").length
    || (queue?.kpis?.queueUrgentCount ?? 0);

  // The /assigned endpoint returns minimal shape:
  // { id, candidateName, guildId, guildName, status, createdAt, itemType }
  // We can't tell voting_phase / has_voted / finalized from that, so we rely
  // on the queue endpoint's phase classification (mapped into bucket+phase by
  // the api adapter) and on status === "pending" as a fallback signal.
  const pendingAssigned = assigned.filter((a) => a.status === "pending");
  const commitItems = items.filter((i) => i.phase === "commit");
  const revealItems = items.filter((i) => i.phase === "reveal");
  const reviewItems = items.filter((i) => i.phase === "review");
  // "Active commits" = items the user can act on right now. Candidate reviews
  // are single-shot (phase "review") so they count alongside commit-phase work.
  // Falls back to count of pending assigned applications when the queue
  // endpoint isn't populated.
  const activeCommits = commitItems.length + reviewItems.length || pendingAssigned.length;
  const awaitingReveal = items.filter((i) => i.bucket === "due_soon" && i.phase === "reveal").length;
  const revealOpen = revealItems.length;

  // Blockchain stake — single guild balance returned from
  // blockchainApi.getExpertGuildStakes.
  const totalStake = guildStake ? parseFloat(guildStake.stakedAmount || "0") : 0;
  // The "in review" amount = sum of stake locked on items in the queue's
  // commit/reveal buckets. We don't have per-item stake from /assigned, so
  // we fall back to a flat 25% locked when there are active reviews (matches
  // the protocol's locked-stake heuristic in the dashboard).
  const activeReviewCount = commitItems.length + revealItems.length + reviewItems.length;
  const inReviewVetd = activeReviewCount > 0 ? Math.round(totalStake * 0.25) : 0;
  const availableVetd = Math.max(0, totalStake - inReviewVetd);
  const inReviewPercent = totalStake > 0 ? (inReviewVetd / totalStake) * 100 : 0;

  const reputation = guild.reputation ?? 0;
  const stakeLockedReviewCount = activeReviewCount;

  // Pending payouts — no first-class endpoint yet. Leave at 0 until backend
  // surfaces accrued-but-not-booked rewards.
  const pendingPayouts = 0;

  const kpis: GuildWorkspaceKpis = {
    queueCount,
    queueUrgentCount: queueUrgent,
    activeCommits,
    awaitingReveal,
    revealOpen,
    stakeLockedVetd: totalStake,
    stakeLockedReviewCount,
    pendingPayoutsUsd: queue?.kpis?.pendingPayoutsUsd ?? pendingPayouts ?? 0,
    pendingPayoutReviewCount: queue?.kpis?.pendingPayoutReviewCount ?? 0,
    reputation,
    reputationDelta: queue?.kpis?.reputationDelta ?? 0,
    rank: queue?.kpis?.rank,
    totalMembers: queue?.kpis?.totalMembers ?? guild.memberCount,
  };

  // Prefer client-derived stake position so the totals reflect the actual
  // on-chain balance from blockchainApi.getExpertGuildStakes. The queue
  // endpoint's stakePosition fallback uses 0s.
  const stakePosition: GuildWorkspaceStakePosition = {
    totalStakedVetd: totalStake,
    inReviewVetd,
    availableVetd,
    atRiskVetd: inReviewVetd,
    inReviewPercent,
  };

  const periodStats: GuildWorkspacePeriodStats = queue?.periodStats ?? {
    reviews: guildEarningsCount,
    consensusRate: 0,
    avgConviction: 0,
    reputationDelta: 0,
    earnedUsd: guildEarningsTotalUsd,
  };

  // Cross-fill governance counts into KPIs for tab badge hydration callers.
  void governanceForGuild;

  return { kpis, stakePosition, periodStats };
}

/** Convert a raw guild feed post into the sidebar chatter card preview shape. */
function toChatterPreview(post: GuildPost): ChatterPreview {
  return {
    id: post.id,
    author: post.author?.fullName || post.author?.walletAddress?.slice(0, 8) || "Member",
    role: post.author?.expertRole || post.author?.guildRole,
    timeAgo: post.createdAt ? formatTimeAgo(post.createdAt) : "",
    body: post.body || post.title || "",
  };
}

const TABS: Array<{
  id: GuildWorkspaceTab;
  label: string;
  countKey?: "queue" | "active" | "governance" | "feed";
  alert?: boolean;
}> = [
  { id: "queue", label: "Queue", countKey: "queue", alert: true },
  { id: "reviews", label: "My Reviews", countKey: "active" },
  { id: "governance", label: "Governance", countKey: "governance", alert: true },
  { id: "feed", label: "Feed", countKey: "feed" },
  { id: "members", label: "Members" },
  { id: "earnings", label: "Earnings" },
  { id: "leaderboard", label: "Leaderboard" },
];

const ROLE_LABEL: Record<string, string> = {
  recruit: "Recruit",
  apprentice: "Apprentice",
  craftsman: "Craftsman",
  officer: "Senior",
  master: "Master",
};

/**
 * Container for the private member workspace at `/expert/guild/[id]`.
 *
 * IA differs from the public guild page (Surface 1):
 * - Slim header (no banner — they're already in the guild)
 * - 5 KPI tiles (queue / commits / stake / payouts / reputation)
 * - 7 tabs anchored on the daily review queue
 *
 * The Members + Leaderboard tabs reuse the public-mode components for now;
 * Phase 2 owns the redesigned versions and these will inherit them when
 * landed.
 */
export function GuildWorkspacePage({ guildId }: GuildWorkspacePageProps) {
  const { address } = useExpertAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isActive: isStoryLabPreview } = useStoryLabContext();
  const isStoryLabSyntheticGuild = isStoryLabPreview && guildId === STORY_LAB_GUILD.id;
  const hasExpertWallet = Boolean(address);
  const shouldLoadWorkspaceData = canLoadGuildWorkspaceData({
    address,
    isStoryLabSyntheticGuild,
  });
  const [hasHydrated, setHasHydrated] = useState(false);
  const initialTab: GuildWorkspaceTab = (() => {
    const t = searchParams?.get("tab");
    if (t && (GUILD_WORKSPACE_TABS as readonly string[]).includes(t)) {
      return t as GuildWorkspaceTab;
    }
    return "queue";
  })();
  const [activeTab, setActiveTab] = useState<GuildWorkspaceTab>(initialTab);
  const [guild, setGuild] = useState<GuildDetailData | null>(null);
  const [currentExpertId, setCurrentExpertId] = useState<string | null>(null);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"all" | "month" | "week">("all");

  useEffect(() => {
    // One-shot SSR→client hydration guard: flips a flag on mount so client-only
    // UI (wallet-gated data) renders after hydration, avoiding SSR mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time post-hydration flag
    setHasHydrated(true);
  }, []);

  const { isLoading, error } = useFetch(
    async () => {
      if (!address && !isStoryLabSyntheticGuild) throw new Error("No wallet address");
      const { guild: normalized, currentExpertId: expertId } =
        await fetchAndNormalizeGuildData(
          guildId,
          address ?? "0x0000000000000000000000000000000000000000",
        );
      setGuild(normalized);
      if (expertId) setCurrentExpertId(expertId);
      return normalized;
    },
    {
      skip: !shouldLoadWorkspaceData,
      onError: (msg) => {
        logger.warn("Workspace guild fetch failed", msg);
        toast.error(msg);
      },
    },
  );

  // Triaged queue payload — owned by the workspace so the KPI tiles can read
  // counts straight from `items` even when the child tab isn't mounted. The
  // Queue tab consumes the same data via props.
  const { data: queueData } = useFetch(
    () => guildsApi.getMemberQueue(guildId, address),
    {
      skip: !shouldLoadWorkspaceData,
      // Endpoint is still rolling out — soft-fail so KPIs can fall back to
      // the per-source numbers below.
      onError: () => {},
    },
  );

  // Expert profile fallback — the primary `currentExpertId` is derived from
  // matching the viewer's wallet inside `data.experts` (in the guild detail
  // payload). That match fails whenever the backend doesn't return the
  // viewer in the experts array (e.g. they're a recently-joined member, or
  // the API returned a trimmed view), leaving downstream tabs like "My
  // Reviews" stuck on a permanent loading state. Looking up the expert by
  // wallet directly is cheap and lets every guild tab make progress even
  // when the embedded match misses.
  const { data: expertProfile } = useFetch(
    () => expertApi.getProfile(address!),
    {
      skip: !address,
      onError: () => {},
    },
  );
  const resolvedExpertId = currentExpertId ?? expertProfile?.id ?? null;

  // Assigned applications scoped to this guild — drives the activeCommits /
  // awaitingReveal / revealOpen KPI tiles and the "My Reviews" tab. We
  // server-side filter on guildId (the endpoint already supports it) so we
  // don't pull every guild's worth back over the wire.
  const { data: assignedRaw, isLoading: assignedLoading } = useFetch(
    () => guildApplicationsApi.getAssigned(resolvedExpertId!, guildId),
    {
      skip: !resolvedExpertId,
      onError: (msg) => logger.warn("Assigned applications fetch failed", msg),
    },
  );
  // Strict client-side guild filter. The backend already filters by guildId,
  // but we belt-and-braces here so a stray row without a guild_id (or with
  // the wrong one) never leaks into another guild's "My Reviews" view.
  // Dropping an orphan is preferable to showing it under the wrong guild.
  const assignedForGuild: GuildApplication[] = useMemo(
    () => (assignedRaw ?? []).filter((a) => a.guild_id === guildId),
    [assignedRaw, guildId],
  );

  // Stake position for THIS guild only. The batch endpoint returns one row
  // per guild the expert has staked into; we pick ours.
  const { data: guildStakes } = useFetch(
    () => blockchainApi.getExpertGuildStakes(address!),
    {
      skip: !address,
      onError: () => {},
    },
  );
  const guildStake: GuildStakeInfo | undefined = useMemo(
    () => guildStakes?.find((s) => s.guildId === guildId),
    [guildStakes, guildId],
  );

  // Earnings filtered to this guild — feeds the pending-payouts tile fallback
  // and the period-stats card. Best-effort: empty-state when the endpoint
  // 404s (it requires the wallet path resolver, which is in place but new).
  const { data: earningsData } = useFetch(
    () => expertApi.getEarningsBreakdown(address!, { guildId, limit: 50 }),
    {
      skip: !address,
      onError: () => {},
    },
  );
  const guildEarningsTotalUsd = earningsData?.summary?.totalVetd ?? 0;
  const guildEarningsCount = earningsData?.entries?.length ?? 0;

  // Governance proposals — the global active-proposals endpoint is the
  // source of truth; we filter to this guild client-side and merge in any
  // finalized proposals from `getProposals` so the "Recently decided" list
  // is populated.
  const { data: activeProposalsRaw } = useFetch(
    () => governanceApi.getActiveProposals(),
    { onError: () => {} },
  );
  const { data: pastProposalsRaw } = useFetch(
    () => governanceApi.getProposals({ guildId, status: "finalized", limit: 25 }),
    { onError: () => {} },
  );
  const governanceForGuild: GuildWorkspaceProposal[] = useMemo(() => {
    const active = (activeProposalsRaw ?? [])
      .filter((p) => !p.guild_id || p.guild_id === guildId)
      .map(mapGovernanceProposal);
    const past = (pastProposalsRaw ?? [])
      .filter((p) => p.finalized)
      .map(mapGovernanceProposal);
    // Active first, then past — `GuildGovernanceTab` already splits on
    // status === "open" vs not, so the order here is just for stability.
    const seen = new Set<string>();
    return [...active, ...past].filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [activeProposalsRaw, pastProposalsRaw, guildId]);

  // Submitted reviews for this expert in this guild — feeds the "My Reviews"
  // tab once the user has committed. Pending assignments still come from
  // `assignedForGuild`.
  const { data: submittedReviews, isLoading: submittedLoading } = useFetch(
    () =>
      expertApi.getSubmittedReviews(resolvedExpertId!, { guildId, limit: 100 }),
    {
      skip: !resolvedExpertId,
      onError: () => {},
    },
  );

  // Latest 3 posts for the sidebar chatter card. Mirrors the public-feed
  // visibility the workspace Feed tab now uses (members-only/internal feed
  // is deferred to v2), so the preview and the tab show the same posts.
  const { data: internalChatterPosts } = useFetch(
    () => guildFeedApi.getPosts(guildId, { visibility: "public", limit: 3, sort: "new" }),
    {
      skip: !shouldLoadWorkspaceData,
      onError: () => {},
    },
  );
  const internalChatter: ChatterPreview[] = useMemo(
    () => (internalChatterPosts?.data ?? []).slice(0, 3).map(toChatterPreview),
    [internalChatterPosts],
  );

  // Guild-scoped leaderboard — feeds the Leaderboard tab. Matches what the
  // old GuildDetailView pulled (raw entries + transform helper).
  const { data: leaderboardRaw } = useFetch(
    () => expertApi.getLeaderboard({ guildId, limit: 50 }),
    {
      skip: !shouldLoadWorkspaceData,
      onError: () => {},
    },
  );
  const leaderboardData = useMemo(() => {
    if (!leaderboardRaw || !address) return { topExperts: [], currentUser: null };
    return transformLeaderboardData(leaderboardRaw, address, {
      expertRole: guild?.expertRole ?? "recruit",
      reputation: guild?.reputation ?? 0,
      totalEndorsementEarnings: 0,
    });
  }, [leaderboardRaw, address, guild?.expertRole, guild?.reputation]);

  // Compose the bundle that drives the KPI strip + header sub-meta. Recomputed
  // when any source updates — cheap pure aggregation.
  const kpiBundle: KpiBundle | null = useMemo(() => {
    if (!guild) return null;
    return buildKpiBundle({
      guild,
      queue: queueData ?? undefined,
      assigned: assignedForGuild,
      guildStake,
      governanceForGuild,
      guildEarningsTotalUsd,
      guildEarningsCount,
    });
  }, [guild, queueData, assignedForGuild, guildStake, governanceForGuild, guildEarningsTotalUsd, guildEarningsCount]);

  const handleTabChange = (next: GuildWorkspaceTab) => {
    setActiveTab(next);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tab", next);
    router.replace(`/expert/guild/${encodeURIComponent(guildId)}?${params.toString()}`);
  };

  if (!hasHydrated && !isStoryLabSyntheticGuild) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasExpertWallet && !isStoryLabSyntheticGuild) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Alert variant="info">Connect your wallet to open your guild workspace.</Alert>
      </div>
    );
  }

  if (isLoading && !guild) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Alert variant="error">{extractApiError(error, "Failed to load guild")}</Alert>
      </div>
    );
  }

  const identity = getGuildIdentity(guild.name);
  const guildIconName = getGuildIconName(guild.name);
  const role = (guild.expertRole || "recruit").toLowerCase();
  const roleLabel = ROLE_LABEL[role] ?? guild.expertRole;

  const kpis = kpiBundle?.kpis;
  const queueCount = kpis?.queueCount ?? 0;
  const queueUrgent = kpis?.queueUrgentCount ?? 0;
  const governanceUnvoted = governanceForGuild.filter(
    (p) => p.status === "open" && !p.hasVoted,
  ).length;

  const tabBadgeCount = (id: GuildWorkspaceTab): number | undefined => {
    if (id === "queue") return queueCount > 0 ? queueCount : undefined;
    if (id === "reviews") return kpis?.activeCommits;
    if (id === "governance") return governanceUnvoted > 0 ? governanceUnvoted : undefined;
    if (id === "feed") return undefined;
    return undefined;
  };

  return (
    <div className="relative min-h-screen text-foreground">
      <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/expert/dashboard" },
            { label: "My Guilds", href: "/expert/guilds" },
            { label: `${identity.shortName} · Workspace` },
          ]}
        />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-5 sm:px-6 lg:px-8">
        {/* Slim header */}
        <section className="relative mb-5 flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card px-5 py-5">
          <span
            aria-hidden
            className="absolute bottom-0 left-0 top-0 w-[3px]"
            style={{ background: identity.hex }}
          />
          <div
            className={cn(
              "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border",
              identity.classes.bg,
              identity.classes.border
            )}
          >
            <VettedIcon
              name={guildIconName}
              className={cn("h-7 w-7", identity.classes.text)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-xl font-bold leading-none text-foreground sm:text-[22px]">
                {identity.displayName} · Workspace
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em]",
                  identity.classes.bg,
                  identity.classes.border,
                  identity.classes.text,
                )}
              >
                <BadgeCheck className="h-3 w-3" />
                Member
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-warning/25 bg-warning/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-warning">
                <Star className="h-3 w-3" />
                {roleLabel}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {guild.memberCount || 0} members · {guild.openPositions || 0} open roles
              {(kpiBundle?.periodStats?.reviews ?? 0) > 0 && (
                <>
                  {" · "}
                  <span>
                    you reviewed{" "}
                    <strong className="text-foreground">
                      {kpiBundle?.periodStats?.reviews ?? 0} candidates
                    </strong>{" "}
                    this period
                  </span>
                </>
              )}
              {(kpiBundle?.periodStats?.consensusRate ?? 0) > 0 && (
                <>
                  {" · "}
                  <strong className="text-positive">
                    {Math.round(kpiBundle!.periodStats.consensusRate)}% consensus rate
                  </strong>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Link
              href={`/guilds/${encodeURIComponent(guildId)}`}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View public page
            </Link>
            <Link
              href="/expert/profile"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground transition-colors hover:bg-muted"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Link>
          </div>
        </section>

        {/* KPI strip */}
        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <GuildKpiTile
            label="Your queue"
            value={queueCount}
            sub={
              queueUrgent > 0
                ? `${queueUrgent} due in <24h`
                : queueCount > 0
                  ? "open work"
                  : "all clear"
            }
            tone={queueUrgent > 0 ? "urgent" : "default"}
          />
          <GuildKpiTile
            label="Active commits"
            value={kpis?.activeCommits ?? 0}
            sub={(() => {
              if (!kpis) return "—";
              const parts: string[] = [];
              if ((kpis.awaitingReveal ?? 0) > 0) parts.push(`${kpis.awaitingReveal} awaiting reveal`);
              if ((kpis.revealOpen ?? 0) > 0) parts.push(`${kpis.revealOpen} reveal open`);
              if (parts.length === 0) return (kpis.activeCommits ?? 0) > 0 ? "in flight" : "all clear";
              return parts.join(" · ");
            })()}
          />
          <GuildKpiTile
            label="Stake locked"
            value={(kpis?.stakeLockedVetd ?? 0).toLocaleString()}
            sub={
              kpis?.stakeLockedReviewCount != null
                ? `VETD across ${kpis.stakeLockedReviewCount} reviews`
                : "VETD"
            }
          />
          <GuildKpiTile
            label="Pending payouts"
            value={`$${kpis?.pendingPayoutsUsd ?? 0}`}
            sub={
              (kpis?.pendingPayoutReviewCount ?? 0) > 0
                ? `${kpis?.pendingPayoutReviewCount} reviews · paid on consensus`
                : "paid on consensus"
            }
            subTone="positive"
          />
          <GuildKpiTile
            label="Reputation"
            value={(kpis?.reputation ?? guild.reputation ?? 0).toLocaleString()}
            sub={
              kpis
                ? `${kpis.reputationDelta >= 0 ? "+" : ""}${kpis.reputationDelta} this 30d${kpis.rank ? ` · rank ${kpis.rank}${kpis.totalMembers ? ` of ${kpis.totalMembers}` : ""}` : ""}`
                : "this guild"
            }
            subTone="positive"
          />
        </div>

        {/* Tabs */}
        <div className="mb-5 flex items-center justify-between border-b border-border">
          <div className="flex flex-wrap gap-0.5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tabBadgeCount(tab.id);
              const isAlert =
                tab.alert && ((tab.id === "queue" && queueUrgent > 0) || tab.id === "governance");
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "-mb-px flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm transition-colors sm:px-4",
                    isActive
                      ? "border-primary font-semibold text-foreground"
                      : "border-transparent font-medium text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                  {count != null && count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                        isAlert
                          ? "bg-primary text-primary-foreground"
                          : isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Updated just now · auto-refresh on
          </span>
        </div>

        {/* Tab panels */}
        <div role="tabpanel">
          {activeTab === "queue" && (
            <GuildQueueTab
              guildId={guildId}
              walletAddress={address}
              queueData={queueData ?? undefined}
              stakePosition={kpiBundle?.stakePosition}
              periodStats={kpiBundle?.periodStats}
              internalChatter={internalChatter}
            />
          )}
          {activeTab === "reviews" && (
            <GuildMyReviewsTab
              guildId={guildId}
              expertId={resolvedExpertId}
              applications={assignedForGuild}
              submittedReviews={submittedReviews ?? []}
              isLoading={
                assignedLoading || submittedLoading || (!resolvedExpertId && !!address)
              }
            />
          )}
          {activeTab === "governance" && (
            <GuildGovernanceTab
              guildId={guildId}
              proposals={governanceForGuild}
            />
          )}
          {activeTab === "feed" && (
            <GuildInternalFeedTab
              guildId={guildId}
              membershipRole={guild.expertRole as ExpertRole}
            />
          )}
          {activeTab === "members" && (
            <GuildMembersTab
              experts={guild.experts || []}
              candidates={guild.candidates || []}
              expertsCount={guild.experts?.length || 0}
              candidatesCount={guild.candidates?.length || guild.candidateCount || 0}
            />
          )}
          {activeTab === "earnings" && <GuildEarningsTab earnings={guild.earnings} />}
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
  );
}
