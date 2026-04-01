"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";

import { Skeleton, SkeletonStatCard, SkeletonCard } from "@/components/ui/skeleton";
import { DataSection } from "@/lib/motion";
import { toast } from "sonner";
import { Alert } from "./ui/alert";
import { expertApi, guildApplicationsApi, blockchainApi, governanceApi } from "@/lib/api";
import { ActionButtonPanel } from "@/components/dashboard/ActionButtonPanel";
import { StatCard } from "@/components/dashboard/StatCard";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";
import { RankProgress } from "@/components/dashboard/RankProgress";
import { GuildsSection } from "@/components/dashboard/GuildsSection";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SlimNotificationsFeed } from "@/components/dashboard/SlimNotificationsFeed";
import { WalletVerificationModal } from "@/components/WalletVerificationModal";
import { useWalletVerification } from "@/lib/hooks/useWalletVerification";
import { useFetch } from "@/lib/hooks/useFetch";

import { hashToBytes32 } from "@/lib/blockchain";
import { logger } from "@/lib/logger";
import {
  GUILD_RANK_ORDER,
  REPUTATION_DECAY_WARNING_DAYS,
  REPUTATION_DECAY_CYCLE_DAYS,
  computeVoteWeight,
} from "@/config/constants";
import { STATUS_COLORS } from "@/config/colors";
import type { ExpertProfile, ExpertGuild } from "@/types";

