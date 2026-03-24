import { Target, Zap, Trophy, Shield, Star, TrendingUp, Users } from "lucide-react";

interface GuildStatsPanelProps {
  totalProposalsReviewed: number;
  averageApprovalTime: string;
  candidateCount: number;
  totalVetdStaked?: number;
  description: string;
  memberCount?: number;
}

export function GuildStatsPanel({
  totalProposalsReviewed,
  averageApprovalTime,
  candidateCount,
  totalVetdStaked,
  description,
  memberCount,
}: GuildStatsPanelProps) {
  const whyJoinPoints = [
    {
      icon: <TrendingUp className="w-4 h-4" />,
      text:
        totalProposalsReviewed > 0
          ? `${totalProposalsReviewed} applications reviewed — a proven, active community`
          : "Be among the first to shape this guild's standards",
    },
    {
      icon: <Users className="w-4 h-4" />,
      text:
        candidateCount > 0
          ? `${candidateCount} active candidate${candidateCount === 1 ? "" : "s"} seeking expert review`
          : "Start reviewing candidates and earn reputation",
    },
    {
      icon: <Star className="w-4 h-4" />,
      text:
        totalVetdStaked && totalVetdStaked > 0 && memberCount && memberCount > 0
          ? `Members stake an average of ${Math.round(totalVetdStaked / memberCount).toLocaleString()} VETD — with rewards for majority votes`
          : "Stake VETD tokens to earn rewards for accurate reviews",
    },
  ];

  return (
    <div className="border-b border-border bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Guild Overview</h2>
        <p className="text-base md:text-lg text-muted-foreground mb-6 line-clamp-3">
          {description}
        </p>

        {/* Why join? */}
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
          <p className="text-sm font-semibold text-foreground mb-3">Why join this guild?</p>
          <ul className="space-y-2">
            {whyJoinPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5 shrink-0">{point.icon}</span>
                {point.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2 text-primary">
              <Target className="w-5 h-5" />
              <p className="text-xl font-semibold text-foreground">{totalProposalsReviewed || 0}</p>
            </div>
            <p className="text-xs text-muted-foreground">Applications Reviewed</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2 text-primary">
              <Zap className="w-5 h-5" />
              <p className="text-xl font-semibold text-foreground">{averageApprovalTime || "\u2014"}</p>
            </div>
            <p className="text-xs text-muted-foreground">Avg Approval Time</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2 text-primary">
              <Trophy className="w-5 h-5" />
              <p className="text-xl font-semibold text-foreground">{candidateCount || 0}</p>
            </div>
            <p className="text-xs text-muted-foreground">Active Candidates</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2 text-primary">
              <Shield className="w-5 h-5" />
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
