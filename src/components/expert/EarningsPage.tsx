"use client";

import { useState, useEffect } from "react";
import { useWaitForTransactionReceipt } from "wagmi";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { formatEther } from "viem";
import { expertApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { useRewardClaiming } from "@/lib/hooks/useVettedContracts";
import { GuildSelector } from "@/components/ui/guild-selector";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isUserRejection, getTransactionErrorMessage } from "@/lib/blockchain";
import type {
  EarningsEntry,
  EarningsSummary,
  EarningsBreakdownResponse,
  TimeRange,
  PaginationInfo,
  ExpertProfile,
} from "@/types";

import { EarningsSummaryCards } from "@/components/expert/EarningsSummaryCards";
import { ClaimRewardsCard } from "@/components/expert/ClaimRewardsCard";
import { HowEarningsWork } from "@/components/expert/HowEarningsWork";
import { EarningsTimeline } from "@/components/expert/EarningsTimeline";

function getDateFrom(range: TimeRange): string | undefined {
  if (range === "all") return undefined;
  const now = new Date();
  if (range === "day") now.setDate(now.getDate() - 1);
  else if (range === "week") now.setDate(now.getDate() - 7);
  else if (range === "month") now.setMonth(now.getMonth() - 1);
  return now.toISOString();
}

export default function EarningsPage() {
  const { address: wagmiAddress } = useExpertAccount();
  const auth = useAuthContext();
  const address = wagmiAddress || auth.walletAddress;
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [items, setItems] = useState<EarningsEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [page, setPage] = useState(1);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [guildFilter, setGuildFilter] = useState<string>("all");
  const [claimTxHash, setClaimTxHash] = useState<`0x${string}` | undefined>();

  const { pendingRewards, totalClaimed, claimRewards, refetchAll } = useRewardClaiming();
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: claimFailed, error: claimError } = useWaitForTransactionReceipt({
    hash: claimTxHash,
  });

  // eslint-disable-next-line no-restricted-syntax -- reacts to blockchain transaction confirmation
  useEffect(() => {
    if (isConfirmed && claimTxHash) {
      toast.success("Rewards claimed successfully!");
      refetchAll();
      setClaimTxHash(undefined);
    }
  }, [isConfirmed, claimTxHash, refetchAll]);

  // eslint-disable-next-line no-restricted-syntax -- reacts to blockchain transaction failure
  useEffect(() => {
    if (claimFailed && claimTxHash) {
      toast.error(getTransactionErrorMessage(claimError, "Failed to claim rewards on-chain"));
      setClaimTxHash(undefined);
    }
  }, [claimFailed, claimTxHash, claimError]);

  const handleClaim = async () => {
    try {
      const hash = await claimRewards();
      setClaimTxHash(hash);
      toast.info("Transaction submitted. Waiting for confirmation...");
    } catch (err: unknown) {
      if (isUserRejection(err)) {
        toast.error("Transaction rejected");
      } else {
        toast.error("Failed to claim rewards");
      }
    }
  };

  const pendingAmount = pendingRewards ? formatEther(pendingRewards) : "0";
  const claimedAmount = totalClaimed ? formatEther(totalClaimed) : "0";
  const hasPending = pendingRewards !== undefined && pendingRewards > BigInt(0);

  const { isLoading: loading, refetch } = useFetch(
    async () => {
      if (!address) return null;
      const params: Record<string, string | number> = { page, limit: 20 };
      const dateFrom = getDateFrom(timeRange);
      if (dateFrom) params.dateFrom = dateFrom;
      if (guildFilter !== "all") params.guildId = guildFilter;

      const [earningsResult, profileResult] = await Promise.all([
        expertApi.getEarningsBreakdown(address, params) as Promise<EarningsBreakdownResponse>,
        expertApi.getProfile(address),
      ]);
      return { earningsResult, profileResult };
    },
    {
      skip: !address,
      onSuccess: (result) => {
        if (!result) return;
        setProfile(result.profileResult);
        const data = result.earningsResult;
        setSummary(data.summary || null);
        setItems(data.items?.items || []);
        setPagination(data.items?.pagination || null);
      },
      onError: () => {
        toast.error("Failed to load earnings data");
      },
    }
  );

  // eslint-disable-next-line no-restricted-syntax -- triggers re-fetch on filter/page change (useFetch doesn't support custom deps)
  useEffect(() => {
    if (address) {
      refetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch is stable, only re-run on filter/page/address change
  }, [timeRange, guildFilter, page, address]);

  // eslint-disable-next-line no-restricted-syntax -- subscribing to custom DOM event for cross-component state refresh
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("vetted:reputation-refresh", handler);
    return () => window.removeEventListener("vetted:reputation-refresh", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch is stable
  }, []);

  const handleTimeChange = (range: TimeRange) => {
    setTimeRange(range);
    setPage(1);
  };

  const handleGuildChange = (guild: string) => {
    setGuildFilter(guild);
    setPage(1);
  };

  if (!address) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <WalletRequiredState message="Connect your wallet to view earnings" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-label="Loading earnings">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Earnings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            VETD rewards from voting and endorsements
          </p>
        </div>

        {/* Summary cards */}
        <EarningsSummaryCards
          summary={summary}
          reputation={profile?.reputation ?? 0}
        />

        {/* Claim Rewards */}
        <ClaimRewardsCard
          pendingAmount={pendingAmount}
          claimedAmount={claimedAmount}
          hasPending={hasPending}
          isConfirming={isConfirming}
          claimTxHash={claimTxHash}
          onClaim={handleClaim}
        />

        {/* How It Works */}
        <HowEarningsWork />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-muted-foreground mr-1 flex-shrink-0" />
            {(["all", "day", "week", "month"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => handleTimeChange(range)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                  timeRange === range
                    ? "bg-primary/15 text-primary border-primary/40"
                    : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-primary/30"
                }`}
              >
                {range === "all" ? "All Time" : range === "day" ? "24h" : range === "week" ? "7d" : "30d"}
              </button>
            ))}
          </div>

          {summary?.byGuild && summary.byGuild.length > 1 && (
            <GuildSelector
              guilds={summary.byGuild.map((g) => ({ id: g.guildId, name: g.guildName }))}
              value={guildFilter}
              onChange={handleGuildChange}
              size="sm"
            />
          )}
        </div>

        {/* Timeline */}
        <EarningsTimeline
          items={items}
          pagination={pagination}
          page={page}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
