"use client";

import { Crown } from "lucide-react";
import type { LeaderboardEntryV2 } from "@/types";
import { truncateAddress } from "@/lib/utils";

interface LeaderboardPodiumProps {
  entries: LeaderboardEntryV2[];
  activeTab: string;
  currentWalletAddress?: string;
}

interface MetricConfig {
  label: string;
  getValue: (entry: LeaderboardEntryV2) => number;
  format: (value: number) => string;
}

const METRIC_CONFIG: Record<string, MetricConfig> = {
  overall: {
    label: "Reputation",
    getValue: (e) => e.reputation,
    format: (v) => v.toLocaleString(),
  },
  reputation: {
    label: "Reputation",
    getValue: (e) => e.reputation,
    format: (v) => v.toLocaleString(),
  },
  earnings: {
    label: "VETD Earned",
    getValue: (e) => e.totalEarnings,
    format: (v) => v.toLocaleString(),
  },
  reviews: {
    label: "Reviews",
    getValue: (e) => e.totalReviews,
    format: (v) => v.toLocaleString(),
  },
  consensus: {
    label: "Consensus",
    getValue: (e) => e.consensusRate,
    format: (v) => `${v.toFixed(1)}%`,
  },
  endorsements: {
    label: "Endorsements",
    getValue: (e) => e.endorsementCount,
    format: (v) => v.toLocaleString(),
  },
  trending: {
    label: "Weekly Delta",
    getValue: (e) => e.reputationDelta,
    format: (v) => (v >= 0 ? `+${v.toLocaleString()}` : v.toLocaleString()),
  },
};

function getDelta(entry: LeaderboardEntryV2, activeTab: string): number {
  if (activeTab === "earnings") return entry.earningsDelta;
  return entry.reputationDelta;
}

const RANK_STYLES = {
  1: {
    gradient: "from-[#f59e0b] to-[#d97706]",
    ring: "ring-[#f59e0b]/60",
    podiumHeight: "h-36",
    podiumBg: "from-[#f59e0b]/20 to-[#d97706]/10",
    podiumBorder: "border-[#f59e0b]/40",
    avatarSize: "w-20 h-20",
    avatarText: "text-xl",
    rankLabel: "text-[#f59e0b]",
    order: 2,
  },
  2: {
    gradient: "from-[#94a3b8] to-[#64748b]",
    ring: "ring-[#94a3b8]/60",
    podiumHeight: "h-24",
    podiumBg: "from-[#94a3b8]/20 to-[#64748b]/10",
    podiumBorder: "border-[#94a3b8]/40",
    avatarSize: "w-16 h-16",
    avatarText: "text-base",
    rankLabel: "text-[#94a3b8]",
    order: 1,
  },
  3: {
    gradient: "from-[#d97706] to-[#92400e]",
    ring: "ring-[#d97706]/60",
    podiumHeight: "h-16",
    podiumBg: "from-[#d97706]/20 to-[#92400e]/10",
    podiumBorder: "border-[#d97706]/40",
    avatarSize: "w-16 h-16",
    avatarText: "text-base",
    rankLabel: "text-[#d97706]",
    order: 3,
  },
} as const;

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface PodiumCardProps {
  entry: LeaderboardEntryV2;
  rank: 1 | 2 | 3;
  activeTab: string;
  isCurrentUser: boolean;
}

