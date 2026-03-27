"use client";

import { Star, TrendingUp } from "lucide-react";
import { getRewardTierProgress } from "@/types";
import { REWARD_TIER_COLORS, STATUS_COLORS } from "@/config/colors";

interface ReputationScoreHeroProps {
  reputation: number;
  totalGains: number;
  alignedCount: number;
  deviationCount: number;
  reviewCount: number;
}

export function ReputationScoreHero({
  reputation,
  totalGains,
  alignedCount,
  deviationCount,
  reviewCount,
}: ReputationScoreHeroProps) {
  const { tier } = getRewardTierProgress(reputation);
  const tierColors = REWARD_TIER_COLORS[tier.name] ?? REWARD_TIER_COLORS.Foundation;
  const progressPct = Math.min((reputation / 1000) * 100, 100);

  const alignmentRate =
    alignedCount + deviationCount > 0
      ? Math.round((alignedCount / (alignedCount + deviationCount)) * 100)
      : 100;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      {/* Score */}
      <p className="text-5xl font-bold font-display text-foreground tabular-nums">
        {reputation}
        <span className="text-xl font-normal text-muted-foreground ml-1">/1000</span>
      </p>
      <p className="text-xs text-muted-foreground tracking-wider uppercase mt-1">
        Reputation Score
      </p>

      {/* Progress bar */}
      <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Tier badge */}
      <div className={`inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-lg border ${tierColors.bg} ${tierColors.border}`}>
        <Star className={`w-4 h-4 ${tierColors.text}`} />
        <span className={`text-xs font-bold tracking-wider ${tierColors.text}`}>
          {tier.name.toUpperCase()} TIER
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 mt-5 flex-wrap">
        {totalGains > 0 && (
          <div className={`flex items-center gap-1.5 text-sm font-medium ${STATUS_COLORS.positive.text}`}>
            <TrendingUp className="w-3.5 h-3.5" />
            +{totalGains} pts earned
          </div>
        )}
        <div className="text-sm font-medium text-primary">
          {alignmentRate}% alignment
        </div>
        {reviewCount > 0 && (
          <div className="text-sm text-muted-foreground">
            {reviewCount} reviews completed
          </div>
        )}
      </div>
    </div>
  );
}
