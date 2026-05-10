"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";
import { GuildAvatar } from "@/components/ui/guild";
import type { GuildStakeInfo } from "@/types";

interface UnstakeInfo {
  hasRequest: boolean;
  unlockTime?: string;
  amount?: string;
}

export interface PositionRowProps {
  guild: GuildStakeInfo & { unstakeInfo?: UnstakeInfo };
  index: number;
  totalStaked: number;
  hexColor: string;
  cooldown: { percent: number; label: string } | null;
  onClick: () => void;
}

/**
 * Single guild-position row inside the withdrawals positions list. Shows
 * stake amount, allocation share, cooldown state, and chevron-to-manage.
 */
export function PositionRow({
  guild,
  index,
  totalStaked,
  hexColor,
  cooldown,
  onClick,
}: PositionRowProps) {
  const amount = parseFloat(guild.stakedAmount);
  const pct = totalStaked > 0 ? (amount / totalStaked) * 100 : 0;
  const hasCooldown = guild.unstakeInfo?.hasRequest;
  const isReady = cooldown?.percent === 100;

  return (
    <button
      onClick={onClick}
      className="grid w-full grid-cols-[auto_auto_1fr_auto] items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-muted/35 cursor-pointer group"
    >
      <span className="w-5 text-center text-xs font-mono text-muted-foreground/45 tabular-nums">
        {index + 1}
      </span>

      <GuildAvatar
        guild={guild.guildName || guild.guildId}
        size="sm"
        rounded="md"
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold truncate">
            {guild.guildName || guild.guildId}
          </span>
          {hasCooldown && (
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded flex-shrink-0",
                isReady
                  ? STATUS_COLORS.positive.badge
                  : `${STATUS_COLORS.warning.bgSubtle} ${STATUS_COLORS.warning.text}`,
              )}
            >
              {isReady ? "Ready" : "Cooldown"}
            </span>
          )}
        </div>
        <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: hexColor,
              opacity: 0.6,
            }}
          />
        </div>
        {hasCooldown && guild.unstakeInfo?.amount && cooldown && (
          <div
            className={cn(
              "text-[11px] mt-1",
              isReady ? STATUS_COLORS.positive.text : STATUS_COLORS.warning.text,
            )}
          >
            Unstaking {parseFloat(guild.unstakeInfo.amount).toFixed(2)} VETD ·{" "}
            {cooldown.label}
            {!isReady && " remaining"}
          </div>
        )}
      </div>

      <div className="text-right flex items-center gap-3">
        <div>
          <div className="text-sm font-bold tabular-nums font-mono">
            {amount.toFixed(2)}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              VETD
            </span>
          </div>
          <div className="text-[11px] font-mono text-muted-foreground/50 tabular-nums">
            {pct.toFixed(1)}%
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
      </div>
    </button>
  );
}
