"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { cn, truncateAddress } from "@/lib/utils";
import { getRankColors, STATUS_COLORS } from "@/config/colors";
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
};

function getRolePillClass(role: string): string {
  return getRankColors(role.toLowerCase()).badge;
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
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Expert
            </th>
            <th
              className={cn(
                "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                highlightCol === "reputation"
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground"
              )}
            >
              Reputation
            </th>
            <th
              className={cn(
                "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                highlightCol === "earnings"
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground"
              )}
            >
              Earnings
            </th>
            <th
              className={cn(
                "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                highlightCol === "reviews"
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground"
              )}
            >
              Reviews
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
              Staked
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
                onClick={() => router.push(`/experts/${entry.walletAddress}`)}
                className={cn(
                  "border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors",
                  isCurrentUser && "border border-primary/30 bg-primary/5 rounded-lg"
                )}
              >
                {/* Rank */}
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-muted-foreground tabular-nums">
                    {rank}
                  </span>
                </td>

                {/* Expert */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-bold leading-tight">
                      {entry.fullName || truncateAddress(entry.walletAddress)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full font-medium capitalize",
                          getRolePillClass(entry.role)
                        )}
                      >
                        {entry.role}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
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
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium tabular-nums">
                      {entry.reputation.toLocaleString()}
                    </span>
                    {delta !== 0 && (
                      <span
                        className={cn(
                          "text-xs font-medium tabular-nums",
                          delta > 0 ? STATUS_COLORS.positive.text : STATUS_COLORS.negative.text
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
                  <span className="text-sm font-medium tabular-nums">
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
                  <span className="text-sm font-medium tabular-nums">
                    {entry.totalReviews}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({entry.approvals}/{entry.rejections})
                    </span>
                  </span>
                </td>

                {/* Staked — hidden on mobile */}
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {parseFloat(entry.stakedAmount) > 0
                      ? `${Math.round(parseFloat(entry.stakedAmount) / 1e18).toLocaleString()} VETD`
                      : "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
