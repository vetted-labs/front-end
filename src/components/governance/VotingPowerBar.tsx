"use client";

import { VOTE_COLORS } from "@/config/colors";

interface VotingPowerBarProps {
  forPercent: number;
  againstPercent: number;
  abstainPercent: number;
  /** Render a larger bar for featured/detail views */
  large?: boolean;
}

export function VotingPowerBar({
  forPercent,
  againstPercent,
  abstainPercent,
  large = false,
}: VotingPowerBarProps) {
  const barHeight = large ? "h-8" : "h-2.5";

  return (
    <div className="space-y-3">
      <div className={`flex ${barHeight} w-full overflow-hidden rounded-full bg-muted/30`}>
        {forPercent > 0 && (
          <div
            className={`${VOTE_COLORS.for.bar} transition-all duration-700 ${large ? "rounded-l-lg relative" : ""}`}
            style={{ width: `${forPercent}%` }}
          >
            {large && forPercent > 0 && (
              <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/70 rounded-sm" />
            )}
          </div>
        )}
        {againstPercent > 0 && (
          <div
            className={`${VOTE_COLORS.against.bar} transition-all duration-700`}
            style={{ width: `${againstPercent}%` }}
          />
        )}
        {abstainPercent > 0 && (
          <div
            className={`${VOTE_COLORS.abstain.bar} transition-all duration-700 ${large ? "rounded-r-lg" : ""}`}
            style={{ width: `${abstainPercent}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${VOTE_COLORS.for.bar}`} />
          <span className={VOTE_COLORS.for.text}>For {forPercent.toFixed(0)}%</span>
        </span>
        <span className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${VOTE_COLORS.against.bar}`} />
          <span className={VOTE_COLORS.against.text}>Against {againstPercent.toFixed(0)}%</span>
        </span>
        <span className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${VOTE_COLORS.abstain.bar}`} />
          <span className={VOTE_COLORS.abstain.text}>Abstain {abstainPercent.toFixed(0)}%</span>
        </span>
      </div>
    </div>
  );
}
