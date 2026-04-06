"use client";

import { useState, useMemo } from "react";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { formatEther } from "viem";
import { hashToBytes32 } from "@/lib/blockchain";
import { Loader2, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { blockchainApi } from "@/lib/api";
import { toast } from "sonner";
import { useFetch } from "@/lib/hooks/useFetch";
import { buttonVariants } from "@/components/ui/button";
import { useTokenBalance } from "@/lib/hooks/useVettedContracts";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { StakingDonutChart } from "@/components/expert/StakingDonutChart";
import { getGuildHexColor, STATUS_COLORS } from "@/config/colors";
import type { GuildStakeInfo } from "@/types";

const StakingModal = dynamic(
  () =>
    import("@/components/dashboard/StakingModal").then((m) => ({
      default: m.StakingModal,
    })),
  { ssr: false }
);

/* ─── Types ────────────────────────────────────────────── */

interface UnstakeInfo {
  hasRequest: boolean;
  unlockTime?: string;
  amount?: string;
}

interface GuildPosition extends GuildStakeInfo {
  unstakeInfo?: UnstakeInfo;
}

/* ─── Helpers ──────────────────────────────────────────── */

function getGuildAbbreviation(name: string): string {
  const words = name.split(/[\s&,]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function getCooldownProgress(unlockTime: string): {
  percent: number;
  label: string;
} {
  const unlock = new Date(unlockTime).getTime();
  const now = Date.now();
  const totalCooldown = 7 * 24 * 60 * 60 * 1000;
  const remaining = Math.max(0, unlock - now);
  const elapsed = totalCooldown - remaining;
  const percent = Math.min(
    100,
    Math.max(0, (elapsed / totalCooldown) * 100)
  );

  if (remaining <= 0) return { percent: 100, label: "Ready" };

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor(
    (remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
  );
  return { percent, label: `${days}d ${hours}h` };
}

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

/* ─── Component ────────────────────────────────────────── */

export default function WithdrawalsPage() {
  const { address } = useExpertAccount();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState<string | undefined>();

  const { balance, refetchBalance } = useTokenBalance();

  const {
    data: guildStakes,
    isLoading: loadingStakes,
    refetch: refetchStakes,
  } = useFetch<GuildStakeInfo[]>(
    () => blockchainApi.getExpertGuildStakes(address!),
    {
      skip: !address,
      onError: (error) => {
        if (!error.includes("404")) {
          toast.error("Failed to load staking information");
        }
      },
    }
  );

  const guildsWithStakes = useMemo(
    () => (guildStakes || []).filter((g) => parseFloat(g.stakedAmount) > 0),
    [guildStakes]
  );

  const { data: unstakeMap } = useFetch<Record<string, UnstakeInfo>>(
    async () => {
      if (guildsWithStakes.length === 0) return {};
      const results = await Promise.all(
        guildsWithStakes.map(async (g) => {
          try {
            const info = await blockchainApi.getUnstakeRequestDetailed(
              address!,
              hashToBytes32(g.guildId)
            );
            return [g.guildId, info] as const;
          } catch {
            return [g.guildId, { hasRequest: false }] as const;
          }
        })
      );
      return Object.fromEntries(results);
    },
    { skip: !address || guildsWithStakes.length === 0 }
  );

  const positions: GuildPosition[] = useMemo(
    () =>
      guildsWithStakes.map((g) => ({
        ...g,
        unstakeInfo: unstakeMap?.[g.guildId],
      })),
    [guildsWithStakes, unstakeMap]
  );

  const totalStaked = useMemo(
    () => positions.reduce((sum, g) => sum + parseFloat(g.stakedAmount), 0),
    [positions]
  );

  const pendingUnstake = useMemo(() => {
    let totalAmount = 0;
    let earliestUnlock: string | null = null;
    for (const p of positions) {
      if (p.unstakeInfo?.hasRequest && p.unstakeInfo.amount) {
        totalAmount += parseFloat(p.unstakeInfo.amount);
        if (
          p.unstakeInfo.unlockTime &&
          (!earliestUnlock || p.unstakeInfo.unlockTime < earliestUnlock)
        ) {
          earliestUnlock = p.unstakeInfo.unlockTime;
        }
      }
    }
    return { totalAmount, earliestUnlock };
  }, [positions]);

  const availableBalance =
    balance !== undefined ? parseFloat(formatEther(balance)) : 0;

  const stakingRatio =
    availableBalance > 0
      ? ((totalStaked / (totalStaked + availableBalance)) * 100).toFixed(5)
      : "0";

  /* Sorted positions: highest stake first */
  const sortedPositions = useMemo(
    () =>
      [...positions].sort(
        (a, b) => parseFloat(b.stakedAmount) - parseFloat(a.stakedAmount)
      ),
    [positions]
  );

  /* Donut segments */
  const donutSegments = useMemo(
    () =>
      sortedPositions.map((g) => {
        const value = parseFloat(g.stakedAmount);
        return {
          label: g.guildName || g.guildId,
          value,
          color: getGuildHexColor(g.guildName || g.guildId),
          percentage: totalStaked > 0 ? (value / totalStaked) * 100 : 0,
        };
      }),
    [sortedPositions, totalStaked]
  );

  const handleGuildClick = (guildId: string) => {
    setSelectedGuildId(guildId);
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    refetchStakes();
    refetchBalance();
  };

  // ── No wallet ──
  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-muted-foreground mb-4">
            Please connect your wallet to manage your staking portfolio
          </p>
          <Link href="/expert/dashboard" className={cn(buttonVariants())}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loadingStakes) {
    return (
      <div
        className="flex items-center justify-center py-20"
        role="status"
        aria-label="Loading staking portfolio"
      >
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-page-enter">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/expert/dashboard" },
          { label: "Staking Portfolio" },
        ]}
      />

      {/* ── Lockup Info Banner ── */}
      <div className={`flex items-center gap-2 p-3 rounded-xl border mb-6 ${STATUS_COLORS.info.border} ${STATUS_COLORS.info.bgSubtle}`}>
        <Lock className={`w-4 h-4 flex-shrink-0 ${STATUS_COLORS.info.text}`} />
        <span className="text-sm text-muted-foreground">
          25% of your guild stake is locked during active reviews and cannot be unstaked until reviews are finalized.
        </span>
      </div>

      {/* ── Hero: Big Number ── */}
      <div className="mb-10 mt-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
          Total Staked Value
        </p>
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-5xl sm:text-6xl font-extrabold tracking-tighter tabular-nums">
            {formatCompactNumber(totalStaked)}
          </span>
          <span className="text-2xl font-semibold text-muted-foreground tracking-tight">
            VETD
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {positions.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {positions.length} active guild
              {positions.length !== 1 ? "s" : ""}
            </span>
          )}
          {pendingUnstake.totalAmount > 0 && pendingUnstake.earliestUnlock && (
            <span className="text-xs">
              {pendingUnstake.totalAmount.toFixed(2)} VETD pending &middot;{" "}
              {getCooldownProgress(pendingUnstake.earliestUnlock).label} left
            </span>
          )}
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-3 rounded-xl border border-border overflow-hidden mb-10">
        <div className="bg-card p-5 border-r border-border">
          <div className="text-xs text-muted-foreground mb-1.5 font-medium">
            Available Balance
          </div>
          <div className="text-lg font-bold tabular-nums tracking-tight font-mono">
            {formatCompactNumber(availableBalance)}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              VETD
            </span>
          </div>
        </div>
        <div className="bg-card p-5 border-r border-border">
          <div className="text-xs text-muted-foreground mb-1.5 font-medium">
            Pending Unstake
          </div>
          <div
            className={cn(
              "text-lg font-bold tabular-nums tracking-tight font-mono",
              pendingUnstake.totalAmount === 0 && "text-muted-foreground"
            )}
          >
            {pendingUnstake.totalAmount.toFixed(2)}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              VETD
            </span>
          </div>
        </div>
        <div className="bg-card p-5">
          <div className="text-xs text-muted-foreground mb-1.5 font-medium">
            Staking Ratio
          </div>
          <div className="text-lg font-bold tabular-nums tracking-tight font-mono text-primary">
            {stakingRatio}%
          </div>
        </div>
      </div>

      {/* ── Allocation Bar ── */}
      {sortedPositions.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Allocation
          </h2>
          {/* Stacked bar */}
          <div className="flex h-9 rounded-lg overflow-hidden gap-0.5 mb-4">
            {sortedPositions.map((g) => {
              const pct =
                totalStaked > 0
                  ? (parseFloat(g.stakedAmount) / totalStaked) * 100
                  : 0;
              return (
                <button
                  key={g.guildId}
                  onClick={() => handleGuildClick(g.guildId)}
                  className="transition-all hover:brightness-110 hover:scale-y-105 origin-center cursor-pointer"
                  style={{
                    width: `${pct}%`,
                    background: getGuildHexColor(g.guildName || g.guildId),
                    minWidth: pct > 0 ? 3 : 0,
                  }}
                  title={`${g.guildName}: ${parseFloat(g.stakedAmount).toFixed(2)} VETD (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {sortedPositions.map((g) => {
              const pct =
                totalStaked > 0
                  ? (parseFloat(g.stakedAmount) / totalStaked) * 100
                  : 0;
              const shortName = (g.guildName || g.guildId)
                .split(",")[0]
                .split("&")[0]
                .trim();
              return (
                <div
                  key={g.guildId}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{
                      background: getGuildHexColor(g.guildName || g.guildId),
                    }}
                  />
                  <span>{shortName}</span>
                  <span className="font-mono text-xs text-muted-foreground/60 tabular-nums">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Donut + Positions Grid ── */}
      {sortedPositions.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          No active stakes found across any guilds.{" "}
          <Link
            href="/expert/dashboard"
            className="text-primary hover:underline"
          >
            Go to Dashboard
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Left: Donut */}
          <div className="rounded-xl border border-border bg-card p-6 lg:sticky lg:top-6 flex flex-col items-center">
            <StakingDonutChart
              segments={donutSegments}
              totalValue={totalStaked.toFixed(0)}
              totalLabel="Total VETD"
            />
            {/* Mini legend */}
            <div className="w-full mt-4 flex flex-col divide-y divide-border">
              {sortedPositions.map((g) => {
                const pct =
                  totalStaked > 0
                    ? (parseFloat(g.stakedAmount) / totalStaked) * 100
                    : 0;
                const shortName = (g.guildName || g.guildId)
                  .split(",")[0]
                  .split("&")[0]
                  .trim();
                return (
                  <div
                    key={g.guildId}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-sm flex-shrink-0"
                        style={{
                          background: getGuildHexColor(
                            g.guildName || g.guildId
                          ),
                        }}
                      />
                      <span className="text-muted-foreground">
                        {shortName}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground/60 tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Positions list */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-base font-bold">Guild Positions</h2>
              <span className="text-xs text-muted-foreground">
                Click to manage stake
              </span>
            </div>
            <div className="flex flex-col">
              {sortedPositions.map((guild, index) => {
                const amount = parseFloat(guild.stakedAmount);
                const pct =
                  totalStaked > 0 ? (amount / totalStaked) * 100 : 0;
                const hasCooldown = guild.unstakeInfo?.hasRequest;
                const cooldown =
                  hasCooldown && guild.unstakeInfo?.unlockTime
                    ? getCooldownProgress(guild.unstakeInfo.unlockTime)
                    : null;
                const hexColor = getGuildHexColor(
                  guild.guildName || guild.guildId
                );

                return (
                  <button
                    key={guild.guildId}
                    onClick={() => handleGuildClick(guild.guildId)}
                    className="flex items-center gap-3.5 px-3 py-3.5 rounded-xl text-left transition-all hover:bg-muted/40 cursor-pointer group"
                  >
                    {/* Rank */}
                    <span className="w-5 text-center text-xs font-mono text-muted-foreground/50 tabular-nums">
                      {index + 1}
                    </span>

                    {/* Guild icon */}
                    <div
                      className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                      style={{
                        background: `${hexColor}1a`,
                        color: hexColor,
                      }}
                    >
                      {getGuildAbbreviation(
                        guild.guildName || guild.guildId
                      )}
                    </div>

                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold truncate">
                          {guild.guildName || guild.guildId}
                        </span>
                        {hasCooldown && (
                          <span className={`text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS.warning.bgSubtle} ${STATUS_COLORS.warning.text} px-1.5 py-0.5 rounded flex-shrink-0`}>
                            Cooldown
                          </span>
                        )}
                      </div>
                      <div className="h-[3px] bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: hexColor,
                            opacity: 0.6,
                          }}
                        />
                      </div>
                      {hasCooldown &&
                        guild.unstakeInfo?.amount &&
                        cooldown && (
                          <div className={`text-[11px] ${STATUS_COLORS.warning.text} mt-1`}>
                            Unstaking{" "}
                            {parseFloat(guild.unstakeInfo.amount).toFixed(2)}{" "}
                            VETD {" · "}
                            {cooldown.label} remaining
                          </div>
                        )}
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold tabular-nums font-mono">
                        {amount.toFixed(2)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          VETD
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground/50 tabular-nums">
                        {pct.toFixed(1)}%
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Staking Modal ── */}
      <StakingModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedGuildId(undefined);
        }}
        onSuccess={handleModalSuccess}
        preselectedGuildId={selectedGuildId}
        defaultMode="withdraw"
      />
    </div>
  );
}
