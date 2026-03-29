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
    <div className="rounded-xl border border-border bg-card p-8 mt-6">
      {/* Score */}
      <p className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-foreground tabular-nums">
        {reputation}
        <span className="text-xl sm:text-2xl font-semibold text-muted-foreground ml-1.5">/1000</span>
      </p>
      <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1.5 font-medium">
        Reputation Score
      </p>

      {/* Progress bar */}
      <div className="mt-5 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Tier badge + stats row */}
      <div className="flex items-center justify-between mt-5 flex-wrap gap-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${tierColors.bg} ${tierColors.border}`}>
          <Star className={`w-4 h-4 ${tierColors.text}`} />
          <span className={`text-xs font-bold tracking-wider ${tierColors.text}`}>
            {tier.name.toUpperCase()} TIER
          </span>
        </div>

        <div className="flex items-center gap-5 flex-wrap">
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
              {reviewCount} reviews
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
