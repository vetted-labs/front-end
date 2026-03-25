"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import {
  Shield,
  Star,
  DollarSign,
  Coins,
  ClipboardList,
  Loader2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Alert } from "./ui/alert";
import { expertApi, guildApplicationsApi } from "@/lib/api";

import { ActionButtonPanel } from "@/components/dashboard/ActionButtonPanel";
import { StatCard } from "@/components/dashboard/StatCard";
import { GuildCard } from "@/components/GuildCard";
import { WalletVerificationModal } from "@/components/WalletVerificationModal";
import { useWalletVerification } from "@/lib/hooks/useWalletVerification";
import { DashboardNotificationsFeed } from "@/components/dashboard/DashboardNotificationsFeed";
import { InactivityWarningBanner } from "@/components/expert/InactivityWarningBanner";
import { PromotionProgressCard } from "@/components/expert/PromotionProgressCard";
import { blockchainApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { hashToBytes32 } from "@/lib/blockchain";
import { logger } from "@/lib/logger";
import { formatVetd } from "@/lib/utils";
import type { ExpertProfile, ExpertGuild } from "@/types";

export function EnhancedExpertDashboard() {
  const router = useRouter();
  const { address, isConnected, isReconnecting } = useExpertAccount();
  const [mounted, setMounted] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const {
    isVerified: walletVerified,
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
      onSuccess: (enhancedData) => {
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

  const { data: stakesData, isLoading: stakesLoading } = useFetch<StakesResult>(
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
  }, [stakesData, address, profile?.guilds]);

  const guildStakes = stakesData?.stakesMap ?? {};
  const stakesLoaded = !stakesLoading && !!stakesData;
  const stakingStatus = stakesData
    ? { stakedAmount: stakesData.totalStaked.toString(), meetsMinimum: stakesData.totalStaked > 0 }
    : null;

  const handleVerifyWallet = async () => {
    if (!address) return;
    const success = await requestVerification(address);
    if (success) {
      setShowVerificationModal(false);
    }
  };

  const handleGuildClick = (guildId: string) => {
    router.push(`/expert/guild/${guildId}`);
  };

  if (!isConnected || !address) {
    return (
      <div className="flex items-center justify-center">
        <Alert variant="warning">
          Please connect your wallet to access the expert dashboard.
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
          <button
            onClick={() => router.push("/expert/apply")}
            className="w-full px-6 py-3 text-white bg-gradient-to-r from-primary via-accent to-primary/80 rounded-lg hover:opacity-90 transition-all"
          >
            Apply as Expert
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center">
        <Alert variant="error">No profile data available</Alert>
      </div>
    );
  }


  return (
    <div className="min-h-full animate-page-enter">
      <WalletVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onVerify={handleVerifyWallet}
        isSigning={isSigning}
        error={verificationError}
        walletAddress={address}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile.fullName}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s your expert activity overview
          </p>
        </div>

        {/* Inactivity decay warning */}
        <InactivityWarningBanner recentActivity={profile.recentActivity} />

        {/* Action Button Panel */}
        <div className="mb-6 mt-4">
          <ActionButtonPanel
            stakingStatus={stakingStatus ?? undefined}
            hasGuilds={profile.guilds.length > 0}
            onRefresh={refetch}
          />
        </div>

        {/* Stat Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Reputation Score"
            value={profile.reputation}
            icon={Star}
            iconBgColor="bg-primary/10"
            iconColor="text-primary"
          />
          <StatCard
            title="Total Earnings"
            value={formatVetd(profile.totalEarnings)}
            icon={DollarSign}
            iconBgColor="bg-green-500/10"
            iconColor="text-green-600 dark:text-green-400"
          />
          <StatCard
            title="Guild Memberships"
            value={profile.guilds.length}
            icon={Shield}
            iconBgColor="bg-blue-500/10"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            title="Staked VETD"
            value={!stakesLoaded ? "—" : stakingStatus?.stakedAmount ? `${parseFloat(stakingStatus.stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "0"}
            icon={Coins}
            iconBgColor="bg-orange-500/10"
            iconColor="text-orange-600 dark:text-orange-400"
          />
        </div>

        {/* Guild Rank Promotion Progress */}
        {profile.guilds.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {profile.guilds.slice(0, 3).map((guild) => (
              <div key={guild.id}>
                <p className="text-xs text-muted-foreground mb-2 font-medium">{guild.name}</p>
                <PromotionProgressCard
                  currentRole={guild.expertRole}
                  reviewCount={profile.reviewCount ?? 0}
                  consensusRate={profile.approvalCount && profile.reviewCount
                    ? Math.round((profile.approvalCount / profile.reviewCount) * 100)
                    : null
                  }
                  endorsementCount={profile.endorsementCount ?? 0}
                />
              </div>
            ))}
          </div>
        )}

        {/* Assigned to Me */}
        {assignedApplications && assignedApplications.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06] mb-6">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Assigned to Me</h2>
                <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold rounded-full">
                  {assignedApplications.length}
                </span>
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {assignedApplications.slice(0, 5).map((app) => (
                  <button
                    key={`${app.item_type ?? "proposal"}-${app.id}`}
                    onClick={() => {
                      if (app.item_type === "guild_application") {
                        router.push(`/expert/guild/${app.guild_id}?tab=membershipApplications&candidateApplicationId=${app.id}`);
                      } else if (app.item_type === "expert_application") {
                        router.push(`/expert/guild/${app.guild_id}?tab=applications&applicationId=${app.id}`);
                      } else if (app.guild_id) {
                        router.push(`/expert/guild/${app.guild_id}?tab=membershipApplications&applicationId=${app.id}`);
                      }
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50 transition-all text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {app.candidate_name || "Application"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {app.guild_name || "Guild"}
                      </p>
                    </div>
                    {app.item_type === "guild_application" || app.item_type === "expert_application" ? (
                      <div className="flex items-center gap-1.5 ml-4 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm font-semibold text-blue-500">
                          Review
                        </span>
                      </div>
                    ) : app.total_stake_for != null ? (
                      <div className="flex items-center gap-1.5 ml-4 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                        <Coins className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-semibold text-primary">
                          {Number(app.total_stake_for).toLocaleString()} VETD
                        </span>
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Your Guilds */}
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06] mb-6">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Guilds</h2>
            <button
              onClick={() => router.push("/expert/guilds")}
              className="text-xs text-primary hover:underline"
            >
              View All
            </button>
          </div>

          <div className="p-5">
            {profile.guilds.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Guild Memberships Yet
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Your application is under review. You&apos;ll be added to a guild once approved.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.guilds.map((guild) => (
                  <GuildCard
                    key={guild.id}
                    guild={{
                      ...guild,
                      stakedAmount: guildStakes[guild.id] || "0",
                    }}
                    variant="browse"
                    showDescription={false}
                    onViewDetails={handleGuildClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section B — Recent Notifications (full-width) */}
        <div className="mb-8">
          <DashboardNotificationsFeed walletAddress={address} />
        </div>
      </div>
    </div>
  );
}
