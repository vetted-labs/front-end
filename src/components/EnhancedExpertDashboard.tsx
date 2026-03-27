"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "./ui/alert";
import { expertApi, guildApplicationsApi, blockchainApi } from "@/lib/api";
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
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { hashToBytes32 } from "@/lib/blockchain";
import { logger } from "@/lib/logger";
import {
  GUILD_RANK_ORDER,
  REPUTATION_DECAY_WARNING_DAYS,
} from "@/config/constants";
import type { ExpertProfile, ExpertGuild } from "@/types";

export function EnhancedExpertDashboard() {
  const router = useRouter();
  const { address, isConnected, isReconnecting } = useExpertAccount();
  const [mounted, setMounted] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const {
    isSigning,
    error: verificationError,
    checkVerification,
    requestVerification,
  } = useWalletVerification();

  useMountEffect(() => {
    setMounted(true);
  });

  // Redirect when disconnected (with grace period for reconnection)
  // eslint-disable-next-line no-restricted-syntax -- reacts to wagmi connection state
  useEffect(() => {
    if (!mounted) return;
    if (isConnected && address) return;
    if (isReconnecting) return;
    const timer = setTimeout(() => router.push("/"), 3000);
    return () => clearTimeout(timer);
  }, [mounted, isConnected, address, isReconnecting, router]);

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
      skip: !mounted || !isConnected || !address,
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
      skip: !mounted || !isConnected || !address || !profile?.guilds?.length || !!error,
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
  const isDecayActive = (() => {
    if (!profile?.recentActivity?.length) return true;
    const timestamps = profile.recentActivity
      .map((a) => new Date(a.timestamp).getTime())
      .filter((t) => !isNaN(t));
    if (timestamps.length === 0) return true;
    const mostRecent = Math.max(...timestamps);
    const daysSince = Math.floor(
      (Date.now() - mostRecent) / (1000 * 60 * 60 * 24)
    );
    return daysSince >= REPUTATION_DECAY_WARNING_DAYS;
  })();

  // Consensus rate for Reviews stat
  const consensusRate =
    profile?.reviewCount && profile.reviewCount > 0 && profile.approvalCount != null
      ? Math.round((profile.approvalCount / profile.reviewCount) * 100)
      : null;

  const handleVerifyWallet = async () => {
    if (!address) return;
    const success = await requestVerification(address);
    if (success) {
      setShowVerificationModal(false);
    }
  };

  // Loading state
  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert variant="error">
          Failed to load dashboard: {error}
        </Alert>
      </div>
    );
  }

  if (!profile) return null;

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

      {/* Section 1: Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {highestRank ? rankLabels[highestRank] : "Expert"} ·{" "}
            {profile.guilds?.length ?? 0} guilds
          </p>
        </div>
        <ActionButtonPanel
          stakingStatus={stakingStatus}
          onRefresh={refetch}
        />
      </div>

      {/* Section 2: Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Reputation"
          value={profile.reputation ?? 0}
          warningDot={isDecayActive}
          subtext={
            isDecayActive ? "\u25BC -10/cycle \u00B7 decay active" : undefined
          }
          subtextVariant={isDecayActive ? "warning" : "default"}
        />
        <StatCard
          label="Earnings"
          value={`$${Math.round(profile.totalEarnings ?? 0).toLocaleString()}`}
          subtext="total earned"
          subtextVariant="default"
        />
        <StatCard
          label="Staked VETD"
          value={Math.round(totalStaked).toLocaleString()}
          subtext={`across ${profile.guilds?.length ?? 0} guilds`}
        />
        <StatCard
          label="Reviews"
          value={profile.reviewCount ?? 0}
          subtext={
            consensusRate != null
              ? `${consensusRate}% consensus rate`
              : undefined
          }
        />
      </div>

      {/* Section 3: Review Queue + Rank Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
        <ReviewQueue applications={assignedApplications ?? []} />
        <RankProgress guilds={profile.guilds ?? []} />
      </div>

      {/* Section 4: Your Guilds */}
      <GuildsSection
        guilds={profile.guilds ?? []}
        guildStakes={guildStakes}
      />

      {/* Section 5: Recent Activity + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
        <RecentActivity activities={profile.recentActivity ?? []} />
        <SlimNotificationsFeed walletAddress={address!} />
      </div>
    </div>
  );
}