function PodiumCard({ entry, rank, activeTab, isCurrentUser }: PodiumCardProps) {
  const styles = RANK_STYLES[rank];
  const metricKey = activeTab === "overall" ? "reputation" : activeTab;
  const metric = METRIC_CONFIG[metricKey] ?? METRIC_CONFIG.reputation;
  const metricValue = metric.getValue(entry);
  const formattedValue = metric.format(metricValue);
  const delta = getDelta(entry, activeTab);
  const deltaPositive = delta >= 0;

  return (
    <div
      className="flex flex-col items-center gap-3"
      style={{ order: styles.order }}
    >
      {/* Crown for #1 */}
      {rank === 1 && (
        <Crown className="w-6 h-6 text-[#f59e0b] drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
      )}
      {rank !== 1 && <div className="w-6 h-6" />}

      {/* Card */}
      <div
        className={`
          relative flex flex-col items-center gap-2 px-4 py-4 rounded-2xl
          border backdrop-blur-md bg-card/60
          ${styles.podiumBorder}
          ${rank === 1 ? "w-44 shadow-xl shadow-[#f59e0b]/10" : "w-36 shadow-lg"}
          transition-transform hover:-translate-y-1 duration-200
        `}
      >
        {/* YOU badge */}
        {isCurrentUser && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
            YOU
          </span>
        )}

        {/* Rank label */}
        <span className={`text-xs font-bold uppercase tracking-widest ${styles.rankLabel}`}>
          #{rank}
        </span>

        {/* Avatar */}
        <div
          className={`
            ${styles.avatarSize} rounded-full
            bg-gradient-to-br ${styles.gradient}
            ring-2 ${styles.ring}
            flex items-center justify-center
            shadow-lg
          `}
        >
          <span className={`font-bold text-white ${styles.avatarText}`}>
            {getInitials(entry.fullName)}
          </span>
        </div>

        {/* Name */}
        <div className="text-center">
          <p
            className={`font-semibold text-foreground leading-tight ${
              rank === 1 ? "text-sm" : "text-xs"
            } max-w-[130px] truncate`}
          >
            {entry.fullName}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {truncateAddress(entry.walletAddress)}
          </p>
        </div>

        {/* Role & guilds */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md font-medium capitalize">
            {entry.role}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {entry.guildCount} guild{entry.guildCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Metric */}
        <div className="text-center mt-1">
          <p
            className={`font-bold tabular-nums ${
              rank === 1 ? "text-lg" : "text-base"
            } text-foreground`}
          >
            {formattedValue}
          </p>
          <p className="text-[10px] text-muted-foreground">{metric.label}</p>
        </div>

        {/* Delta */}
        <div
          className={`text-[11px] font-semibold tabular-nums ${
            deltaPositive ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {deltaPositive ? "+" : ""}
          {delta.toLocaleString()} this period
        </div>
      </div>

      {/* Podium platform */}
      <div
        className={`
          ${styles.podiumHeight} w-full rounded-t-lg
          bg-gradient-to-b ${styles.podiumBg}
          border-t border-x ${styles.podiumBorder}
          flex items-start justify-center pt-2
        `}
      >
        <span className={`text-2xl font-black ${styles.rankLabel} opacity-30 select-none`}>
          {rank}
        </span>
      </div>
    </div>
  );
}

export function LeaderboardPodium({
  entries,
  activeTab,
  currentWalletAddress,
}: LeaderboardPodiumProps) {
  const top3 = entries.slice(0, 3);

  if (top3.length === 0) return null;

  const [first, second, third] = top3;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm p-6 pb-0">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#f59e0b]/10 rounded-full blur-3xl" />
      </div>

      {/* Title row */}
      <div className="relative flex items-center justify-center gap-2 mb-6">
        <Crown className="w-5 h-5 text-[#f59e0b]" />
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Top Performers
        </h3>
        <Crown className="w-5 h-5 text-[#f59e0b]" />
      </div>

      {/* Podium layout: 2nd | 1st | 3rd */}
      <div className="relative flex items-end justify-center gap-4">
        {second && (
          <PodiumCard
            entry={second}
            rank={2}
            activeTab={activeTab}
            isCurrentUser={
              !!currentWalletAddress &&
              second.walletAddress.toLowerCase() === currentWalletAddress.toLowerCase()
            }
          />
        )}
        {first && (
          <PodiumCard
            entry={first}
            rank={1}
            activeTab={activeTab}
            isCurrentUser={
              !!currentWalletAddress &&
              first.walletAddress.toLowerCase() === currentWalletAddress.toLowerCase()
            }
          />
        )}
        {third && (
          <PodiumCard
            entry={third}
            rank={3}
            activeTab={activeTab}
            isCurrentUser={
              !!currentWalletAddress &&
              third.walletAddress.toLowerCase() === currentWalletAddress.toLowerCase()
            }
          />
        )}
      </div>
    </div>
  );
}
