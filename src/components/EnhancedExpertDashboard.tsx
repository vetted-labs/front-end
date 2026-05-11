"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, Shield, Vote, Coins, Activity, Wallet, Copy, Check, ExternalLink, Sparkles } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";

import { SkeletonStatCard, SkeletonCard } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DataSection } from "@/lib/motion";
import { toast } from "sonner";
import { Alert } from "./ui/alert";
import { expertApi, guildApplicationsApi, blockchainApi, governanceApi } from "@/lib/api";
import { ActionButtonPanel } from "@/components/dashboard/ActionButtonPanel";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";
import { RankProgress } from "@/components/dashboard/RankProgress";
import { GuildsSection } from "@/components/dashboard/GuildsSection";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SlimNotificationsFeed } from "@/components/dashboard/SlimNotificationsFeed";
import { useFetch } from "@/lib/hooks/useFetch";
import { useExpertStatus } from "@/lib/hooks/useExpertStatus";
import { useExpertOnboardingTour } from "@/lib/hooks/useExpertOnboardingTour";
import { isApprovedExpertForOnboarding } from "@/lib/expert-onboarding-route-markers";
import {
  consumeStoryLabCompletionReady,
  isExpertStoryLabCompletionSearchParams,
  isExpertStoryLabSearchParams,
} from "@/components/expert/story-lab/storyLabData";
import {
  STORY_LAB_VOTE_OUTCOME,
  STORY_LAB_GUILD,
} from "@/components/expert/story-lab/storyLabFixtures";
import { EXPERT_STORY_COMPLETION_EVENTS } from "@/components/expert/onboarding/ExpertStoryMode";
import {
  TOUR_TARGETS,
  dataTourTarget,
  tourTargetSelector,
} from "@/components/expert/onboarding/tourTargets";

import { hashToBytes32 } from "@/lib/blockchain";
import { logger } from "@/lib/logger";
import { truncateAddress, cn } from "@/lib/utils";
import {
  GUILD_RANK_ORDER,
  REPUTATION_DECAY_WARNING_DAYS,
  REPUTATION_DECAY_CYCLE_DAYS,
  computeVoteWeight,
} from "@/config/constants";
import { STATUS_COLORS, getRankColors, REWARD_TIER_COLORS } from "@/config/colors";
import type { ExpertProfile, ExpertGuild } from "@/types";

type StatusTone = "positive" | "warning" | "negative" | "neutral" | "info" | "pending";

function repTone(reputation: number): StatusTone {
  if (reputation >= 1500) return "positive";
  if (reputation >= 750) return "info";
  if (reputation === 0) return "neutral";
  return "warning";
}

function GovernanceSummaryCard() {
  const router = useRouter();
  const { data: proposals } = useFetch(
    () => governanceApi.getActiveProposals(),
    {
      onError: () => {
        // Non-critical
      },
    }
  );

  const count = proposals?.length ?? 0;

  return (
    <div
      className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 cursor-pointer hover:border-primary/30 transition-colors"
      onClick={() => router.push("/expert/governance")}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && router.push("/expert/governance")}
    >
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
          Governance
        </p>
        <p className="text-sm font-medium text-foreground">
          {count > 0 ? (
            <>
              <span className="font-bold text-primary">{count}</span> active proposal
              {count !== 1 ? "s" : ""} pending your vote
            </>
          ) : (
            "No active proposals right now"
          )}
        </p>
      </div>
      <span className="text-xs font-medium text-primary hover:underline">
        View Governance →
      </span>
    </div>
  );
}

function getDaysUntilDecay(lastActivityTimestamp: number | null): number {
  if (lastActivityTimestamp === null) return 0;
  const decayDate = lastActivityTimestamp + REPUTATION_DECAY_CYCLE_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((decayDate - Date.now()) / (24 * 60 * 60 * 1000)));
}

function findVisibleCommitRevealTarget(): HTMLElement | null {
  if (typeof document === "undefined") return null;

  const target = document.querySelector<HTMLElement>(
    tourTargetSelector(TOUR_TARGETS.commitReveal)
  );
  if (!target) return null;

  const rect = target.getBoundingClientRect();
  const isVisible =
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom >= 0 &&
    rect.right >= 0 &&
    rect.top <= window.innerHeight &&
    rect.left <= window.innerWidth;

  return isVisible ? target : null;
}

