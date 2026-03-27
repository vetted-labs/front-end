import { Target, Zap, Trophy, Users, Star, TrendingUp } from "lucide-react";

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
      {/* Health stats bar */}
      <div className=" rounded-xl border border-border p-6 flex items-center divide-x divide-border/60 mb-4 animate-fade-up animate-delay-200">
        <div className="flex-1 text-center px-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-1.5">
            <Target className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="font-mono text-xl font-bold text-foreground">{totalProposalsReviewed || 0}</div>
          <div className="text-xs text-muted-foreground">Reviewed</div>
        </div>
        <div className="flex-1 text-center px-2">
          <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center mx-auto mb-1.5">
            <Zap className="w-3.5 h-3.5 text-warning" />
          </div>
          <div className="font-mono text-xl font-bold text-foreground">{averageApprovalTime || "\u2014"}</div>
          <div className="text-xs text-muted-foreground">Avg Time</div>
        </div>
        <div className="flex-1 text-center px-2">
          <div className="w-7 h-7 rounded-lg bg-positive/10 flex items-center justify-center mx-auto mb-1.5">
            <Trophy className="w-3.5 h-3.5 text-positive" />
          </div>
          <div className="font-mono text-xl font-bold text-foreground">{candidateCount || 0}</div>
          <div className="text-xs text-muted-foreground">Candidates</div>
        </div>
        <div className="flex-1 text-center px-2">
          <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center mx-auto mb-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="font-mono text-xl font-bold text-foreground">{memberCount || 0}</div>
          <div className="text-xs text-muted-foreground">Members</div>
        </div>
      </div>

      {/* Why join callout */}
      <div className=" rounded-xl border border-border p-6 animate-fade-up animate-delay-300">
        <h2 className="text-xl font-bold font-display text-foreground mb-3">Guild Overview</h2>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed line-clamp-3">{description}</p>

        <div className="rounded-xl border border-primary/15 bg-primary/[0.04] px-5 py-4">
          <p className="text-sm font-bold text-foreground mb-3">Why join this guild?</p>
          <ul className="space-y-3">
            {whyJoinPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5 shrink-0">{point.icon}</span>
                {point.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
