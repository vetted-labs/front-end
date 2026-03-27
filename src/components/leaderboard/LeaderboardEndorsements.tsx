"use client";

import { Zap, Coins } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, getRankBadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatVetd } from "@/lib/utils";
import type { LeaderboardEntryV2 } from "@/types";

interface LeaderboardEndorsementsProps {
  entries: LeaderboardEntryV2[];
  currentWalletAddress?: string;
}

export function LeaderboardEndorsements({
  entries,
  currentWalletAddress,
}: LeaderboardEndorsementsProps) {
  const sorted = [...entries]
    .filter((e) => e.endorsementCount > 0)
    .sort((a, b) => {
      if (b.endorsementCount !== a.endorsementCount) return b.endorsementCount - a.endorsementCount;
      return parseFloat(b.totalBidAmount) - parseFloat(a.totalBidAmount);
    });

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={Zap}
        title="No endorsements yet"
        description="Endorsement rankings will appear once experts start endorsing candidates."
        className="py-12"
      />
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30 dark:bg-white/[0.02]">
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Expert
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-primary uppercase tracking-wider">
                Endorsements
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Bid
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Success Rate
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                Active Bids
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {sorted.map((entry, i) => {
              const isCurrentUser =
                !!currentWalletAddress &&
                entry.walletAddress.toLowerCase() === currentWalletAddress.toLowerCase();
              const bidVetd = parseFloat(entry.totalBidAmount);

              return (
                <tr
                  key={entry.expertId}
                  className={cn(
                    "transition-colors hover:bg-muted/30",
                    isCurrentUser && "bg-primary/[0.04] border-l-2 border-l-primary"
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{entry.fullName}</span>
                      {isCurrentUser && (
                        <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase">
                          You
                        </span>
                      )}
                      <Badge variant={getRankBadgeVariant(entry.role)} className="text-[9px] px-1.5 py-0 capitalize">
                        {entry.role}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-sm font-bold tabular-nums">{entry.endorsementCount}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-sm font-semibold tabular-nums">
                        {formatVetd(bidVetd)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm tabular-nums">
                      {entry.endorsementSuccessRate !== null
                        ? `${entry.endorsementSuccessRate.toFixed(0)}%`
                        : <span className="text-muted-foreground">N/A</span>
                      }
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {entry.activeEndorsementCount}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
