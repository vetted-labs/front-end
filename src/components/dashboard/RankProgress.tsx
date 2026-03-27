"use client";

import { GUILD_RANK_CRITERIA, GUILD_RANK_ORDER } from "@/config/constants";
import type { ExpertGuild } from "@/types";

interface RankProgressProps {
  guilds: ExpertGuild[];
}

const RANK_LABELS: Record<string, string> = {
  recruit: "Recruit",
  apprentice: "Apprentice",
  craftsman: "Craftsman",
  officer: "Officer",
  master: "Guild Master",
};

function computeProgress(guild: ExpertGuild): number {
  const currentIndex = GUILD_RANK_ORDER.indexOf(guild.expertRole);
  if (currentIndex === -1) return 0;
  // Max rank = 100%
  if (currentIndex >= GUILD_RANK_ORDER.length - 1) return 1;

  const nextRank = GUILD_RANK_ORDER[currentIndex + 1];
  const criteria = GUILD_RANK_CRITERIA[nextRank];
  if (!criteria) return 1;

  const checks: boolean[] = [];

  // Reviews
  if (criteria.minReviews > 0) {
    const reviewCount =
      (guild.pendingProposals ?? 0) +
      (guild.ongoingProposals ?? 0) +
      (guild.closedProposals ?? 0);
    checks.push(reviewCount >= criteria.minReviews);
  }

  // Consensus — not available per-guild on ExpertGuild type
  if (criteria.minConsensus > 0) {
    checks.push(false);
  }

  // Endorsements — not available on ExpertGuild type
  if (criteria.minEndorsements > 0) {
    checks.push(false);
  }

  // Election
  if (criteria.requiresElection) {
    checks.push(false);
  }

  if (checks.length === 0) return 1;
  return checks.filter(Boolean).length / checks.length;
}

function selectTopGuilds(guilds: ExpertGuild[]): ExpertGuild[] {
  const maxRankIndex = GUILD_RANK_ORDER.length - 1;

  return [...guilds]
    .sort((a, b) => {
      const aIsMax =
        GUILD_RANK_ORDER.indexOf(a.expertRole) >= maxRankIndex ? 1 : 0;
      const bIsMax =
        GUILD_RANK_ORDER.indexOf(b.expertRole) >= maxRankIndex ? 1 : 0;

      // Non-max-rank guilds first
      if (aIsMax !== bIsMax) return aIsMax - bIsMax;

      // Then by progress descending
      const aProgress = computeProgress(a);
      const bProgress = computeProgress(b);
      if (aProgress !== bProgress) return bProgress - aProgress;

      // Then by earnings descending
      return (b.totalEarnings ?? 0) - (a.totalEarnings ?? 0);
    })
    .slice(0, 3);
}

export function RankProgress({ guilds }: RankProgressProps) {
  const topGuilds = selectTopGuilds(guilds);

  return (
    <div className="bg-card border border-border rounded-xl p-6 h-full">
      <span className="text-sm font-bold text-foreground">
        Rank Progress
      </span>

      <div className="flex flex-col gap-4 mt-4">
        {topGuilds.map((guild, index) => {
          const progress = computeProgress(guild);
          const isHighlighted = index === 0;
          const isMaxRank =
            GUILD_RANK_ORDER.indexOf(guild.expertRole) >=
            GUILD_RANK_ORDER.length - 1;

          return (
            <div
              key={guild.id}
              className={`p-3 rounded-lg ${
                isHighlighted
                  ? "bg-primary/[0.06] border border-primary/[0.12]"
                  : "bg-muted/30 border border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-medium ${
                    isHighlighted ? "text-primary" : "text-foreground"
                  }`}
                >
                  {guild.name}
                </span>
                <span
                  className={`text-xs uppercase tracking-wider font-medium ${
                    isHighlighted ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {RANK_LABELS[guild.expertRole] ?? guild.expertRole}
                </span>
              </div>
              <div className="w-full h-[3px] bg-muted/50 rounded-full">
                <div
                  className="h-[3px] rounded-full bg-primary transition-all duration-500"
                  style={{
                    width: `${Math.round((isMaxRank ? 1 : progress) * 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
