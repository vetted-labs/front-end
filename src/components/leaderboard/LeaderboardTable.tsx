"use client";

import { useRouter } from "next/navigation";
import { Users, Flame, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn, truncateAddress } from "@/lib/utils";
import type { LeaderboardEntryV2 } from "@/types";

interface LeaderboardTableProps {
  entries: LeaderboardEntryV2[];
  activeTab: string;
  currentWalletAddress?: string;
}

const SORT_COLUMN_MAP: Record<string, string> = {
  overall: "reputation",
  earnings: "earnings",
  reputation: "reputation",
  reviews: "reviews",
  consensus: "consensus",
};

const ROLE_PILL_COLORS: Record<string, string> = {
  master: "bg-yellow-500/20 text-yellow-400",
  officer: "bg-purple-500/20 text-purple-400",
  craftsman: "bg-blue-500/20 text-blue-400",
  recruit: "bg-slate-500/20 text-slate-400",
};

function getRolePillClass(role: string): string {
  return ROLE_PILL_COLORS[role.toLowerCase()] ?? "bg-slate-500/20 text-slate-400";
}

function getConsensusBarColor(rate: number): string {
  if (rate >= 70) return "bg-emerald-500";
  if (rate >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

export function LeaderboardTable({
  entries,
  activeTab,
  currentWalletAddress,
}: LeaderboardTableProps) {
  const router = useRouter();
  const highlightCol = SORT_COLUMN_MAP[activeTab] ?? "reputation";

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/40">
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Expert
            </th>
            <th
              className={cn(
                "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider",
                highlightCol === "reputation"
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground"
              )}
            >
              Reputation
            </th>
            <th
              className={cn(
                "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider",
                highlightCol === "earnings"
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground"
              )}
            >
              Earnings
            </th>
            <th
              className={cn(
                "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider",
                highlightCol === "reviews"
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground"
              )}
            >
              Reviews
            </th>
            <th
              className={cn(
                "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider",
                highlightCol === "consensus"
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground"
              )}
            >
              Consensus
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
              Staked
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell w-16">
              Trend
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const rank = i + 1;
            const isCurrentUser =
              !!currentWalletAddress &&
              entry.walletAddress.toLowerCase() === currentWalletAddress.toLowerCase();
            const delta = entry.reputationDelta;

            return (
              <tr
                key={entry.expertId}
                onClick={() => router.push(`/expert/profile/${entry.expertId}`)}
                className={cn(
                  "border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors",
                  isCurrentUser && "border border-primary/30 bg-primary/5 rounded-lg"
                )}
              >
                {/* Rank */}
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                    {rank}
                  </span>
                </td>

                {/* Expert */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold leading-tight">
                      {entry.fullName || truncateAddress(entry.walletAddress)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                          getRolePillClass(entry.role)
                        )}
                      >
                        {entry.role}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Users className="w-2.5 h-2.5" />
                        {entry.guildCount}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Reputation */}
                <td
                  className={cn(
                    "px-4 py-3",
                    highlightCol === "reputation" && "bg-primary/5"
                  )}
                >
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-semibold tabular-nums">
                      {entry.reputation.toLocaleString()}
                    </span>
                    {delta !== 0 && (
                      <span
                        className={cn(
                          "text-[10px] font-medium tabular-nums",
                          delta > 0 ? "text-emerald-500" : "text-rose-400"
                        )}
                      >
                        {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
                      </span>
                    )}
                  </div>
                </td>

                {/* Earnings */}
                <td
                  className={cn(
                    "px-4 py-3",
                    highlightCol === "earnings" && "bg-primary/5"
                  )}
                >
                  <span className="text-sm font-semibold tabular-nums">
                    {entry.totalEarnings.toLocaleString()} VETD
                  </span>
                </td>

                {/* Reviews */}
                <td
                  className={cn(
                    "px-4 py-3",
                    highlightCol === "reviews" && "bg-primary/5"
                  )}
                >
                  <span className="text-sm font-semibold tabular-nums">
                    {entry.totalReviews}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({entry.approvals}/{entry.rejections})
                    </span>
                  </span>
                </td>

                {/* Consensus */}
                <td
                  className={cn(
                    "px-4 py-3",
                    highlightCol === "consensus" && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", getConsensusBarColor(entry.consensusRate))}
                        style={{ width: `${Math.min(entry.consensusRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {entry.consensusRate}%
                    </span>
                  </div>
                </td>

                {/* Staked — hidden on mobile */}
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {entry.stakedAmount} VETD
                  </span>
                </td>

                {/* Trend — hidden on mobile */}
                <td className="px-4 py-3 text-center hidden md:table-cell">
                  {entry.streak > 2 ? (
                    <Flame className="w-4 h-4 text-orange-500 inline-block" />
                  ) : delta > 0 ? (
                    <ArrowUp className="w-4 h-4 text-emerald-500 inline-block" />
                  ) : delta < 0 ? (
                    <ArrowDown className="w-4 h-4 text-rose-400 inline-block" />
                  ) : (
                    <Minus className="w-4 h-4 text-muted-foreground/40 inline-block" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
