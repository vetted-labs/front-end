"use client";

import { useState, useEffect } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { expertApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";

import { useRewardClaiming } from "@/lib/hooks/useVettedContracts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GuildSelector } from "@/components/ui/guild-selector";
import {
  Loader2,
  Coins,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wallet,
  Vote,
  Award,
  Calendar,
  ArrowDownToLine,
  ExternalLink,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import type {
  EarningsEntry,
  EarningsSummary,
  TimeRange,
  PaginationInfo,
} from "@/types";

function getDateFrom(range: TimeRange): string | undefined {
  if (range === "all") return undefined;
  const now = new Date();
  if (range === "day") now.setDate(now.getDate() - 1);
  else if (range === "week") now.setDate(now.getDate() - 7);
  else if (range === "month") now.setMonth(now.getMonth() - 1);
  return now.toISOString();
}

function groupByDate(items: EarningsEntry[]): Record<string, EarningsEntry[]> {
  const groups: Record<string, EarningsEntry[]> = {};
  for (const item of items) {
    const key = new Date(item.created_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

const typeLabels: Record<string, string> = {
  voting_reward: "Voting Reward",
  endorsement: "Endorsement Reward",
};

const typeIcons: Record<string, typeof Vote> = {
  voting_reward: Vote,
  endorsement: Award,
};

export default function EarningsPage() {
  const { address } = useAccount();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [items, setItems] = useState<EarningsEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [guildFilter, setGuildFilter] = useState<string>("all");
  const [claimTxHash, setClaimTxHash] = useState<`0x${string}` | undefined>();
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const { pendingRewards, totalClaimed, claimRewards, refetchAll } = useRewardClaiming();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: claimTxHash,
  });

  // Refetch after confirmed
  useEffect(() => {
    if (isConfirmed && claimTxHash) {
      toast.success("Rewards claimed successfully!");
      refetchAll();
      setClaimTxHash(undefined);
    }
  }, [isConfirmed, claimTxHash, refetchAll]);

  const handleClaim = async () => {
    try {
      const hash = await claimRewards();
      setClaimTxHash(hash);
      toast.info("Transaction submitted. Waiting for confirmation...");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("User rejected")) {
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

      const result = await expertApi.getEarningsBreakdown(address, params);
      return result;
    },
    {
      skip: !address,
      onSuccess: (result) => {
        if (!result) return;
        const data = (result as unknown as Record<string, unknown>).data ?? result;
        const typedData = data as Record<string, unknown>;
        setSummary((typedData.summary as EarningsSummary) || null);
        const itemsData = typedData.items as Record<string, unknown> | undefined;
        setItems((itemsData?.items as EarningsEntry[]) || []);
        setPagination((itemsData?.pagination as PaginationInfo) || null);
      },
      onError: () => {
        toast.error("Failed to load earnings data");
      },
    }
  );

  // Refetch when filters or page change
  useEffect(() => {
    if (address) {
      refetch();
    }
  }, [timeRange, guildFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <Card className="max-w-md w-full text-center">
          <div className="p-12">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">Connect your wallet to view earnings.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return null;
  }

  const votingTotal = summary?.byType?.find((t) => t.type === "voting_reward")?.total ?? 0;
  const endorsementTotal = summary?.byType?.find((t) => t.type === "endorsement")?.total ?? 0;
  const grouped = groupByDate(items);

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card hover>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Coins className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Earned</p>
                <p className="text-2xl font-bold tabular-nums">{(summary?.totalVetd ?? 0).toFixed(2)}</p>
                <p className="text-[11px] text-muted-foreground/60">VETD</p>
              </div>
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Vote className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voting</p>
                <p className="text-2xl font-bold tabular-nums">{votingTotal.toFixed(2)}</p>
                <p className="text-[11px] text-muted-foreground/60">VETD</p>
              </div>
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Endorsements</p>
                <p className="text-2xl font-bold tabular-nums">{endorsementTotal.toFixed(2)}</p>
                <p className="text-[11px] text-muted-foreground/60">VETD</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Claim Rewards */}
        <Card padding="none" className="overflow-hidden">
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center flex-shrink-0">
                <ArrowDownToLine className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Withdraw to Wallet</p>
                <div className="flex items-baseline gap-3 mt-0.5">
                  <span className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {Number(pendingAmount).toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground/60">VETD claimable</span>
                </div>
                {Number(claimedAmount) > 0 && (
                  <p className="text-xs text-muted-foreground/60 mt-1 tabular-nums">
                    {Number(claimedAmount).toFixed(2)} VETD previously claimed
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                onClick={handleClaim}
                disabled={!hasPending || isConfirming}
                className="flex-1 sm:flex-none"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Claim Rewards
                  </>
                )}
              </Button>
              {claimTxHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${claimTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* How It Works */}
        <Card padding="none">
          <button
            onClick={() => setShowHowItWorks((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">How Earnings Work</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                showHowItWorks ? "rotate-180" : ""
              }`}
            />
          </button>

          {showHowItWorks && (
            <div className="px-5 pb-5 border-t border-border/40">
              <div className="grid sm:grid-cols-2 gap-6 pt-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Vetting Rewards
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    When your review score aligns closely with the guild consensus after a vetting is finalized, you earn VETD tokens. The closer your score to the consensus, the larger your reward. Rewards are proportional to your stake in the guild.
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Endorsement Rewards
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    When a candidate you endorsed gets hired, you receive a share of the endorsement reward pool. Endorsement rewards can be paid in stablecoins or $VETD tokens depending on the guild configuration.
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Claiming Rewards
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Earned VETD accumulates in the smart contract. Use the &quot;Claim Rewards&quot; button to withdraw claimable tokens to your wallet. This requires a blockchain transaction.
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Slashing Risk
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    If your scores deviate significantly from consensus, a portion of your staked VETD may be slashed. Stay aligned with the expert consensus to protect your stake and maximize rewards.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

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
        {items.length === 0 ? (
          <Card className="text-center">
            <div className="py-16">
              <Coins className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No earnings found for this period.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, entries]) => {
              return (
                <div key={date}>
                  {/* Day header */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{date}</p>
                  </div>

                  <Card padding="none">
                    <div className="divide-y divide-border/40 dark:divide-white/[0.04]">
                      {entries.map((entry, i) => {
                        const TypeIcon = typeIcons[entry.type] || Coins;
                        return (
                          <div key={i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-muted/30 dark:hover:bg-white/[0.02] transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                              <TypeIcon className="w-4 h-4 text-emerald-500" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  {typeLabels[entry.type] || entry.type}
                                </p>
                                {entry.guild_name && (
                                  <Badge variant="outline" className="text-[10px] font-normal">
                                    {entry.guild_name}
                                  </Badge>
                                )}
                              </div>
                              {entry.candidate_name && (
                                <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                                  {entry.candidate_name}
                                </p>
                              )}
                            </div>

                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                +{Number(entry.amount).toFixed(2)}
                              </p>
                              <p className="text-[10px] text-muted-foreground/40 tabular-nums">
                                {new Date(entry.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground tabular-nums">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
