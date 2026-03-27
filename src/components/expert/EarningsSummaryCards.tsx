import { Card } from "@/components/ui/card";
import { Coins, Vote, Award, TrendingUp } from "lucide-react";
import type { EarningsSummary } from "@/types";
import { getRewardTierProgress } from "@/types";
import { STAT_ICON, REWARD_TIER_COLORS } from "@/config/colors";

interface EarningsSummaryCardsProps {
  summary: EarningsSummary | null;
  reputation: number;
}

export function EarningsSummaryCards({ summary, reputation }: EarningsSummaryCardsProps) {
  const { tier } = getRewardTierProgress(reputation);
  const votingTotal = summary?.byType?.find((t) => t.type === "voting_reward")?.total ?? 0;
  const endorsementTotal = summary?.byType?.find((t) => t.type === "endorsement")?.total ?? 0;

  const cards = [
    {
      icon: Coins,
      label: "Total Earned",
      value: (summary?.totalVetd ?? 0).toFixed(2),
      sub: "VETD",
    },
    {
      icon: Vote,
      label: "Voting",
      value: votingTotal.toFixed(2),
      sub: "VETD",
    },
    {
      icon: Award,
      label: "Endorsements",
      value: endorsementTotal.toFixed(2),
      sub: "VETD",
    },
    {
      icon: TrendingUp,
      label: "Reward Tier",
      value: tier.name,
      sub: `${tier.rewardWeight}x multiplier`,
      tierName: tier.name,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const tierTextColor = card.tierName
          ? REWARD_TIER_COLORS[card.tierName]?.text ?? "text-foreground"
          : undefined;

        return (
          <Card
            key={card.label}
            hover
            padding="none"
            className="relative overflow-hidden group"
          >
            {/* Top accent line on hover */}
            <div className="absolute top-0 left-0 right-0 h-px bg-border opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="p-5">
              {/* Icon box */}
              <div className={`w-10 h-10 rounded-xl ${STAT_ICON.bg} border border-primary/10 flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${STAT_ICON.text}`} />
              </div>

              {/* Label */}
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {card.label}
              </p>

              {/* Value */}
              <p className={`text-2xl font-bold tracking-tight tabular-nums leading-none mb-1 ${tierTextColor ?? "text-foreground"}`}>
                {card.value}
              </p>

              {/* Sub label */}
              <p className="text-xs text-muted-foreground/50">{card.sub}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
