import { Card } from "@/components/ui/card";
import { Coins, Vote, Award, TrendingUp } from "lucide-react";
import type { EarningsSummary } from "@/types";
import { getRewardTierProgress } from "@/types";

interface EarningsSummaryCardsProps {
  summary: EarningsSummary | null;
  reputation: number;
}

const tierColorMap: Record<string, string> = {
  Foundation: "text-slate-600 dark:text-slate-400",
  Established: "text-blue-600 dark:text-blue-400",
  Authority: "text-amber-600 dark:text-amber-400",
};

export function EarningsSummaryCards({ summary, reputation }: EarningsSummaryCardsProps) {
  const { tier } = getRewardTierProgress(reputation);
  const votingTotal = summary?.byType?.find((t) => t.type === "voting_reward")?.total ?? 0;
  const endorsementTotal = summary?.byType?.find((t) => t.type === "endorsement")?.total ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card hover>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Coins className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Earned</p>
            <p className="text-2xl font-bold tabular-nums">{(summary?.totalVetd ?? 0).toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground/60">VETD</p>
          </div>
        </div>
      </Card>

      <Card hover>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Vote className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voting</p>
            <p className="text-2xl font-bold tabular-nums">{votingTotal.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground/60">VETD</p>
          </div>
        </div>
      </Card>

      <Card hover>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Endorsements</p>
            <p className="text-2xl font-bold tabular-nums">{endorsementTotal.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground/60">VETD</p>
          </div>
        </div>
      </Card>

      <Card hover>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reward Tier</p>
            <p className={`text-lg font-bold ${tierColorMap[tier.name] ?? "text-foreground"}`}>{tier.name}</p>
            <p className="text-[11px] text-muted-foreground/60">{tier.rewardWeight}x multiplier</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