export function EnhancedExpertDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isStoryLabPreview = isExpertStoryLabSearchParams(searchParams);
  const isStoryLabCompletionReturn = isExpertStoryLabCompletionSearchParams(searchParams);
  const { address, isConnected, isReconnecting } = useExpertAccount();
  const {
    expertStatus,
    isHydrated: expertStatusHydrated,
    setExpertStatus,
  } = useExpertStatus();
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Redirect when disconnected (with grace period for reconnection)
  // eslint-disable-next-line no-restricted-syntax -- reacts to wagmi connection state
  useEffect(() => {
    if (address) return;
    if (isReconnecting) return;
    const timer = setTimeout(() => router.push("/"), 3000);
    return () => clearTimeout(timer);
  }, [isConnected, address, isReconnecting, router]);

  // Phase 1: Fetch profile and earnings
  const { data: profile, isLoading, error, refetch } = useFetch(
    async () => {
      if (!address) throw new Error("No wallet address");

      const [data, earningsResult, onboardingState] = await Promise.all([
        expertApi.getProfile(address),
        expertApi.getEarningsBreakdown(address, { limit: 1 }).catch(() => null),
        expertApi.getOnboardingState(address).catch(() => null),
      ]);

      if (!data) {
        throw new Error("Failed to load profile data");
      }

      const earningsData = earningsResult;
      if (earningsData?.summary?.totalVetd != null) {
        data.totalEarnings = earningsData.summary.totalVetd;
      }

      const guildEarningsMap: Record<string, number> = {};
      if (earningsData?.summary?.byGuild) {
        for (const ge of earningsData.summary.byGuild) {
          guildEarningsMap[ge.guildId] = ge.total;
        }
      }

      const guilds = Array.isArray(data.guilds) ? data.guilds : [];
      for (const g of guilds) {
        if (guildEarningsMap[g.id] != null) {
          g.totalEarnings = guildEarningsMap[g.id];
        }
      }
      return {
        ...data,
        onboardingState: onboardingState ?? data.onboardingState ?? null,
        guilds,
        pendingTasks: {
          pendingProposalsCount: guilds.reduce(
            (sum: number, g: ExpertGuild) => sum + g.pendingProposals,
            0,
          ),
          unreviewedApplicationsCount: 0,
        },
      } as ExpertProfile;
    },
    {
      skip: !address,
      onError: (message) => {
        toast.error(message);
      },
    }
  );

  // Phase 2: Fetch assigned applications
  const { data: assignedApplications } = useFetch(
    () => guildApplicationsApi.getAssigned(profile!.id),
    {
      skip: !profile?.id || !!error,
      onError: (msg) => {
        logger.warn("Failed to load assigned applications", msg);
        toast.error("Failed to load assigned applications");
      },
    }
  );

  // Phase 3: Load guild stakes
  interface StakesResult {
    stakesMap: Record<string, string>;
    totalStaked: number;
  }

  const { data: stakesData } = useFetch<StakesResult>(
    async () => {
      if (!address || !profile?.guilds?.length) {
        return { stakesMap: {}, totalStaked: 0 };
      }

      const guilds = profile.guilds;
      const stakesMap: Record<string, string> = {};
      let totalStaked = 0;

      try {
        const batchResult = await blockchainApi.getExpertGuildStakes(address);

        if (Array.isArray(batchResult)) {
          for (const entry of batchResult) {
            stakesMap[entry.guildId] = entry.stakedAmount || "0";
            totalStaked += parseFloat(entry.stakedAmount || "0");
          }
        } else if (batchResult && typeof batchResult === "object") {
          for (const [guildId, amount] of Object.entries(batchResult)) {
            const amountStr = String(amount || "0");
            stakesMap[guildId] = amountStr;
            totalStaked += parseFloat(amountStr);
          }
        }
      } catch {
        for (let i = 0; i < guilds.length; i += 3) {
          const batch = guilds.slice(i, i + 3);
          const results = await Promise.all(
            batch.map((guild: ExpertGuild) => {
              const blockchainGuildId = hashToBytes32(guild.id);
              return blockchainApi.getStakeBalance(address, blockchainGuildId)
                .then((result) => ({
                  guildId: guild.id,
                  stakedAmount: result.stakedAmount || "0",
                }))
                .catch(() => ({ guildId: guild.id, stakedAmount: "0" }));
            })
          );
          for (const result of results) {
            stakesMap[result.guildId] = result.stakedAmount;
            totalStaked += parseFloat(result.stakedAmount);
          }
        }
      }

      if (isStoryLabPreview && !stakesMap[STORY_LAB_GUILD.id]) {
        stakesMap[STORY_LAB_GUILD.id] = String(STORY_LAB_VOTE_OUTCOME.stake);
        totalStaked += STORY_LAB_VOTE_OUTCOME.stake;
      }

      return { stakesMap, totalStaked };
    },
    {
      skip: !address || !profile?.guilds?.length || !!error,
    }
  );

  // Background sync
  // eslint-disable-next-line no-restricted-syntax -- fire-and-forget sync after blockchain data loads
  useEffect(() => {
    if (
      isStoryLabPreview ||
      isStoryLabCompletionReturn ||
      !stakesData ||
      !address ||
      !profile?.guilds?.length ||
      error
    ) {
      return;
    }

    const guilds = profile.guilds;
    const firstBlockchainGuildId = hashToBytes32(guilds[0].id);

    blockchainApi.syncStake(address, firstBlockchainGuildId)
      .then(() => {
        for (let i = 1; i < guilds.length; i++) {
          const blockchainGuildId = hashToBytes32(guilds[i].id);
          blockchainApi.syncStake(address, blockchainGuildId).catch(() => {});
        }
      })
      .catch(() => {
        logger.warn("Stake sync endpoint unavailable, skipping background sync");
      });
  }, [isStoryLabPreview, isStoryLabCompletionReturn, stakesData, address, profile?.guilds, error]);

  // Derived state
  const guildStakes = stakesData?.stakesMap ?? {};
  const totalStaked = stakesData?.totalStaked ?? 0;
  const stakingStatus = {
    stakedAmount: totalStaked.toString(),
    meetsMinimum: totalStaked > 0,
  };

  const highestRank = profile?.guilds?.length
    ? profile.guilds.reduce((best, g) => {
        const gIdx = GUILD_RANK_ORDER.indexOf(g.expertRole);
        const bIdx = GUILD_RANK_ORDER.indexOf(best);
        return gIdx > bIdx ? g.expertRole : best;
      }, profile.guilds[0].expertRole)
    : null;

  const rankLabels: Record<string, string> = {
    recruit: "Recruit",
    apprentice: "Apprentice",
    craftsman: "Craftsman",
    officer: "Officer",
    master: "Guild Master",
  };

  const mostRecentActivityMs = (() => {
    if (!profile?.recentActivity?.length) return null;
    const timestamps = profile.recentActivity
      .map((a) => new Date(a.timestamp).getTime())
      .filter((t) => !isNaN(t));
    return timestamps.length > 0 ? Math.max(...timestamps) : null;
  })();

  const isDecayActive = useMemo(() => {
    if (mostRecentActivityMs === null) return true;
    // eslint-disable-next-line react-hooks/purity -- Date.now compared against stored activity timestamps, memoized on activity change
    const daysSince = Math.floor((Date.now() - mostRecentActivityMs) / (1000 * 60 * 60 * 24));
    return daysSince >= REPUTATION_DECAY_WARNING_DAYS;
  }, [mostRecentActivityMs]);

  const daysUntilDecay = profile ? getDaysUntilDecay(mostRecentActivityMs) : null;

  const activeReviewCount = assignedApplications?.length ?? 0;

  const consensusRate =
    profile?.reviewCount && profile.reviewCount > 0 && profile.approvalCount != null
      ? Math.round((profile.approvalCount / profile.reviewCount) * 100)
      : null;

  const isGuildMaster = profile?.guilds?.some((g) => g.expertRole === "master") ?? false;
  const voteWeight = computeVoteWeight(profile?.reputation ?? 0, isGuildMaster);

  function getRewardTier(reputation: number) {
    if (reputation >= 2000) return { name: "Authority", multiplier: "1.5×" };
    if (reputation >= 1000) return { name: "Established", multiplier: "1.25×" };
    return { name: "Foundation", multiplier: "1.0×" };
  }
  const rewardTier = getRewardTier(profile?.reputation ?? 0);
  const tierColors = REWARD_TIER_COLORS[rewardTier.name] ?? REWARD_TIER_COLORS.Foundation;

  const loading = isLoading || !profile;
  const profileLoaded = !loading && !!profile;
  const profileStatus = profile?.status;
  // eslint-disable-next-line no-restricted-syntax -- keeps shared shell chrome synchronized with loaded profile status
  useEffect(() => {
    if (!profileStatus || expertStatus === profileStatus) return;
    setExpertStatus(profileStatus);
  }, [expertStatus, profileStatus, setExpertStatus]);

  const isApprovedExpertForOnboardingValue = isApprovedExpertForOnboarding({
    profileLoaded,
    profileStatus,
    expertStatus,
    expertStatusHydrated,
    requireSyncedExpertStatus: true,
  });
  const persistOnboardingState = useCallback(
    async (state: Parameters<typeof expertApi.updateOnboardingState>[0]) => {
      const persistedState = await expertApi.updateOnboardingState(state, address);
      void refetch();
      return persistedState;
    },
    [address, refetch]
  );
  const onboarding = useExpertOnboardingTour({
    expertId: profile?.id,
    walletAddress: address,
    isApprovedExpert: !isStoryLabPreview && isApprovedExpertForOnboardingValue,
    isDashboardRoute: pathname === "/expert/dashboard",
    profileLoaded,
    serverState: profile?.onboardingState ?? null,
    onStateChange: isStoryLabPreview ? undefined : persistOnboardingState,
  });
  const { completeTour, markChecklistEvent } = onboarding;

  const focusCommitRevealExplainer = useCallback(() => {
    const target = document.querySelector<HTMLElement>(
      tourTargetSelector(TOUR_TARGETS.commitReveal)
    );
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    target?.focus({ preventScroll: true });
  }, []);
  const handleCommitRevealExplainerViewed = useCallback(() => {
    const target = findVisibleCommitRevealTarget();
    if (!target) {
      focusCommitRevealExplainer();
      return;
    }

    markChecklistEvent("commitRevealViewed");
  }, [focusCommitRevealExplainer, markChecklistEvent]);
  const handleStoryComplete = useCallback(() => {
    for (const event of EXPERT_STORY_COMPLETION_EVENTS) {
      markChecklistEvent(event);
    }
    const completionResult = completeTour();
    if (completionResult) {
      return completionResult.catch((err: unknown) => {
        logger.warn("Failed to persist expert onboarding completion", err);
      });
    }
    return undefined;
  }, [completeTour, markChecklistEvent]);

  // eslint-disable-next-line no-restricted-syntax -- story-lab completion must retire the first-run dashboard story before rendering normal dashboard chrome
  useEffect(() => {
    if (!isStoryLabCompletionReturn || loading) return;

    if (!onboarding.canStartTour) {
      consumeStoryLabCompletionReady();
      router.replace("/expert/dashboard", { scroll: false });
      return;
    }

    if (!consumeStoryLabCompletionReady()) {
      router.replace("/expert/dashboard", { scroll: false });
      return;
    }

    handleStoryComplete();
    router.replace("/expert/dashboard", { scroll: false });
  }, [
    handleStoryComplete,
    isStoryLabCompletionReturn,
    loading,
    onboarding.canStartTour,
    router,
  ]);

  const reputation = profile?.reputation ?? 0;
  const tone = repTone(reputation);
  const rankColors = highestRank ? getRankColors(highestRank) : null;
  const expertName = profile?.fullName?.trim() || "Expert";
  const firstName = expertName.split(" ")[0];

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {error && (
        <Alert variant="error">Failed to load dashboard: {error}</Alert>
      )}

      {/* ── Hero overview card ── */}
      <section
        className="rounded-xl border border-border bg-card p-6 sm:p-8 relative overflow-hidden"
        {...dataTourTarget(TOUR_TARGETS.dashboardOverview)}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/60" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Workspace
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display mt-1.5">
              Hi, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
              {!loading && highestRank
                ? `${rankLabels[highestRank]} across ${profile?.guilds?.length ?? 0} guild${profile?.guilds?.length === 1 ? "" : "s"} — review the queue, finalize commits, and shape protocol governance.`
                : "Your expert workspace — reviews, governance, and earnings in one place."}
            </p>

            {/* Pills row: rank + tier */}
            {!loading && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {rankColors && highestRank && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em]",
                      rankColors.badge,
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", rankColors.dot)} />
                    {rankLabels[highestRank]}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em]",
                    tierColors.bg,
                    tierColors.border,
                    tierColors.text,
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  {rewardTier.name} · {rewardTier.multiplier}
                </span>
                {isDecayActive && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]",
                      STATUS_COLORS.warning.badge,
                    )}
                  >
                    Decay active
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: wallet + actions */}
          <div className="flex flex-col items-stretch lg:items-end gap-3">
            {address && (
              <button
                onClick={copyAddress}
                className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border font-mono text-xs text-foreground hover:border-primary/30 hover:bg-muted transition-colors min-w-[180px]"
              >
                <span className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                  {truncateAddress(address)}
                </span>
                {copiedAddress ? (
                  <Check className={cn("w-3.5 h-3.5", STATUS_COLORS.positive.text)} />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
            )}
            {!loading && (
              <div {...dataTourTarget(TOUR_TARGETS.dashboardActionPanel)}>
                <ActionButtonPanel
                  stakingStatus={stakingStatus}
                  onRefresh={refetch}
                />
              </div>
            )}
            {activeReviewCount > 0 && (
              <button
                onClick={() => router.push("/expert/voting")}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-[0.16em] hover:translate-y-[-1px] transition-transform"
              >
                <Vote className="w-3.5 h-3.5" />
                Voting Queue · {activeReviewCount}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── KPI strip ── */}
      <DataSection
        isLoading={loading}
        skeleton={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)}
          </div>
        }
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
          {...dataTourTarget(TOUR_TARGETS.dashboardStatsRow)}
        >
          <div {...dataTourTarget(TOUR_TARGETS.dashboardReputationStat)}>
            <KpiTile
              icon={<Shield className="w-4 h-4" />}
              label="Reputation"
              value={(profile?.reputation ?? 0).toLocaleString()}
              tone={tone === "warning" ? "warning" : tone === "info" ? "info" : "primary"}
              hint={
                isDecayActive
                  ? "Decay active"
                  : daysUntilDecay !== null && daysUntilDecay < 7
                    ? `Decay in ${daysUntilDecay}d`
                    : undefined
              }
              hintTone={isDecayActive || (daysUntilDecay !== null && daysUntilDecay < 7) ? "warning" : undefined}
            />
          </div>
          <KpiTile
            icon={<Activity className="w-4 h-4" />}
            label="Vote Weight"
            value={`${voteWeight.toFixed(2)}×`}
            tone="info"
            hint={`${rewardTier.name} · ${rewardTier.multiplier}`}
          />
          <div {...dataTourTarget(TOUR_TARGETS.dashboardReviewQueue)}>
            <KpiTile
              icon={<Vote className="w-4 h-4" />}
              label="Active Reviews"
              value={activeReviewCount}
              tone="warning"
              hint={
                activeReviewCount > 0
                  ? `${Math.round(totalStaked).toLocaleString()} VETD · 25% locked`
                  : `${profile?.reviewCount ?? 0} lifetime · ${consensusRate ?? 0}% consensus`
              }
            />
          </div>
          <KpiTile
            icon={<Wallet className="w-4 h-4" />}
            label="Staked VETD"
            value={Math.round(totalStaked).toLocaleString()}
            tone="info"
            hint={
              activeReviewCount > 0
                ? `25% locked · ${activeReviewCount} active`
                : `across ${profile?.guilds?.length ?? 0} guild${profile?.guilds?.length === 1 ? "" : "s"}`
            }
          />
          <div {...dataTourTarget(TOUR_TARGETS.rewardsSummary)}>
            <KpiTile
              icon={<Coins className="w-4 h-4" />}
              label="Earnings"
              value={`$${Math.round(profile?.totalEarnings ?? 0).toLocaleString()}`}
              tone="positive"
              hint="total earned"
            />
          </div>
        </div>
      </DataSection>

      {/* ── Two-column workspace ── */}
      <DataSection
        isLoading={loading}
        skeleton={
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SkeletonCard className="min-h-[240px] lg:col-span-2" />
            <SkeletonCard className="min-h-[240px]" />
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MAIN — Review queue + Recent activity */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <div {...dataTourTarget(TOUR_TARGETS.dashboardReviewQueue)}>
              <ReviewQueue applications={assignedApplications ?? []} />
            </div>

            <div {...dataTourTarget(TOUR_TARGETS.dashboardRecentActivity)}>
              <RecentActivity activities={profile?.recentActivity ?? []} />
            </div>

            {/* Governance summary spans full width of left column */}
            {!loading && (
              <div {...dataTourTarget(TOUR_TARGETS.dashboardGovernanceCard)}>
                <GovernanceSummaryCard />
              </div>
            )}

            {/* Your Guilds — pulled into left column to fill space below governance */}
            <div {...dataTourTarget(TOUR_TARGETS.dashboardGuildsSection)}>
              <GuildsSection
                guilds={profile?.guilds ?? []}
                guildStakes={guildStakes}
              />
            </div>
          </div>

          {/* SIDEBAR — Sticky rail */}
          <aside className="lg:col-span-1 lg:sticky lg:top-6 lg:self-start space-y-4">
            <RankProgress
              guilds={profile?.guilds ?? []}
              guildStakes={guildStakes}
              totalStaked={totalStaked}
              onManageStake={() => markChecklistEvent("stakingExplanationViewed")}
            />

            <div
              className="rounded-xl border border-border bg-card overflow-hidden"
              tabIndex={-1}
              {...dataTourTarget(TOUR_TARGETS.commitReveal)}
            >
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Commit / Reveal
                </h3>
              </div>
              <div className="p-4">
                <p className="text-xs leading-5 text-muted-foreground">
                  Some rounds hide scores while experts vote. Commit blind; the app reveals or finalizes when the round is ready.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-3 px-0"
                  onClick={handleCommitRevealExplainerViewed}
                >
                  Mark explainer viewed
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  At a Glance
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <KeyValue
                  icon={<Shield className="w-3.5 h-3.5" />}
                  label="Guilds"
                  value={`${profile?.guilds?.length ?? 0}`}
                />
                <KeyValue
                  icon={<Coins className="w-3.5 h-3.5" />}
                  label="Staked VETD"
                  value={Math.round(totalStaked).toLocaleString()}
                />
                <KeyValue
                  icon={<Vote className="w-3.5 h-3.5" />}
                  label="Lifetime Reviews"
                  value={`${profile?.reviewCount ?? 0}`}
                />
                {consensusRate !== null && (
                  <KeyValue
                    icon={<Activity className="w-3.5 h-3.5" />}
                    label="Consensus rate"
                    value={`${consensusRate}%`}
                  />
                )}
                {activeReviewCount > 0 && (
                  <div
                    className={cn(
                      "flex items-center gap-2 pt-3 border-t border-border text-xs",
                      STATUS_COLORS.warning.text,
                    )}
                  >
                    <Lock className="w-3 h-3 flex-shrink-0" />
                    <span>
                      25% locked · {activeReviewCount} active review
                      {activeReviewCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {address && (
                  <a
                    href={`https://etherscan.io/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-primary hover:underline pt-2 border-t border-border w-full"
                  >
                    View on explorer
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </aside>
        </div>
      </DataSection>

      {/* ── Notifications feed ── */}
      <DataSection
        isLoading={loading}
        skeleton={<SkeletonCard className="min-h-[180px]" />}
      >
        <div {...dataTourTarget(TOUR_TARGETS.dashboardNotificationsFeed)}>
          <SlimNotificationsFeed walletAddress={address!} />
        </div>
      </DataSection>
    </div>
  );
}

/* ─── Inline helpers ─────────────────────────────────────────── */

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "positive" | "info" | "warning";
  hint?: string;
  hintTone?: "warning" | "default";
}

const KPI_TONE: Record<KpiTileProps["tone"], { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  positive: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  info: { bg: "bg-sky-500/10", text: "text-sky-500" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-500" },
};

function KpiTile({ icon, label, value, tone, hint, hintTone }: KpiTileProps) {
  const t = KPI_TONE[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span
        className={cn(
          "w-10 h-10 rounded-lg grid place-items-center flex-shrink-0",
          t.bg,
          t.text,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold text-foreground tabular-nums leading-tight mt-0.5 truncate">
          {value}
        </p>
        {hint && (
          <p
            className={cn(
              "text-[10.5px] mt-0.5 truncate",
              hintTone === "warning"
                ? STATUS_COLORS.warning.text
                : "text-muted-foreground",
            )}
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

function KeyValue({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-sm text-foreground font-medium leading-snug tabular-nums truncate">
          {value}
        </p>
      </div>
    </div>
  );
}
