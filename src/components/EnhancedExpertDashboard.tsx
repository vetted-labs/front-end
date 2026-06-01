"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Vote, Wallet, Copy, Check, ExternalLink } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";

import { SkeletonCard } from "@/components/ui/skeleton";
import { DataSection } from "@/lib/motion";
import { toast } from "sonner";
import { Alert } from "./ui/alert";
import { expertApi, guildApplicationsApi, blockchainApi, governanceApi, extractApiError } from "@/lib/api";
import { ActionButtonPanel } from "@/components/dashboard/ActionButtonPanel";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";
import { RankProgress } from "@/components/dashboard/RankProgress";
import { GuildsSection } from "@/components/dashboard/GuildsSection";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuestsWidget } from "@/components/dashboard/QuestsWidget";
import { useFetch } from "@/lib/hooks/useFetch";
import { useExpertStatus } from "@/lib/hooks/useExpertStatus";
import { useExpertOnboardingTour } from "@/lib/hooks/useExpertOnboardingTour";
import { isApprovedExpertForOnboarding } from "@/lib/expert-onboarding-route-markers";
import { GOVERNANCE_ENABLED } from "@/config/constants";
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
} from "@/components/expert/onboarding/tourTargets";

import { hashToBytes32 } from "@/lib/blockchain";
import { logger } from "@/lib/logger";
import { truncateAddress, cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";
import type { ExpertProfile, ExpertGuild } from "@/types";

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
        expertApi.getEarningsBreakdown(address, { limit: 1 }).catch((err) => {
          toast.error(extractApiError(err, "Couldn't load earnings"));
          return null;
        }),
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

  const activeReviewCount = assignedApplications?.length ?? 0;

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
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display">
              Hi, {firstName}
            </h1>

            {/* Earnings — relocated from the KPI strip into the hero */}
            <div
              className="inline-flex items-center gap-3 mt-4 px-3 py-2 rounded-lg bg-muted/40 border border-border"
              {...dataTourTarget(TOUR_TARGETS.rewardsSummary)}
            >
              <span className="w-9 h-9 rounded-lg bg-muted/60 grid place-items-center flex-shrink-0">
                <Image
                  src="/vetted-logo-icon.png"
                  alt="Vetted"
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Earnings
                </span>
                <span className="block text-xl font-bold text-foreground tabular-nums leading-tight">
                  ${Math.round(profile?.totalEarnings ?? 0).toLocaleString()}
                </span>
              </span>
            </div>
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
                  showEndorse={false}
                />
              </div>
            )}
            {address && (
              <a
                href={`https://etherscan.io/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-primary hover:underline lg:self-end"
              >
                View on explorer
                <ExternalLink className="w-3 h-3" />
              </a>
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
          {/* MAIN — Review queue + Governance + Recent activity */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <div {...dataTourTarget(TOUR_TARGETS.dashboardReviewQueue)}>
              <ReviewQueue applications={assignedApplications ?? []} />
            </div>

            <div {...dataTourTarget(TOUR_TARGETS.dashboardQuests)}>
              <QuestsWidget wallet={address} />
            </div>

            {/* Governance summary sits above Recent Activity.
                Hidden pending rework (VET-103) — re-enable via GOVERNANCE_ENABLED. */}
            {!loading && GOVERNANCE_ENABLED && (
              <div {...dataTourTarget(TOUR_TARGETS.dashboardGovernanceCard)}>
                <GovernanceSummaryCard />
              </div>
            )}

            <div {...dataTourTarget(TOUR_TARGETS.dashboardRecentActivity)}>
              <RecentActivity activities={profile?.recentActivity ?? []} />
            </div>

            {/* Your Guilds — pulled into left column to fill space below activity */}
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
          </aside>
        </div>
      </DataSection>
    </div>
  );
}
