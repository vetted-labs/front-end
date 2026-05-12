"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GuildCard } from "@/components/guild/card";
import type { ExpertGuild } from "@/types";

interface GuildsSectionProps {
  guilds: ExpertGuild[];
  guildStakes: Record<string, string>;
}

export function GuildsSection({
  guilds,
  guildStakes,
}: GuildsSectionProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  // Pick the freshest non-zero stake we can find. The on-chain map sometimes
  // resolves to the string "0" (e.g. before sync, or when the batch endpoint
  // returns no entry for this guild) — in that case `??` won't fall back
  // because "0" isn't nullish. Prefer whichever source has a positive value.
  const resolveDisplayStake = (g: ExpertGuild): string | undefined => {
    const onChain = guildStakes[g.id];
    if (onChain && parseFloat(onChain) > 0) return onChain;
    return g.stakedAmount;
  };
  const resolveStakeNum = (g: ExpertGuild): number => {
    const raw = resolveDisplayStake(g);
    if (!raw) return 0;
    const n = typeof raw === "string" ? parseFloat(raw) : raw;
    return Number.isFinite(n) ? n : 0;
  };
  const sorted = [...guilds].sort((a, b) => resolveStakeNum(b) - resolveStakeNum(a));

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const displayed = expanded ? sorted : top3;

  if (guilds.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">No guild memberships yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-sm font-bold text-foreground">
          Your Guilds
        </span>
        {rest.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 rounded-[7px] bg-muted/30 border border-border text-muted-foreground text-xs font-medium hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            {expanded ? "Show less" : `Show all ${guilds.length} →`}
          </button>
        )}
      </div>

      {/* Guild cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayed.map((guild, i) => (
          <GuildCard
            key={guild.id}
            variant="widget"
            guild={guild}
            catalogueIndex={i + 1}
            stakedAmount={resolveDisplayStake(guild)}
            onClick={() => router.push(`/expert/guild/${guild.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
