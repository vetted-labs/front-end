"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  Users,
  Award,
} from "lucide-react";

/** Format a number with K/M/B suffixes. Shows up to 2 decimal places. */
function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2).replace(/\.?0+$/, '')}K`;
  return value.toFixed(2).replace(/\.?0+$/, '');
}

interface EndorsementStatsGridProps {
  /** Staked amount as a formatted string (e.g. "100") */
  userStake: string;
  /** Number of endorsements the user has in this guild */
  userEndorsementsCount: number;
  /** Number of applications available in this guild */
  applicationsCount: number;
  /** Minimum bid as a formatted string (e.g. "1") */
  minimumBid: string;
}

export function EndorsementStatsGrid({
  userStake,
  userEndorsementsCount,
  applicationsCount,
  minimumBid,
}: EndorsementStatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Staked Amount</p>
              <p className="text-2xl font-bold tabular-nums" title={`${userStake} VETD`}>{formatCompact(parseFloat(userStake))}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">My Endorsements</p>
              <p className="text-2xl font-bold tabular-nums">{userEndorsementsCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Available Applications</p>
              <p className="text-2xl font-bold tabular-nums">{applicationsCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Minimum Bid</p>
              <p className="text-2xl font-bold tabular-nums">
                {minimumBid} <span className="text-sm font-medium text-muted-foreground">VETD</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
