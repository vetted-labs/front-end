"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Award,
  Zap,
} from "lucide-react";

interface EndorsementStatsGridProps {
  /** Total number of endorsements across all guilds */
  totalEndorsementsCount: number;
  /** Number of endorsements the user has in this guild */
  userEndorsementsCount: number;
  /** Number of applications available in this guild */
  applicationsCount: number;
}

export function EndorsementStatsGrid({
  totalEndorsementsCount,
  userEndorsementsCount,
  applicationsCount,
}: EndorsementStatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Endorsements</p>
              <p className="text-2xl font-bold tabular-nums">{totalEndorsementsCount}</p>
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
    </div>
  );
}
