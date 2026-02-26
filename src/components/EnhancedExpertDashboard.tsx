"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  Shield,
  TrendingUp,
  Star,
  DollarSign,
  Coins,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { Alert } from "./ui/alert";
import { expertApi, guildApplicationsApi } from "@/lib/api";
import { calculateTotalPoints } from "@/lib/utils";

import { ActionButtonPanel } from "@/components/dashboard/ActionButtonPanel";
import { StatCard } from "@/components/dashboard/StatCard";
import { GuildCard } from "@/components/GuildCard";
import { WalletVerificationModal } from "@/components/WalletVerificationModal";
import { useWalletVerification } from "@/lib/hooks/useWalletVerification";
import { DashboardNotificationsFeed } from "@/components/dashboard/DashboardNotificationsFeed";
import { blockchainApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { keccak256, toBytes } from "viem";
import type { ExpertProfile, ExpertGuild } from "@/types";

export function EnhancedExpertDashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [stakingStatus, setStakingStatus] = useState<{ stakedAmount: string; meetsMinimum: boolean } | null>(null);
  const [guildStakes, setGuildStakes] = useState<Record<string, string>>({});
  const [stakesLoaded, setStakesLoaded] = useState(false);
  const [assignedApplications, setAssignedApplications] = useState<import("@/types").GuildApplicationSummary[]>([]);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const {
    isVerified: walletVerified,
    isSigning,
    error: verificationError,
    checkVerification,
    requestVerification,
  } = useWalletVerification();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect when disconnected (with debounce for chain switching)
  useEffect(() => {
    if (!mounted) return;
    if (isConnected && address) return;
    if (isDisconnecting) return;
    const timer = setTimeout(() => router.push("/"), 2000);
    return () => clearTimeout(timer);
  }, [mounted, isConnected, address, isDisconnecting]);

  const loadGuildStakes = async (guilds: ExpertGuild[], walletAddress: string) => {
    setStakesLoaded(false);
    try {
      const batchResult = await blockchainApi.getExpertGuildStakes(walletAddress);
      const stakesMap: Record<string, string> = {};
      let totalStaked = 0;

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

      setGuildStakes(stakesMap);
      setStakingStatus({ stakedAmount: totalStaked.toString(), meetsMinimum: totalStaked > 0 });
    } catch {
      const stakesMap: Record<string, string> = {};
      let totalStaked = 0;

      for (let i = 0; i < guilds.length; i += 3) {
        const batch = guilds.slice(i, i + 3);
        const results = await Promise.all(
          batch.map((guild: ExpertGuild) => {
            const blockchainGuildId = keccak256(toBytes(guild.id));
            return blockchainApi.getStakeBalance(walletAddress, blockchainGuildId)
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

      setGuildStakes(stakesMap);
      setStakingStatus({ stakedAmount: totalStaked.toString(), meetsMinimum: totalStaked > 0 });
    }

    // Sync stakes to database in background (fire-and-forget)
    for (const guild of guilds) {
      const blockchainGuildId = keccak256(toBytes(guild.id));
      blockchainApi.syncStake(walletAddress, blockchainGuildId).catch(() => {});
    }

    setStakesLoaded(true);
  };

  const { data: profile, isLoading, error, refetch } = useFetch(
    async () => {
      if (!address) throw new Error("No wallet address");

      // Phase 1: Fetch profile and earnings
      const [data, earningsResult] = await Promise.all([
        expertApi.getProfile(address),
        expertApi.getEarningsBreakdown(address, { limit: 1 }).catch(() => null),
      ]);

      if (!data) {
        throw new Error("Failed to load profile data");
      }

      const earningsData = earningsResult?.data ?? earningsResult;
      if (earningsData?.summary?.totalVetd != null) {
        data.totalEarnings = earningsData.summary.totalVetd;
      }

      const guilds = Array.isArray(data.guilds) ? data.guilds : [];
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

        // Fetch assigned applications in background
        if (enhancedData.id) {
          guildApplicationsApi.getAssigned(enhancedData.id)
            .then((apps) => setAssignedApplications(Array.isArray(apps) ? apps : []))
            .catch(() => setAssignedApplications([]));
        }

        // Check wallet verification in background
        checkVerification(address).then((verified) => {
          if (!verified) setShowVerificationModal(true);
        });

        // Phase 2: Load guild stakes progressively (page already visible)
        const guilds = Array.isArray(enhancedData.guilds) ? enhancedData.guilds : [];
        if (guilds.length > 0) {
          loadGuildStakes(guilds, address);
        } else {
          setStakesLoaded(true);
        }
      },
      onError: (message) => {
        toast.error(message);
      },
    }
  );

  // Refetch when address changes
  useEffect(() => {
    if (mounted && isConnected && address) {
      refetch();
    }
  }, [address]);

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

  // Don't show any UI if disconnecting - just navigate away
  if (isDisconnecting) {
    return null;
  }

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
    return null;
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

  const totalPoints = calculateTotalPoints({ reputation: profile.reputation, totalEarnings: profile.totalEarnings ?? 0 });

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
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {profile.fullName}!
            </h1>
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{totalPoints.toLocaleString()} Points</span>
            </div>
          </div>
          <p className="text-muted-foreground">
            Here&apos;s your expert activity overview
          </p>
        </div>

        {/* Action Button Panel */}
        <div className="mb-6">
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
            value={`$${(profile.totalEarnings ?? 0).toLocaleString()}`}
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

        {/* Assigned to Me */}
        {assignedApplications.length > 0 && (
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
                    key={app.id}
                    onClick={() => {
                      const guildId = app.guildId;
                      if (guildId) {
                        router.push(`/expert/guild/${guildId}?tab=membershipApplications&applicationId=${app.id}`);
                      }
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50 transition-all text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {app.candidateName || app.fullName || "Application"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {app.guildName || "Guild"} {app.jobTitle ? `· ${app.jobTitle}` : ""}
                      </p>
                    </div>
                    {app.totalStaked != null && (
                      <div className="flex items-center gap-1.5 ml-4 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                        <Coins className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-semibold text-primary">
                          {Number(app.totalStaked).toLocaleString()} VETD
                        </span>
                      </div>
                    )}
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
