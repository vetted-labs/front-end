"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExpertGuild } from "@/types";

interface GuildsSectionProps {
  guilds: ExpertGuild[];
  guildStakes: Record<string, string>;
}

const RANK_LABELS: Record<string, string> = {
  recruit: "Recruit",
  apprentice: "Apprentice",
  craftsman: "Craftsman",
  officer: "Officer",
  master: "Guild Master",
};

function GuildCompactCard({
  guild,
  stakedAmount,
  onClick,
}: {
  guild: ExpertGuild;
  stakedAmount: number;
  onClick: () => void;
}) {
  const earned = guild.totalEarnings ?? 0;
  const pending =
    (guild.pendingProposals ?? 0) + (guild.pendingApplications ?? 0);

  return (
    <button
      onClick={onClick}
      className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-4 text-left hover:border-white/[0.12] hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[13px] font-semibold text-zinc-200">
            {guild.name}
          </div>
          <div className="text-[11px] text-zinc-600">
            {RANK_LABELS[guild.expertRole] ?? guild.expertRole} ·{" "}
            {guild.memberCount ?? 0} members
          </div>
        </div>
        {earned > 0 && (
          <span className="px-2 py-0.5 bg-emerald-500/[0.10] text-emerald-400 rounded-md text-[10px] font-semibold">
            ${Math.round(earned)}
          </span>
        )}
      </div>
      <div className="flex gap-4">
        <div>
          <div className="text-[16px] font-bold text-zinc-300">
            {Math.round(stakedAmount)}
          </div>
          <div className="text-[10px] text-zinc-600">Staked</div>
        </div>
        <div>
          <div className="text-[16px] font-bold text-zinc-300">{pending}</div>
          <div className="text-[10px] text-zinc-600">Pending</div>
        </div>
      </div>
    </button>
  );
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
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-8 text-center">
        <p className="text-[13px] text-zinc-500">No guild memberships yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[13px] font-semibold text-zinc-200">
          Your Guilds
        </span>
        {rest.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 rounded-[7px] bg-white/[0.04] border border-white/[0.06] text-zinc-500 text-[11px] font-medium hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
          >
            {expanded ? "Show less" : `Show all ${guilds.length} →`}
          </button>
        )}
      </div>

      {/* Guild cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayed.map((guild) => {
          const staked = parseFloat(guildStakes[guild.id] || "0");
          return (
            <GuildCompactCard
              key={guild.id}
              guild={guild}
              stakedAmount={staked}
              onClick={() => router.push(`/expert/guild/${guild.id}`)}
            />
          );
        })}
      </div>
    </div>
  );
}