function GovernanceSummaryCard() {
  const router = useRouter();
  const { data: proposals } = useFetch(
    () => governanceApi.getActiveProposals(),
    {
      onError: () => {
        // Non-critical — governance summary failing shouldn't surface an error
      },
    }
  );

  const count = proposals?.length ?? 0;

  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 cursor-pointer hover:border-primary/30 transition-colors`}
      onClick={() => router.push("/expert/governance")}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && router.push("/expert/governance")}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
          Governance
        </p>
        <p className="text-sm font-medium text-foreground">
          {count > 0 ? (
            <>
              <span className={`font-bold text-primary`}>{count}</span> active proposal{count !== 1 ? "s" : ""} pending your vote
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

export function EnhancedExpertDashboard() {
  const router = useRouter();
  const { address, isConnected, isReconnecting } = useExpertAccount();
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const {
    isSigning,
    error: verificationError,
    checkVerification,
    requestVerification,
  } = useWalletVerification();

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

      const [data, earningsResult] = await Promise.all([
        expertApi.getProfile(address),
        expertApi.getEarningsBreakdown(address, { limit: 1 }).catch(() => null),
      ]);

      if (!data) {
        throw new Error("Failed to load profile data");
      }

      const earningsData = earningsResult;
      if (earningsData?.summary?.totalVetd != null) {
        data.totalEarnings = earningsData.summary.totalVetd;
      }

      // Merge per-guild earnings from the breakdown API (real data from proposal_votes)
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
        guilds,
        pendingTasks: {
          pendingProposalsCount: guilds.reduce((sum: number, g: ExpertGuild) => sum + g.pendingProposals, 0),
          unreviewedApplicationsCount: 0,
        },
      } as ExpertProfile;
    },
    {
      skip: !address,
      onSuccess: () => {
        if (!address) return;
        // Check wallet verification in background
        checkVerification(address).then((verified) => {
          if (!verified) setShowVerificationModal(true);
        });
      },
      onError: (message) => {
        toast.error(message);
      },
    }
  );

  // Phase 2: Fetch assigned applications (depends on profile)
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

  // Phase 3: Load guild stakes progressively (depends on profile)
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
        // Fallback: fetch per-guild stakes in batches
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

      return { stakesMap, totalStaked };
    },
    {
      skip: !address || !profile?.guilds?.length || !!error,
    }
  );

  // Background sync: fire-and-forget after stake data loads.
  // Uses a probe-first pattern: try the first guild, only sync the rest if it succeeds.
  // eslint-disable-next-line no-restricted-syntax -- fire-and-forget sync after blockchain data loads
  useEffect(() => {
    if (!stakesData || !address || !profile?.guilds?.length || error) return;

    const guilds = profile.guilds;
    const firstBlockchainGuildId = hashToBytes32(guilds[0].id);

    blockchainApi.syncStake(address, firstBlockchainGuildId)
      .then(() => {
        // First succeeded — sync remaining guilds
        for (let i = 1; i < guilds.length; i++) {
          const blockchainGuildId = hashToBytes32(guilds[i].id);
          blockchainApi.syncStake(address, blockchainGuildId).catch(() => {});
        }
      })
      .catch(() => {
        logger.warn("Stake sync endpoint unavailable, skipping background sync");
      });
  }, [stakesData, address, profile?.guilds, error]);

  // Derived state for new dashboard layout
  const guildStakes = stakesData?.stakesMap ?? {};
  const totalStaked = stakesData?.totalStaked ?? 0;
  const stakingStatus = {
    stakedAmount: totalStaked.toString(),
    meetsMinimum: totalStaked > 0,
  };

  // Compute highest rank for header subtitle
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

  // Decay detection (same logic as InactivityWarningBanner)
  const mostRecentActivityMs = (() => {
    if (!profile?.recentActivity?.length) return null;
    const timestamps = profile.recentActivity
      .map((a) => new Date(a.timestamp).getTime())
      .filter((t) => !isNaN(t));
    return timestamps.length > 0 ? Math.max(...timestamps) : null;
  })();

  const isDecayActive = (() => {
    if (mostRecentActivityMs === null) return true;
    const daysSince = Math.floor((Date.now() - mostRecentActivityMs) / (1000 * 60 * 60 * 24));
    return daysSince >= REPUTATION_DECAY_WARNING_DAYS;
  })();

  const daysUntilDecay = profile ? getDaysUntilDecay(mostRecentActivityMs) : null;

  // Consensus rate for Reviews stat
  const consensusRate =
    profile?.reviewCount && profile.reviewCount > 0 && profile.approvalCount != null
      ? Math.round((profile.approvalCount / profile.reviewCount) * 100)
      : null;

  // Vote weight and reward tier (whitepaper: 1 × (1 + min(Rep/1000, 2.0)), Guild Masters 1.5×)
  const isGuildMaster = profile?.guilds?.some((g) => g.expertRole === "master") ?? false;
  const voteWeight = computeVoteWeight(profile?.reputation ?? 0, isGuildMaster);

  function getRewardTier(reputation: number) {
    if (reputation >= 2000) return { name: "Authority", multiplier: "1.5×" };
    if (reputation >= 1000) return { name: "Established", multiplier: "1.25×" };
    return { name: "Foundation", multiplier: "1.0×" };
  }
  const rewardTier = getRewardTier(profile?.reputation ?? 0);

  const handleVerifyWallet = async () => {
    if (!address) return;
    const success = await requestVerification(address);
    if (success) {
      setShowVerificationModal(false);
    }
  };

  const loading = isLoading || !profile;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Wallet verification modal */}
      {showVerificationModal && (
        <WalletVerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          onVerify={handleVerifyWallet}
          isSigning={isSigning}
          error={verificationError}
          walletAddress={address!}
        />
      )}

      {/* Error alert — inline, not full-page replacement */}
      {error && (
        <Alert variant="error">Failed to load dashboard: {error}</Alert>
      )}

      {/* Section 1: Header — always visible */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
          {!loading && (
            <div className="text-sm text-muted-foreground mt-0.5">
              {highestRank ? rankLabels[highestRank] : "Expert"} ·{" "}
              {profile.guilds?.length ?? 0} guilds
            </div>
          )}
        </div>
        {!loading && (
          <ActionButtonPanel
            stakingStatus={stakingStatus}
            onRefresh={refetch}
          />
        )}
      </div>

      {/* Section 2: Stats Row */}
      <DataSection
        isLoading={loading}
        skeleton={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)}
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex flex-col gap-1">
            <StatCard
              label="Reputation"
              value={profile?.reputation ?? 0}
              warningDot={isDecayActive}
              subtext={
                isDecayActive ? "\u25BC -10/cycle \u00B7 decay active" : undefined
              }
              subtextVariant={isDecayActive ? "warning" : "default"}
            />
            {daysUntilDecay !== null && daysUntilDecay < 7 && (
              <span className={`text-xs px-1 ${STATUS_COLORS.warning.text}`}>
                Decay in {daysUntilDecay}d
              </span>
            )}
          </div>
          <StatCard
            label="Earnings"
            value={`$${Math.round(profile?.totalEarnings ?? 0).toLocaleString()}`}
            subtext="total earned"
            subtextVariant="default"
          />
          <StatCard
            label="Staked VETD"
            value={Math.round(totalStaked).toLocaleString()}
            subtext={`across ${profile?.guilds?.length ?? 0} guilds`}
          />
          <StatCard
            label="Reviews"
            value={profile?.reviewCount ?? 0}
            subtext={
              consensusRate != null
                ? `${consensusRate}% consensus rate`
                : undefined
            }
          />
          <StatCard
            label="Vote Weight"
            value={`${voteWeight.toFixed(2)}×`}
            subtext={`${rewardTier.name} · ${rewardTier.multiplier}`}
            subtextVariant="default"
          />
        </div>
      </DataSection>

      {/* Section 3: Review Queue + Stake Distribution */}
      <DataSection
        isLoading={loading}
        skeleton={
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
            <SkeletonCard className="min-h-[240px]" />
            <SkeletonCard className="min-h-[240px]" />
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
          <ReviewQueue applications={assignedApplications ?? []} />
          <RankProgress
            guilds={profile?.guilds ?? []}
            guildStakes={guildStakes}
            totalStaked={totalStaked}
          />
        </div>
      </DataSection>

      {/* Section 4: Your Guilds */}
      <DataSection
        isLoading={loading}
        skeleton={<SkeletonCard className="min-h-[160px]" />}
      >
        <GuildsSection
          guilds={profile?.guilds ?? []}
          guildStakes={guildStakes}
        />
      </DataSection>

      {/* Section 5: Recent Activity + Notifications */}
      <DataSection
        isLoading={loading}
        skeleton={
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
            <SkeletonCard className="min-h-[180px]" />
            <SkeletonCard className="min-h-[180px]" />
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
          <RecentActivity activities={profile?.recentActivity ?? []} />
          <SlimNotificationsFeed walletAddress={address!} />
        </div>
      </DataSection>

      {/* Section 6: Governance Summary */}
      {!loading && <GovernanceSummaryCard />}
    </div>
  );
}
