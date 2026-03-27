"use client";

import { Crown } from "lucide-react";
import type { LeaderboardEntryV2 } from "@/types";
import { truncateAddress } from "@/lib/utils";
import { PODIUM_COLORS, STATUS_COLORS } from "@/config/colors";

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
    solid: PODIUM_COLORS[1].solid,
    ring: PODIUM_COLORS[1].ring,
    podiumHeight: "h-20",
    podiumBg: PODIUM_COLORS[1].platformSolid,
    podiumBorder: PODIUM_COLORS[1].border,
    avatarSize: "w-14 h-14",
    avatarText: "text-base",
    rankLabel: PODIUM_COLORS[1].label,
    order: 2,
  },
  2: {
    solid: PODIUM_COLORS[2].solid,
    ring: PODIUM_COLORS[2].ring,
    podiumHeight: "h-12",
    podiumBg: PODIUM_COLORS[2].platformSolid,
    podiumBorder: PODIUM_COLORS[2].border,
    avatarSize: "w-11 h-11",
    avatarText: "text-sm",
    rankLabel: PODIUM_COLORS[2].label,
    order: 1,
  },
  3: {
    solid: PODIUM_COLORS[3].solid,
    ring: PODIUM_COLORS[3].ring,
    podiumHeight: "h-8",
    podiumBg: PODIUM_COLORS[3].platformSolid,
    podiumBorder: PODIUM_COLORS[3].border,
    avatarSize: "w-11 h-11",
    avatarText: "text-sm",
    rankLabel: PODIUM_COLORS[3].label,
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
      className="flex flex-col items-center gap-2"
      style={{ order: styles.order }}
    >
      {/* Crown for #1 */}
      {rank === 1 && (
        <Crown className={`w-5 h-5 ${PODIUM_COLORS[1].label}`} />
      )}
      {rank !== 1 && <div className="w-5 h-5" />}

      {/* Card */}
      <div
        className={`
          relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl
          border bg-card
          ${styles.podiumBorder}
          ${rank === 1 ? "w-36 shadow-sm" : "w-28 shadow-sm"}
          transition-transform hover:-translate-y-1 duration-200
        `}
      >
        {/* YOU badge */}
        {isCurrentUser && (
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow">
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
            ${styles.solid}
            ring-2 ${styles.ring}
            flex items-center justify-center
            shadow-sm
          `}
        >
          <span className={`font-bold text-white ${styles.avatarText}`}>
            {getInitials(entry.fullName)}
          </span>
        </div>

        {/* Name */}
        <div className="text-center">
          <p
            className={`font-medium text-foreground leading-tight ${
              rank === 1 ? "text-xs" : "text-xs"
            } max-w-[110px] truncate`}
          >
            {entry.fullName}
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {truncateAddress(entry.walletAddress)}
          </p>
        </div>

        {/* Role & guilds */}
        <div className="flex items-center gap-1 flex-wrap justify-center">
          <span className="text-xs bg-muted text-muted-foreground px-1 py-px rounded font-medium capitalize">
            {entry.role}
          </span>
          <span className="text-xs text-muted-foreground">
            {entry.guildCount} guild{entry.guildCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Metric */}
        <div className="text-center">
          <p
            className={`font-bold tabular-nums ${
              rank === 1 ? "text-base" : "text-sm"
            } text-foreground`}
          >
            {formattedValue}
          </p>
          <p className="text-xs text-muted-foreground">{metric.label}</p>
        </div>

        {/* Delta */}
        <div
          className={`text-xs font-medium tabular-nums ${
            deltaPositive ? STATUS_COLORS.positive.text : STATUS_COLORS.negative.text
          }`}
        >
          {deltaPositive ? "+" : ""}
          {delta.toLocaleString()}
        </div>
      </div>

      {/* Podium platform */}
      <div
        className={`
          ${styles.podiumHeight} w-full rounded-t-lg
          ${styles.podiumBg}
          border-t border-x ${styles.podiumBorder}
          flex items-start justify-center pt-1
        `}
      >
        <span className={`text-lg font-bold ${styles.rankLabel} opacity-20 select-none`}>
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
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-card px-4 pt-4 pb-0">
      {/* Top accent */}

      {/* Podium layout: 2nd | 1st | 3rd */}
      <div className="relative flex items-end justify-center gap-3">
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
