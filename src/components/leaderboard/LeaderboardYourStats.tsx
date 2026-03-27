"use client";

import { Trophy, Star, Coins, Users, Zap, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatVetd } from "@/lib/utils";
import type { LeaderboardEntryV2 } from "@/types";

interface LeaderboardYourStatsProps {
  currentUser: LeaderboardEntryV2 | null;
  rank: number;
}

export function LeaderboardYourStats({ currentUser, rank }: LeaderboardYourStatsProps) {
  if (!currentUser) return null;

  const stats = [
    { label: "Your Rank", value: `#${rank}`, icon: Trophy, color: "text-primary" },
    { label: "Reviews", value: String(currentUser.totalReviews), icon: Star, color: "text-primary" },
    { label: "Consensus", value: currentUser.consensusRate > 0 ? `${currentUser.consensusRate}%` : "N/A", icon: Users, color: "text-primary" },
    { label: "Earned", value: formatVetd(currentUser.totalEarnings), icon: Coins, color: "text-primary" },
    { label: "Endorsements", value: String(currentUser.endorsementCount), icon: Zap, color: "text-primary" },
    { label: "Staked", value: formatVetd(parseFloat(currentUser.stakedAmount) / 1e18), icon: Lock, color: "text-primary" },
  ];

  return (
    <Card className="border-primary/20 bg-primary/[0.03]" padding="none">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-primary/10">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
          <Trophy className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-xs font-medium text-foreground">Your Position</span>
        <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ml-1">
          You
        </span>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={cn(
              "px-4 py-3 flex items-center gap-2.5",
              i < stats.length - 1 && "border-r border-border"
            )}
          >
            <stat.icon className={cn("w-3.5 h-3.5 shrink-0", stat.color)} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                {stat.label}
              </p>
              <p className="text-sm font-bold tabular-nums">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
