import { Target, Zap, Trophy, Shield } from "lucide-react";

interface GuildStatsPanelProps {
  totalProposalsReviewed: number;
  averageApprovalTime: string;
  candidateCount: number;
  totalVetdStaked?: number;
  description: string;
}

export function GuildStatsPanel({
  totalProposalsReviewed,
  averageApprovalTime,
  candidateCount,
  totalVetdStaked,
  description,
}: GuildStatsPanelProps) {
  return (
    <div className="border-b border-border bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Guild Overview</h2>
        <p className="text-base md:text-lg text-muted-foreground mb-6 line-clamp-3">
          {description}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2 text-primary">
              <Target className="w-4 h-4" />
              <p className="text-xl font-semibold text-foreground">{totalProposalsReviewed || 0}</p>
            </div>
            <p className="text-xs text-muted-foreground">Applications Reviewed</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2 text-primary">
              <Zap className="w-4 h-4" />
              <p className="text-xl font-semibold text-foreground">{averageApprovalTime || "\u2014"}</p>
            </div>
            <p className="text-xs text-muted-foreground">Avg Approval Time</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2 text-primary">
              <Trophy className="w-4 h-4" />
              <p className="text-xl font-semibold text-foreground">{candidateCount || 0}</p>
            </div>
            <p className="text-xs text-muted-foreground">Active Candidates</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2 text-primary">
              <Shield className="w-4 h-4" />
              <p className="text-xl font-semibold text-foreground">
                {totalVetdStaked != null
                  ? Number(totalVetdStaked).toLocaleString(undefined, { maximumFractionDigits: 0 })
                  : "0"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Total VETD Staked</p>
          </div>
        </div>
      </div>
    </div>
  );
}
