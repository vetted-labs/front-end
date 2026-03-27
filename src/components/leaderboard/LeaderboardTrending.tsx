"use client";

import { Flame, TrendingUp, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, getRankBadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { LeaderboardEntryV2 } from "@/types";

interface LeaderboardTrendingProps {
  entries: LeaderboardEntryV2[];
  currentWalletAddress?: string;
}

export function LeaderboardTrending({
  entries,
  currentWalletAddress,
}: LeaderboardTrendingProps) {
  const climbers = [...entries]
    .filter((e) => e.reputationDelta > 0)
    .sort((a, b) => b.reputationDelta - a.reputationDelta)
    .slice(0, 10);

  const streakers = [...entries]
    .filter((e) => e.streak > 1)
    .sort((a, b) => b.streak - a.streak);

  const maxDelta = climbers[0]?.reputationDelta ?? 1;

  if (climbers.length === 0 && streakers.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No trending activity"
        description="Check back when experts start earning reputation this period."
        className="py-12"
      />
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Biggest Climbers */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <h3 className="text-sm font-semibold">Biggest Climbers</h3>
        </div>

        {climbers.length === 0 ? (
          <Card className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No climbers this period</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {climbers.map((entry, i) => {
              const isCurrentUser =
                !!currentWalletAddress &&
                entry.walletAddress.toLowerCase() === currentWalletAddress.toLowerCase();
              const barWidth = Math.max((entry.reputationDelta / maxDelta) * 100, 8);

              return (
                <Card
                  key={entry.expertId}
                  padding="none"
                  className={cn(isCurrentUser && "border-primary/20 bg-primary/[0.03]")}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground tabular-nums w-5">
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold truncate">{entry.fullName}</span>
                        {isCurrentUser && (
                          <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase">
                            You
                          </span>
                        )}
                        <Badge variant={getRankBadgeVariant(entry.role)} className="text-[9px] px-1.5 py-0 capitalize shrink-0">
                          {entry.role}
                        </Badge>
                      </div>
                      <span className="text-sm font-bold text-emerald-500 tabular-nums shrink-0 ml-2">
                        +{entry.reputationDelta}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 dark:bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Hot Streaks */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <h3 className="text-sm font-semibold">Hot Streaks</h3>
        </div>

        {streakers.length === 0 ? (
          <Card className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No active streaks</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {streakers.map((entry) => {
              const isCurrentUser =
                !!currentWalletAddress &&
                entry.walletAddress.toLowerCase() === currentWalletAddress.toLowerCase();
              const fires = Math.min(entry.streak, 5);

              return (
                <Card
                  key={entry.expertId}
                  padding="none"
                  className={cn(isCurrentUser && "border-primary/20 bg-primary/[0.03]")}
                >
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm">
                        {Array.from({ length: fires }).map((_, j) => (
                          <Flame key={j} className="w-3.5 h-3.5 text-orange-500 inline-block" />
                        ))}
                      </span>
                      <span className="text-sm font-semibold truncate">{entry.fullName}</span>
                      {isCurrentUser && (
                        <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs font-bold text-orange-500 tabular-nums">
                        {entry.streak}w streak
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {entry.reputation.toLocaleString()} rep
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
