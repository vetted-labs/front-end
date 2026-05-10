"use client";

import { useState, useMemo } from "react";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { formatEther } from "viem";
import { hashToBytes32 } from "@/lib/blockchain";
import {
  Loader2,
  Clock,
  Wallet,
  ArrowDownToLine,
  Activity,
  TrendingUp,
  PieChart,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { blockchainApi } from "@/lib/api";
import { toast } from "sonner";
import { useFetch } from "@/lib/hooks/useFetch";
import { Button, buttonVariants } from "@/components/ui/button";
import { useTokenBalance } from "@/lib/hooks/useVettedContracts";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { STATUS_COLORS } from "@/config/colors";
import { GuildBadge } from "@/components/ui/guild";
import type { GuildStakeInfo } from "@/types";
import { PositionRow } from "./withdrawals/PositionRow";
import { ClaimCard } from "./withdrawals/ClaimCard";

const StakingModal = dynamic(
  () =>
    import("@/components/dashboard/StakingModal").then((m) => ({
      default: m.StakingModal,
    })),
  { ssr: false },
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

function getCooldownProgress(unlockTime: string): {
  percent: number;
  label: string;
} {
  const unlock = new Date(unlockTime).getTime();
  const now = Date.now();
  const totalCooldown = 7 * 24 * 60 * 60 * 1000;
  const remaining = Math.max(0, unlock - now);
  const elapsed = totalCooldown - remaining;
  const percent = Math.min(100, Math.max(0, (elapsed / totalCooldown) * 100));

  if (remaining <= 0) return { percent: 100, label: "Ready" };

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  return { percent, label: `${days}d ${hours}h` };
}

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

const PORTFOLIO_COLORS = [
  "#F97316",
  "#EA580C",
  "#C2410C",
  "#FB923C",
  "#FDBA74",
  "#B45309",
  "#92400E",
  "#FED7AA",
] as const;

function getPortfolioColor(index: number): string {
  return PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length];
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
    },
  );

  const guildsWithStakes = useMemo(
    () => (guildStakes || []).filter((g) => parseFloat(g.stakedAmount) > 0),
    [guildStakes],
  );

  const { data: unstakeMap } = useFetch<Record<string, UnstakeInfo>>(
    async () => {
      if (guildsWithStakes.length === 0) return {};
      const results = await Promise.all(
        guildsWithStakes.map(async (g) => {
          try {
            const info = await blockchainApi.getUnstakeRequestDetailed(
              address!,
              hashToBytes32(g.guildId),
            );
            return [g.guildId, info] as const;
          } catch {
            return [g.guildId, { hasRequest: false }] as const;
          }
        }),
      );
      return Object.fromEntries(results);
    },
    { skip: !address || guildsWithStakes.length === 0 },
  );

  const positions: GuildPosition[] = useMemo(
    () =>
      guildsWithStakes.map((g) => ({
        ...g,
        unstakeInfo: unstakeMap?.[g.guildId],
      })),
    [guildsWithStakes, unstakeMap],
  );

  const totalStaked = useMemo(
    () => positions.reduce((sum, g) => sum + parseFloat(g.stakedAmount), 0),
    [positions],
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

  // Ready amount is derived during render (uses Date.now via getCooldownProgress).
  let readyAmount = 0;
  for (const p of positions) {
    if (
      p.unstakeInfo?.hasRequest &&
      p.unstakeInfo.amount &&
      p.unstakeInfo.unlockTime &&
      getCooldownProgress(p.unstakeInfo.unlockTime).percent === 100
    ) {
      readyAmount += parseFloat(p.unstakeInfo.amount);
    }
  }

  const availableBalance =
    balance !== undefined ? parseFloat(formatEther(balance)) : 0;

  const stakingRatio =
    availableBalance > 0
      ? ((totalStaked / (totalStaked + availableBalance)) * 100).toFixed(2)
      : "0";

  /* Sorted positions: highest stake first */
  const sortedPositions = useMemo(
    () =>
      [...positions].sort(
        (a, b) => parseFloat(b.stakedAmount) - parseFloat(a.stakedAmount),
      ),
    [positions],
  );

  const handleGuildClick = (guildId: string) => {
    setSelectedGuildId(guildId);
    setModalOpen(true);
  };

  const handleStartWithdrawal = () => {
    setSelectedGuildId(undefined);
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

  const cooldownLabel = pendingUnstake.earliestUnlock
    ? getCooldownProgress(pendingUnstake.earliestUnlock).label
    : null;
  const hasReadyToClaim = readyAmount > 0;

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/expert/dashboard" },
            { label: "Withdrawals" },
          ]}
        />

        {/* ── Eyebrow + display heading ── */}
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Earnings
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display mt-1.5">
            Withdrawals
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
            Manage your staked VETD across guilds — request unstakes, watch
            cooldowns, and withdraw to your wallet when ready.
          </p>
        </div>

        {/* ── Hero summary card ── */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/60" />
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_auto] gap-6 items-end">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Total staked
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-bold font-display text-foreground tabular-nums leading-none">
                  {formatCompactNumber(totalStaked)}
                </span>
                <span className="text-base font-semibold text-muted-foreground">
                  VETD
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Across {positions.length} guild
                {positions.length === 1 ? "" : "s"} ·{" "}
                {availableBalance.toFixed(2)} VETD free in wallet.
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {positions.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.18em]">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {positions.length} active position
                    {positions.length !== 1 ? "s" : ""}
                  </span>
                )}
                {hasReadyToClaim && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]",
                      STATUS_COLORS.positive.badge,
                    )}
                  >
                    <ArrowDownToLine className="w-3 h-3" />
                    {readyAmount.toFixed(2)} VETD ready
                  </span>
                )}
                {pendingUnstake.totalAmount > 0 && !hasReadyToClaim && cooldownLabel && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]",
                      STATUS_COLORS.warning.badge,
                    )}
                  >
                    <Clock className="w-3 h-3" />
                    {cooldownLabel} until ready
                  </span>
                )}
              </div>
            </div>

            {/* Primary CTA */}
            <div className="flex flex-col gap-2 lg:items-end">
              <Button
                onClick={handleStartWithdrawal}
                disabled={positions.length === 0}
                icon={<ArrowDownToLine className="w-4 h-4" />}
                className="w-full lg:w-auto"
              >
                Start withdrawal
              </Button>
              {pendingUnstake.totalAmount > 0 && (
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {pendingUnstake.totalAmount.toFixed(2)} VETD currently queued
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── KPI strip ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile
            icon={<Clock className="w-4 h-4" />}
            label="Pending unstake"
            value={pendingUnstake.totalAmount.toFixed(2)}
            tone="warning"
          />
          <KpiTile
            icon={<Wallet className="w-4 h-4" />}
            label="Available"
            value={formatCompactNumber(availableBalance)}
            tone="positive"
          />
          <KpiTile
            icon={<ArrowDownToLine className="w-4 h-4" />}
            label="Ready to claim"
            value={readyAmount.toFixed(2)}
            tone="primary"
          />
          <KpiTile
            icon={<PieChart className="w-4 h-4" />}
            label="Staking ratio"
            value={`${stakingRatio}%`}
            tone="info"
          />
        </section>

        {/* ── Two-column workspace ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Allocation */}
            {sortedPositions.length > 0 && (
              <Section
                icon={<PieChart className="w-3.5 h-3.5" />}
                title="Allocation"
                meta={`${sortedPositions.length} position${sortedPositions.length === 1 ? "" : "s"}`}
              >
                <div className="flex h-8 rounded-md overflow-hidden gap-px mb-4 bg-border">
                  {sortedPositions.map((g, index) => {
                    const pct =
                      totalStaked > 0
                        ? (parseFloat(g.stakedAmount) / totalStaked) * 100
                        : 0;
                    const color = getPortfolioColor(index);
                    return (
                      <button
                        key={g.guildId}
                        onClick={() => handleGuildClick(g.guildId)}
                        className="transition-all hover:brightness-110 hover:scale-y-[1.03] origin-center cursor-pointer"
                        style={{
                          width: `${pct}%`,
                          background: color,
                          minWidth: pct > 0 ? 3 : 0,
                        }}
                        title={`${g.guildName || g.guildId}: ${parseFloat(g.stakedAmount).toFixed(2)} VETD (${pct.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                  {sortedPositions.map((g, index) => {
                    const pct =
                      totalStaked > 0
                        ? (parseFloat(g.stakedAmount) / totalStaked) * 100
                        : 0;
                    return (
                      <div
                        key={g.guildId}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ background: getPortfolioColor(index) }}
                        />
                        <GuildBadge guild={g.guildName || g.guildId} size="xs" />
                        <span className="font-mono text-xs text-muted-foreground/60 tabular-nums">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Withdrawal history / positions */}
            <Section
              icon={<Activity className="w-3.5 h-3.5" />}
              title="Guild positions"
              meta={
                sortedPositions.length > 0
                  ? "Click to manage"
                  : undefined
              }
            >
              {sortedPositions.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No active stakes found across any guilds.
                  </p>
                  <Link
                    href="/expert/dashboard"
                    className="text-sm text-primary hover:underline mt-2 inline-block"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              ) : (
                <div className="-mx-5 -my-5 divide-y divide-border">
                  {sortedPositions.map((guild, index) => {
                    const cooldown = guild.unstakeInfo?.unlockTime
                      ? getCooldownProgress(guild.unstakeInfo.unlockTime)
                      : null;
                    return (
                      <PositionRow
                        key={guild.guildId}
                        guild={guild}
                        index={index}
                        totalStaked={totalStaked}
                        hexColor={getPortfolioColor(index)}
                        cooldown={cooldown}
                        onClick={() => handleGuildClick(guild.guildId)}
                      />
                    );
                  })}
                </div>
              )}
            </Section>
          </div>

          {/* ── Right sticky rail ── */}
          <aside className="lg:col-span-1 lg:sticky lg:top-6 lg:self-start space-y-4">
            <ClaimCard
              readyAmount={readyAmount}
              pendingTotal={pendingUnstake.totalAmount}
              cooldownLabel={cooldownLabel}
              hasPositions={positions.length > 0}
              onWithdraw={handleStartWithdrawal}
            />

            {/* Account info */}
            <SidebarCard title="Account">
              <KeyValue
                icon={<Wallet className="w-3.5 h-3.5" />}
                label="Wallet balance"
                value={`${availableBalance.toFixed(2)} VETD`}
              />
              <KeyValue
                icon={<TrendingUp className="w-3.5 h-3.5" />}
                label="Total staked"
                value={`${totalStaked.toFixed(2)} VETD`}
              />
              <KeyValue
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Pending unstake"
                value={`${pendingUnstake.totalAmount.toFixed(2)} VETD`}
              />
              <KeyValue
                icon={<PieChart className="w-3.5 h-3.5" />}
                label="Staking ratio"
                value={`${stakingRatio}%`}
              />
            </SidebarCard>
          </aside>
        </div>

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
        <p className="text-sm text-foreground font-medium leading-snug tabular-nums">
          {value}
        </p>
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
