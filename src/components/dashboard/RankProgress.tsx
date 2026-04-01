"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ExpertGuild } from "@/types";

interface StakeDistributionProps {
  guilds: ExpertGuild[];
  guildStakes: Record<string, string>;
  totalStaked: number;
}

/**
 * Generates an orange gradient palette from full saturation to light tint.
 * Each segment gets a progressively lighter shade of the brand orange.
 */
function getBarColor(index: number, total: number): string {
  if (total <= 1) return "hsl(24 100% 51%)";
  // Lerp lightness from 51% (vivid) to 85% (pale)
  const lightness = 51 + (index / (total - 1)) * 34;
  return `hsl(24 100% ${Math.round(lightness)}%)`;
}

export function RankProgress({
  guilds,
  guildStakes,
  totalStaked,
}: StakeDistributionProps) {
  const router = useRouter();

  const sortedGuilds = useMemo(() => {
    return [...guilds]
      .map((g) => ({
        ...g,
        stake: parseFloat(guildStakes[g.id] || "0"),
      }))
      .sort((a, b) => b.stake - a.stake);
  }, [guilds, guildStakes]);

  const maxStake = sortedGuilds[0]?.stake ?? 1;

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-foreground">
          Stake Distribution
        </span>
        <button
          onClick={() => router.push("/expert/withdrawals")}
          className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Manage &rarr;
        </button>
      </div>

      {/* Hero total */}
      <div className="text-center pb-4 mb-4 border-b border-border">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1.5">
          Total Staked
        </p>
        <p className="text-3xl font-display font-extrabold text-primary leading-none tabular-nums">
          {Math.round(totalStaked).toLocaleString()}
          <span className="text-sm font-semibold text-muted-foreground ml-1.5 font-sans">
            VETD
          </span>
        </p>
      </div>

      {/* Stacked bar */}
      {totalStaked > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden mb-4 bg-muted/30">
          {sortedGuilds.map((g, i) => {
            const pct = (g.stake / totalStaked) * 100;
            if (pct < 0.5) return null;
            return (
              <div
                key={g.id}
                className="h-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: getBarColor(i, sortedGuilds.length),
                }}
              />
            );
          })}
        </div>
      )}

      {/* Per-guild list */}
      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto max-h-[260px]">
        {sortedGuilds.map((g, i) => {
          const pct =
            totalStaked > 0 ? Math.round((g.stake / totalStaked) * 100) : 0;

          return (
            <div
              key={g.id}
              className="flex items-center gap-2.5 py-1.5 group"
            >
              {/* Color dot */}
              <div
                className="w-2 h-2 rounded-[3px] shrink-0"
                style={{ backgroundColor: getBarColor(i, sortedGuilds.length) }}
              />

              {/* Guild name */}
              <span className="flex-1 text-xs font-medium text-foreground truncate">
                {g.name}
              </span>

              {/* Amount */}
              <span className="text-xs font-mono font-semibold text-primary tabular-nums">
                {g.stake > 0 ? Math.round(g.stake).toLocaleString() : "0"}
              </span>

              {/* Percentage */}
              <span className="text-[10px] text-muted-foreground tabular-nums min-w-[28px] text-right">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
