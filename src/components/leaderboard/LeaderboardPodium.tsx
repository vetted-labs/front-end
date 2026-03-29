"use client";

import type { LeaderboardEntryV2 } from "@/types";
import { truncateAddress } from "@/lib/utils";
import { PODIUM_COLORS, STATUS_COLORS } from "@/config/colors";
import { getPersonAvatar } from "@/lib/avatars";

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
  const colors = PODIUM_COLORS[rank];
  const metricKey = activeTab === "overall" ? "reputation" : activeTab;
  const metric = METRIC_CONFIG[metricKey] ?? METRIC_CONFIG.reputation;
  const metricValue = metric.getValue(entry);
  const formattedValue = metric.format(metricValue);
  const delta = getDelta(entry, activeTab);
  const deltaPositive = delta >= 0;

  return (
    <div
      className={`relative bg-card rounded-xl border p-6 text-center ${
        rank === 1 ? "border-primary" : "border-border"
      }`}
    >
      {/* YOU badge */}
      {isCurrentUser && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
          YOU
        </span>
      )}

      {/* Rank */}
      <p className="text-3xl font-bold text-primary tabular-nums">#{rank}</p>

      {/* Avatar */}
      <img
        src={getPersonAvatar(entry.fullName)}
        alt={entry.fullName}
        className={`mx-auto mt-3 w-12 h-12 rounded-full object-cover ring-2 ${colors.ring || "ring-border"} bg-muted`}
      />

      {/* Name */}
      <p className="text-sm font-bold text-foreground mt-3 truncate">
        {entry.fullName}
      </p>
      <p className="text-xs text-muted-foreground font-mono mt-0.5">
        {truncateAddress(entry.walletAddress)}
      </p>

      {/* Role & guilds */}
      <div className="flex items-center gap-2 justify-center mt-2">
        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium capitalize">
          {entry.role}
        </span>
        <span className="text-xs text-muted-foreground">
          {entry.guildCount} guild{entry.guildCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Metric */}
      <p className="text-xl font-bold text-foreground tabular-nums mt-3">
        {formattedValue}
      </p>
      <p className="text-xs text-muted-foreground">{metric.label}</p>

      {/* Delta */}
      <p
        className={`text-xs font-medium tabular-nums mt-1 ${
          deltaPositive ? STATUS_COLORS.positive.text : STATUS_COLORS.negative.text
        }`}
      >
        {deltaPositive ? "+" : ""}
        {delta.toLocaleString()}
      </p>
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
    <div className="grid grid-cols-3 gap-4">
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
  );
}
