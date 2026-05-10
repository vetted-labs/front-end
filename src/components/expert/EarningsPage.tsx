"use client";

import { useState, useEffect, useMemo } from "react";
import { useWaitForTransactionReceipt } from "wagmi";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { formatEther } from "viem";
import { expertApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { useRewardClaiming } from "@/lib/hooks/useVettedContracts";
import { GuildSelector } from "@/components/ui/guild-selector";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Skeleton, SkeletonStatCard, SkeletonListItem } from "@/components/ui/skeleton";
import { DataSection } from "@/lib/motion";
import { toast } from "sonner";
import { isUserRejection, getTransactionErrorMessage } from "@/lib/blockchain";
import {
  TrendingUp,
  Coins,
  Wallet,
  CheckCircle2,
  Calendar,
  Download,
  Activity,
} from "lucide-react";
import type {
  EarningsEntry,
  EarningsSummary,
  EarningsBreakdownResponse,
  TimeRange,
  PaginationInfo,
  ExpertProfile,
} from "@/types";
import { getRewardTierProgress } from "@/types";

import { Button } from "@/components/ui/button";
import { ClaimRewardsCard } from "@/components/expert/ClaimRewardsCard";
import { HowEarningsWork } from "@/components/expert/HowEarningsWork";
import { EarningsTimeline } from "@/components/expert/EarningsTimeline";
import { EarningsChart } from "@/components/expert/EarningsChart";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";
import { withStoryLabEarnings } from "@/components/expert/story-lab/storyLabFixtures";
import { TOUR_TARGETS, dataTourTarget } from "@/components/expert/onboarding/tourTargets";
import { STATUS_COLORS, REWARD_TIER_COLORS } from "@/config/colors";
import { cn } from "@/lib/utils";

