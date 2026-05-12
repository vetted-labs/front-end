import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { expertApi, guildsApi, guildApplicationsApi, blockchainApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { useGuilds } from "@/lib/hooks/useGuilds";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { isProposalVoteable, VOTEABLE_PROPOSAL_STATUS } from "@/lib/proposal-review";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";
import {
  buildStoryLabReviewApplication,
  prependUniqueById,
  withStoryLabGuildStakes,
} from "@/components/expert/story-lab/storyLabFixtures";
import { toast } from "sonner";
import type {
  ApplicationsTabType,
  ApplicationsFilterMode,
  ExpertMembershipApplication,
  CandidateGuildApplication,
  GuildApplication,
  ExpertProfile,
  GuildStakeInfo,
} from "@/types";

const ALL_GUILDS = { id: "all", name: "All Guilds" } as const;

export type HistoryItem =
  | { type: "proposal"; data: GuildApplication; sortDate: string }
  | { type: "candidate"; data: CandidateGuildApplication; sortDate: string }
  | { type: "expert"; data: ExpertMembershipApplication; sortDate: string };

export function useApplicationsData() {
  const { address } = useExpertAccount();
  const searchParams = useSearchParams();
  const { guilds: guildRecords } = useGuilds();
  const { isActive: isStoryLabPreview } = useStoryLabContext();
  const storyGuild = useMemo(
    () => guildRecords[0] ?? { id: "story-lab-engineering-guild", name: "Engineering" },
    [guildRecords]
  );

  const [selectedGuild, setSelectedGuild] = useState<{ id: string; name: string }>(ALL_GUILDS);
  const [filterMode, setFilterMode] = useState<ApplicationsFilterMode>("assigned");
  const [activeTab, setActiveTab] = useState<ApplicationsTabType>("expert");
  const [reviewedCandidateIds, setReviewedCandidateIds] = useState<Set<string>>(new Set());
  // Optimistic flip for expert applications. Mirrors `reviewedCandidateIds` —
  // we flip the card to a "Committing…" state instantly so the user sees their
  // signed commitVote land in the UI before the BE refetch completes. Avoids
  // the "is my vote saved?" confusion that lost a real review on Sven Wallet 2.
  const [reviewedExpertIds, setReviewedExpertIds] = useState<Set<string>>(new Set());

  const isAllGuilds = selectedGuild.id === "all";

  // Expert profile
  const { data: expertData } = useFetch<ExpertProfile>(
    () => expertApi.getProfile(address as string),
    { skip: !address, onError: (err) => toast.error(err) },
  );

  // Per-guild staking data
  const { data: guildStakes, isLoading: guildStakesLoading } = useFetch<GuildStakeInfo[]>(
    () => blockchainApi.getExpertGuildStakes(address as string),
    { skip: !address },
  );

  const effectiveGuildStakes = useMemo(() => {
    if (!isStoryLabPreview) return guildStakes ?? [];
    return withStoryLabGuildStakes(guildStakes ?? []);
  }, [guildStakes, isStoryLabPreview]);

  const stakedGuildIds = useMemo(() => {
    return new Set(
      effectiveGuildStakes
        .filter((s) => parseFloat(s.stakedAmount) > 0)
        .map((s) => s.guildId),
    );
  }, [effectiveGuildStakes]);

  const isStakedInGuild = (guildId?: string) => {
    if (!guildId) return stakedGuildIds.size > 0;
    return stakedGuildIds.has(guildId);
  };
  const hasAnyStake = stakedGuildIds.size > 0;

  // Expert membership applications (across all guilds).
  //
  // The BE response splits this into two arrays — `guildApplications` (active,
  // status='pending') and `historyGuildApplications` (finalized, this reviewer
  // voted on). We fetch both in a single getGuildDetails call to avoid a
  // round-trip per guild, then expose them as separate `*Raw` shapes below.
  const { data: expertAppsData, isLoading: expertAppsLoading, refetch: refetchExpertApps } = useFetch<{
    active: ExpertMembershipApplication[];
    history: ExpertMembershipApplication[];
  }>(
    async () => {
      const empty = { active: [], history: [] };
      if (!address || guildRecords.length === 0) return empty;
      const targetGuilds = isAllGuilds ? guildRecords : [selectedGuild];
      const failedGuilds: string[] = [];
      const results = await Promise.all(
        targetGuilds.map(async (g) => {
          try {
            const data = await expertApi.getGuildDetails(g.id, address);
            const active = Array.isArray(data.guildApplications) ? data.guildApplications : [];
            const history = Array.isArray(data.historyGuildApplications) ? data.historyGuildApplications : [];
            return {
              active: active.map((a) => ({ ...a, guildId: g.id, guildName: g.name })),
              history: history.map((a) => ({ ...a, guildId: g.id, guildName: g.name })),
            };
          } catch {
            failedGuilds.push(g.name);
            return { active: [], history: [] };
          }
        }),
      );
      if (failedGuilds.length > 0) {
        toast.warning(`Could not load expert apps from: ${failedGuilds.join(", ")}`);
      }
      return {
        active: results.flatMap((r) => r.active),
        history: results.flatMap((r) => r.history),
      };
    },
    { onError: (err) => toast.error(err) },
  );
  const expertAppsRaw = expertAppsData?.active;
  const historyExpertAppsRaw = expertAppsData?.history;

  // Candidate guild applications (across all guilds)
  const { data: candidateAppsRaw, isLoading: candidateAppsLoading, refetch: refetchCandidateApps } = useFetch<CandidateGuildApplication[]>(
    async () => {
      if (!address || guildRecords.length === 0) return [];
      const targetGuilds = isAllGuilds ? guildRecords : [selectedGuild];
      const failedGuilds: string[] = [];
      const results = await Promise.all(
        targetGuilds.map(async (g) => {
          try {
            const apps = await guildsApi.getCandidateApplications(g.id, address);
            return (Array.isArray(apps) ? apps : []).map((a) => ({ ...a, guildId: g.id, guildName: g.name }));
          } catch {
            failedGuilds.push(g.name);
            return [];
          }
        }),
      );
      if (failedGuilds.length > 0) {
        toast.warning(`Could not load candidate apps from: ${failedGuilds.join(", ")}`);
      }
      return results.flat();
    },
    { skip: !address || guildRecords.length === 0, onError: (err) => toast.error(err) },
  );

  // Proposals (Schelling voting)
  const { data: proposalsRaw, isLoading: proposalsLoading, refetch: refetchProposals } = useFetch<GuildApplication[]>(
    async () => {
      if (filterMode === "assigned" && expertData?.id) {
        return guildApplicationsApi.getAssigned(
          expertData.id,
          isAllGuilds ? undefined : selectedGuild.id,
          VOTEABLE_PROPOSAL_STATUS,
        );
      }
      if (isAllGuilds) {
        const results = await Promise.all(
          guildRecords.map((g) => guildApplicationsApi.getByGuild(g.id, VOTEABLE_PROPOSAL_STATUS)),
        );
        return results.flat();
      }
      return guildApplicationsApi.getByGuild(selectedGuild.id, VOTEABLE_PROPOSAL_STATUS);
    },
    { onError: (err) => toast.error(err) },
  );

  // History: candidate apps the expert has reviewed (including accepted/rejected)
  const { data: historyCandidateAppsRaw, isLoading: historyCandidateAppsLoading, refetch: refetchHistoryCandidateApps } = useFetch<CandidateGuildApplication[]>(
    async () => {
      if (!address || guildRecords.length === 0) return [];
      const targetGuilds = isAllGuilds ? guildRecords : [selectedGuild];
      const failedGuilds: string[] = [];
      const results = await Promise.all(
        targetGuilds.map(async (g) => {
          try {
            const apps = await guildsApi.getCandidateApplications(g.id, address, "all");
            return (Array.isArray(apps) ? apps : []).map((a) => ({ ...a, guildId: g.id, guildName: g.name }));
          } catch {
            failedGuilds.push(g.name);
            return [];
          }
        }),
      );
      if (failedGuilds.length > 0) {
        toast.warning(`Could not load history from: ${failedGuilds.join(", ")}`);
      }
      return results.flat().filter((a) => a.expertHasReviewed);
    },
    { skip: activeTab !== "history", onError: (err) => toast.error(err) },
  );

  // History: finalized proposals the expert voted on
  const { data: historyProposalsRaw, isLoading: historyLoading, refetch: refetchHistory } = useFetch<GuildApplication[]>(
    async () => {
      if (!expertData?.id) return [];
      const all = await guildApplicationsApi.getAssigned(
        expertData.id,
        isAllGuilds ? undefined : selectedGuild.id,
        "all",
      );
      return all.filter((p) => p.finalized && p.has_voted);
    },
    { skip: activeTab !== "history", onError: (err) => toast.error(err) },
  );

  // Derived data
  const expertApps = useMemo(() => {
    const raw = expertAppsRaw ?? [];
    const withOptimistic = reviewedExpertIds.size === 0
      ? raw
      : raw.map((app) =>
          reviewedExpertIds.has(app.id)
            ? {
                ...app,
                expertHasReviewed: true,
                reviewCount: (app.reviewCount ?? 0) + (app.expertHasReviewed ? 0 : 1),
              }
            : app
        );
    if (!isStoryLabPreview) return withOptimistic;
    return prependUniqueById(
      withOptimistic,
      buildStoryLabReviewApplication(storyGuild),
      (item) => item.id
    );
  }, [expertAppsRaw, isStoryLabPreview, storyGuild, reviewedExpertIds]);

  const candidateApps = useMemo(() => {
    const raw = candidateAppsRaw ?? [];
    if (reviewedCandidateIds.size === 0) return raw;
    return raw.map((app) =>
      reviewedCandidateIds.has(app.id) ? { ...app, expertHasReviewed: true } : app
    );
  }, [candidateAppsRaw, reviewedCandidateIds]);

  const proposals = proposalsRaw ?? [];

  const historyExpertApps = useMemo(() => {
    // Source is now the BE-side `historyGuildApplications` array, which
    // already filters to apps the current reviewer voted on and that have
    // been finalized. Falling back to the active list (filtered the same
    // way) keeps behaviour correct if a pending app slips through with
    // finalized=true mid-render.
    const history = historyExpertAppsRaw ?? [];
    const stragglers = (expertAppsRaw ?? []).filter((a) => a.finalized && a.expertHasReviewed);
    if (stragglers.length === 0) return history;
    const seen = new Set(history.map((h) => h.id));
    return [...history, ...stragglers.filter((s) => !seen.has(s.id))];
  }, [historyExpertAppsRaw, expertAppsRaw]);

  const historyItems = useMemo(() => {
    const finalized = historyProposalsRaw ?? [];
    const reviewedCandidateApps = historyCandidateAppsRaw ?? [];
    return { proposals: finalized, candidateApps: reviewedCandidateApps, expertApps: historyExpertApps };
  }, [historyProposalsRaw, historyCandidateAppsRaw, historyExpertApps]);

  const historyCount = historyItems.proposals.length + historyItems.candidateApps.length + historyItems.expertApps.length;

  const historyList = useMemo((): HistoryItem[] => {
    const items: HistoryItem[] = [
      ...historyItems.proposals.map((p) => ({ type: "proposal" as const, data: p, sortDate: p.created_at })),
      ...historyItems.candidateApps.map((a) => ({ type: "candidate" as const, data: a, sortDate: a.submittedAt })),
      ...historyItems.expertApps.map((a) => ({ type: "expert" as const, data: a, sortDate: a.finalizedAt || a.appliedAt })),
    ];
    return items.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());
  }, [historyItems]);

  // Pagination
  const activeItems = activeTab === "history" ? historyList : activeTab === "expert" ? expertApps : activeTab === "candidate" ? candidateApps : proposals;
  const {
    paginatedItems,
    currentPage,
    totalPages,
    setCurrentPage,
    resetPage,
  } = useClientPagination(activeItems as unknown[], 10);

  // Pre-select guild from URL query param
  // eslint-disable-next-line no-restricted-syntax -- reads URL search params on mount/change
  useEffect(() => {
    const guildParam = searchParams.get("guild");
    if (guildParam && guildRecords.length > 0) {
      const match = guildRecords.find((g) => g.id === guildParam);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs controlled guild selection from the URL query parameter
      if (match) setSelectedGuild(match);
    }
  }, [searchParams, guildRecords]);

  // Refetch when user changes guild or filter
  const hasInitializedRef = useRef(false);

  // eslint-disable-next-line no-restricted-syntax -- refetch on runtime filter changes
  useEffect(() => {
    if (!hasInitializedRef.current) return;
    resetPage();
    refetchExpertApps();
    refetchCandidateApps();
    refetchProposals();
    refetchHistory();
    refetchHistoryCandidateApps();
  }, [selectedGuild, filterMode]);

  // Initial data load — fire once when expertData and guildRecords first become available
  // eslint-disable-next-line no-restricted-syntax -- one-time initialization
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!expertData || guildRecords.length === 0) return;
    hasInitializedRef.current = true;
    refetchExpertApps();
    refetchCandidateApps();
    refetchProposals();
  }, [expertData, guildRecords]);

  // Stats
  const pendingReviews = (expertApps?.filter((a) => !a.expertHasReviewed)?.length ?? 0) + (candidateApps?.filter((a) => !a.expertHasReviewed)?.length ?? 0);
  const proposalsToVote = proposals.filter(isProposalVoteable).length;

  const isLoading = activeTab === "expert" ? expertAppsLoading
    : activeTab === "candidate" ? candidateAppsLoading
    : activeTab === "proposals" ? proposalsLoading
    : historyLoading || historyCandidateAppsLoading;

  return {
    // Core identity
    address,
    guildRecords,
    expertData,

    // Filter state
    selectedGuild,
    setSelectedGuild,
    filterMode,
    setFilterMode,
    activeTab,
    setActiveTab,
    isAllGuilds,

    // Staking
    guildStakes: effectiveGuildStakes,
    guildStakesLoading,
    hasAnyStake,
    isStakedInGuild,

    // Application data
    expertApps,
    candidateApps,
    proposals,
    historyList,
    historyCount,

    // Loading
    isLoading: isStoryLabPreview ? false : isLoading,

    // Pagination
    activeItems,
    paginatedItems,
    currentPage,
    totalPages,
    setCurrentPage,
    resetPage,

    // Stats
    pendingReviews,
    proposalsToVote,

    // Refetch helpers
    refetchExpertApps,
    refetchCandidateApps,
    refetchProposals,
    refetchHistoryCandidateApps,

    // Optimistic update helpers.
    //
    // Both helpers flip locally and trust the BE refetch / reconciliation to
    // converge. We don't rollback on submit failure — the BE submit is being
    // made idempotent and reconciliation catches orphaned commits. A 409 here
    // (duplicate) is benign because the optimistic flip already reflects truth.
    // TODO(rollback): if the BE idempotency contract surfaces a hard mismatch
    // (e.g. a 409 with `code: "vote_mismatch"`), revert the corresponding id
    // here. Until then the symmetric flow is: flip → refetch → diverge=BE wins.
    markCandidateReviewed: (id: string) => setReviewedCandidateIds((prev) => new Set(prev).add(id)),
    markExpertReviewed: (id: string) => setReviewedExpertIds((prev) => new Set(prev).add(id)),
  };
}
