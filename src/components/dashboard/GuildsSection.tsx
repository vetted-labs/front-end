"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GuildCard } from "@/components/GuildCard";
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

  // Sort by earnings descending
  const sorted = [...guilds].sort(
    (a, b) => (b.totalEarnings ?? 0) - (a.totalEarnings ?? 0)
  );

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const displayed = expanded ? sorted : top3;

  if (guilds.length === 0) {
    return (
      <div className="bg-card border border-border rounded-[14px] p-8 text-center">
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
        {displayed.map((guild) => (
          <GuildCard
            key={guild.id}
            guild={{
              ...guild,
              stakedAmount: guildStakes[guild.id] || "0",
            }}
            variant="browse"
            onViewDetails={(id) => router.push(`/expert/guild/${id}`)}
          />
        ))}
      </div>
    </div>
  );
}
