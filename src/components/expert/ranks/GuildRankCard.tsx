"use client";

import { TrendingUp } from "lucide-react";
import { GuildAvatar } from "@/components/ui/guild";
import { getRankColors, STATUS_COLORS } from "@/config/colors";
import { cn } from "@/lib/utils";
import type { ExpertGuild } from "@/types";
import { GUILD_RANK_CONFIGS, RANK_ICONS, getRankIndex } from "./config";

interface GuildRankCardProps {
  guild: ExpertGuild;
  selected: boolean;
  onClick: () => void;
}

/**
 * Per-guild rank card. Shows the guild avatar, current rank, progress to the
 * next rank, in-guild reputation, and a click-to-select handler so the page
 * can drill into a specific guild's progression.
 */
export function GuildRankCard({ guild, selected, onClick }: GuildRankCardProps) {
  const currentRankIndex = getRankIndex(guild.expertRole);
  const currentRank = GUILD_RANK_CONFIGS[currentRankIndex];
  const nextRank =
    currentRankIndex < GUILD_RANK_CONFIGS.length - 1
      ? GUILD_RANK_CONFIGS[currentRankIndex + 1]
      : null;
  const colors = getRankColors(guild.expertRole);
  const Icon = RANK_ICONS[guild.expertRole];

  // Find the reputation requirement for the next rank to show progress
  const nextRepReq = nextRank?.requirements.find((r) => r.metric === "reputation");
  const repTarget = nextRepReq?.target ?? null;
  const progressPct = repTarget
    ? Math.min(100, Math.round((guild.reputation / repTarget) * 100))
    : 100;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left rounded-xl border bg-card p-5 transition-all w-full",
        selected
          ? cn("ring-1 shadow-md", colors.border, colors.glow)
          : "border-border hover:border-foreground/20",
      )}
    >
      <div className="flex items-start gap-4">
        <GuildAvatar guild={guild.name} size="lg" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base font-bold text-foreground truncate">
              {guild.name}
            </h3>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-[0.14em] flex-shrink-0",
                colors.badge,
              )}
            >
              <Icon className="w-3 h-3" />
              {currentRank?.name}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            Level {currentRank?.level} · {guild.memberCount ?? 0} members
          </p>
        </div>
      </div>

      {/* Reputation + progress */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Guild reputation
          </p>
          <p className="text-sm font-bold tabular-nums font-display">
            {guild.reputation.toLocaleString()}
            {repTarget && (
              <span className="text-xs font-medium text-muted-foreground ml-1">
                / {repTarget.toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              nextRank ? colors.bg : STATUS_COLORS.positive.bg,
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {nextRank ? `Next: ${nextRank.name}` : "Top rank"}
          </span>
          <span className="tabular-nums">{progressPct}%</span>
        </div>
      </div>
    </button>
  );
}