function exportEarningsCSV(data: EarningsEntry[]) {
  const headers = "Date,Type,Amount (VETD),Guild,Candidate\n";
  const rows = data.map(d =>
    [d.created_at, d.type, d.amount, d.guild_name || "", d.candidate_name || ""].join(",")
  ).join("\n");
  const blob = new Blob([headers + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vetted-earnings-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getDateFrom(range: TimeRange): string | undefined {
  if (range === "all") return undefined;
  const now = new Date();
  if (range === "day") now.setDate(now.getDate() - 1);
  else if (range === "week") now.setDate(now.getDate() - 7);
  else if (range === "month") now.setMonth(now.getMonth() - 1);
  return now.toISOString();
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  day: "24h",
  week: "7D",
  month: "30D",
  all: "All",
};

export default function EarningsPage() {
  const { address: wagmiAddress } = useExpertAccount();
  const auth = useAuthContext();
  const address = wagmiAddress || auth.walletAddress;
  const { isActive: isStoryLabPreview } = useStoryLabContext();
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing tx hash after on-chain confirmation is the synchronization point with wagmi
      setClaimTxHash(undefined);
    }
  }, [isConfirmed, claimTxHash, refetchAll]);

  // eslint-disable-next-line no-restricted-syntax -- reacts to blockchain transaction failure
  useEffect(() => {
    if (claimFailed && claimTxHash) {
      toast.error(getTransactionErrorMessage(claimError, "Failed to claim rewards on-chain"));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing tx hash after on-chain failure is the synchronization point with wagmi
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
        const rawSummary = data.summary || null;
        const rawItems = data.items?.items || [];
        const rawPagination = data.items?.pagination || null;
        if (isStoryLabPreview) {
          const injected = withStoryLabEarnings(rawSummary, rawItems, rawPagination);
          setSummary(injected.summary);
          setItems(injected.items);
          setPagination(injected.pagination);
        } else {
          setSummary(rawSummary);
          setItems(rawItems);
          setPagination(rawPagination);
        }
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

  // Derived stats
  const reputation = profile?.reputation ?? 0;
  const { tier } = getRewardTierProgress(reputation);
  const tierColors = REWARD_TIER_COLORS[tier.name] ?? REWARD_TIER_COLORS.Foundation;

  const totalVetd = summary?.totalVetd ?? 0;
  const votingTotal = summary?.byType?.find((t) => t.type === "voting_reward")?.total ?? 0;
  const endorsementTotal = summary?.byType?.find((t) => t.type === "endorsement")?.total ?? 0;

  const thisMonthEarnings = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return items
      .filter((e) => new Date(e.created_at).getTime() >= monthStart)
      .reduce((s, e) => s + Number(e.amount), 0);
  }, [items]);

  if (!address) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <WalletRequiredState message="Connect your wallet to view earnings" />
      </div>
    );
  }

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Eyebrow + display heading ── */}
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display mt-1.5">
            Earnings
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
            Track review income, pending payouts, and on-chain transactions across every guild you serve.
          </p>
        </div>

        {/* ── Hero summary ── */}
        <DataSection
          isLoading={loading}
          skeleton={
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
              <Skeleton className="h-44 rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
              </div>
            </div>
          }
        >
          <section
            className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4"
            {...dataTourTarget(TOUR_TARGETS.earningsSummary)}
          >
            {/* Total earned card */}
            <div className="rounded-xl border border-border bg-card p-6 sm:p-7 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/60" />
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Total Earned
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-bold font-display text-foreground tabular-nums leading-none">
                  {totalVetd.toFixed(2)}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">VETD</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Across reviews, endorsements, and protocol rewards.
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em]",
                    tierColors.bg,
                    tierColors.border,
                    tierColors.text,
                  )}
                >
                  {tier.name} · {tier.rewardWeight}× rewards
                </span>
                {hasPending && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]",
                      STATUS_COLORS.warning.badge,
                    )}
                  >
                    <Wallet className="w-3 h-3" />
                    {Number(pendingAmount).toFixed(2)} VETD pending
                  </span>
                )}
                {thisMonthEarnings > 0 && (
                  <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", STATUS_COLORS.positive.text)}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{thisMonthEarnings.toFixed(2)} VETD this month
                  </span>
                )}
              </div>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3">
              <KpiTile
                icon={<Wallet className="w-4 h-4" />}
                label="Pending"
                value={`${Number(pendingAmount).toFixed(2)}`}
                tone="warning"
              />
              <KpiTile
                icon={<CheckCircle2 className="w-4 h-4" />}
                label="Claimed"
                value={`${Number(claimedAmount).toFixed(2)}`}
                tone="positive"
              />
              <KpiTile
                icon={<Activity className="w-4 h-4" />}
                label="Voting"
                value={votingTotal.toFixed(2)}
                tone="primary"
              />
              <KpiTile
                icon={<Coins className="w-4 h-4" />}
                label="Endorsements"
                value={endorsementTotal.toFixed(2)}
                tone="info"
              />
            </div>
          </section>
        </DataSection>

        {/* ── Two-column workspace: chart + sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Filter pills */}
            <div className="flex flex-wrap items-center justify-between gap-3" {...dataTourTarget(TOUR_TARGETS.earningsFilters)}>
              <div className="flex gap-2 p-1 rounded-xl bg-muted/30 border border-border">
                {(["day", "week", "month", "all"] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => handleTimeChange(range)}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium rounded-lg border transition-all duration-200",
                      timeRange === range
                        ? "text-primary bg-primary/[0.08] border-primary/20"
                        : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/40",
                    )}
                  >
                    {TIME_RANGE_LABELS[range]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {summary?.byGuild && summary.byGuild.length > 1 && (
                  <GuildSelector
                    guilds={summary.byGuild.map((g) => ({ id: g.guildId, name: g.guildName }))}
                    value={guildFilter}
                    onChange={handleGuildChange}
                    size="sm"
                  />
                )}
                {items.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => exportEarningsCSV(items)}>
                    <Download className="w-4 h-4 mr-1" /> Export CSV
                  </Button>
                )}
              </div>
            </div>

            {/* Earnings chart */}
            <DataSection
              isLoading={loading}
              skeleton={<Skeleton className="h-64 w-full rounded-xl" />}
            >
              <Section icon={<TrendingUp className="w-3.5 h-3.5" />} title="Earnings Over Time">
                <EarningsChart items={items} />
              </Section>
            </DataSection>

            {/* Recent earnings */}
            <DataSection
              isLoading={loading}
              skeleton={
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonListItem key={i} />
                  ))}
                </div>
              }
            >
              <EarningsTimeline
                items={items}
                pagination={pagination}
                page={page}
                onPageChange={setPage}
              />
            </DataSection>
          </div>

          {/* ── Right sticky rail ── */}
          <aside className="lg:col-span-1 lg:sticky lg:top-6 lg:self-start space-y-4">
            <ClaimRewardsCard
              pendingAmount={pendingAmount}
              claimedAmount={claimedAmount}
              hasPending={hasPending}
              isConfirming={isConfirming}
              claimTxHash={claimTxHash}
              onClaim={handleClaim}
            />

            {/* By-guild breakdown */}
            {summary?.byGuild && summary.byGuild.length > 0 && (
              <SidebarCard title="By Guild">
                <div className="space-y-3">
                  {summary.byGuild.slice(0, 5).map((g) => {
                    const pct = totalVetd > 0 ? (g.total / totalVetd) * 100 : 0;
                    return (
                      <div key={g.guildId}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-foreground truncate">
                            {g.guildName}
                          </span>
                          <span className="text-xs tabular-nums font-mono text-muted-foreground">
                            {g.total.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted/40">
                          <div
                            className="h-full bg-primary/70 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SidebarCard>
            )}

            <SidebarCard title="At a glance">
              <KeyValue
                icon={<Calendar className="w-3.5 h-3.5" />}
                label="This month"
                value={`${thisMonthEarnings.toFixed(2)} VETD`}
              />
              <KeyValue
                icon={<Activity className="w-3.5 h-3.5" />}
                label="Reviews"
                value={`${profile?.reviewCount ?? 0}`}
              />
              <KeyValue
                icon={<Coins className="w-3.5 h-3.5" />}
                label="Endorsements"
                value={`${profile?.endorsementCount ?? 0}`}
              />
            </SidebarCard>

            <HowEarningsWork />
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ── Inline helpers ─────────────────────────────────────────────── */

function Section({
  icon,
  title,
  meta,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {meta && (
          <span className="text-[11px] text-muted-foreground tabular-nums">{meta}</span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
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
        <p className="text-sm text-foreground font-medium leading-snug tabular-nums">{value}</p>
      </div>
    </div>
  );
}

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "positive" | "info" | "warning";
}

const KPI_TONE: Record<KpiTileProps["tone"], { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  positive: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  info: { bg: "bg-sky-500/10", text: "text-sky-500" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-500" },
};

function KpiTile({ icon, label, value, tone }: KpiTileProps) {
  const t = KPI_TONE[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
      <span
        className={cn(
          "w-9 h-9 rounded-lg grid place-items-center flex-shrink-0",
          t.bg,
          t.text,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-xl font-bold text-foreground tabular-nums leading-tight mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}
