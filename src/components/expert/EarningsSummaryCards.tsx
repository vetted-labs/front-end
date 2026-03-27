import { Card } from "@/components/ui/card";
import { Coins, Vote, Award, TrendingUp } from "lucide-react";
import type { EarningsSummary } from "@/types";
import { getRewardTierProgress } from "@/types";
import { STAT_ICON, STATUS_COLORS, REWARD_TIER_COLORS } from "@/config/colors";

interface EarningsSummaryCardsProps {
  summary: EarningsSummary | null;
  reputation: number;
}

export function EarningsSummaryCards({ summary, reputation }: EarningsSummaryCardsProps) {
  const { tier } = getRewardTierProgress(reputation);
  const votingTotal = summary?.byType?.find((t) => t.type === "voting_reward")?.total ?? 0;
  const endorsementTotal = summary?.byType?.find((t) => t.type === "endorsement")?.total ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card hover>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${STATUS_COLORS.positive.bgSubtle} flex items-center justify-center`}>
            <Coins className={`w-5 h-5 ${STATUS_COLORS.positive.text}`} />
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
          <div className={`w-10 h-10 rounded-xl ${STAT_ICON.bg} flex items-center justify-center`}>
            <Vote className={`w-5 h-5 ${STAT_ICON.text}`} />
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
          <div className={`w-10 h-10 rounded-xl ${STAT_ICON.bg} flex items-center justify-center`}>
            <Award className={`w-5 h-5 ${STAT_ICON.text}`} />
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
          <div className={`w-10 h-10 rounded-xl ${STATUS_COLORS.warning.bgSubtle} flex items-center justify-center`}>
            <TrendingUp className={`w-5 h-5 ${STATUS_COLORS.warning.text}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reward Tier</p>
            <p className={`text-lg font-bold ${REWARD_TIER_COLORS[tier.name]?.text ?? "text-foreground"}`}>{tier.name}</p>
            <p className="text-[11px] text-muted-foreground/60">{tier.rewardWeight}x multiplier</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
