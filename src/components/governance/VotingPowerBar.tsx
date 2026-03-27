"use client";

import { VOTE_COLORS } from "@/config/colors";

interface VotingPowerBarProps {
  forPercent: number;
  againstPercent: number;
  abstainPercent: number;
}

export function VotingPowerBar({
  forPercent,
  againstPercent,
  abstainPercent,
}: VotingPowerBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {forPercent > 0 && (
          <div
            className={`${VOTE_COLORS.for.bar} transition-all`}
            style={{ width: `${forPercent}%` }}
          />
        )}
        {againstPercent > 0 && (
          <div
            className={`${VOTE_COLORS.against.bar} transition-all`}
            style={{ width: `${againstPercent}%` }}
          />
        )}
        {abstainPercent > 0 && (
          <div
            className={`${VOTE_COLORS.abstain.bar} transition-all`}
            style={{ width: `${abstainPercent}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${VOTE_COLORS.for.bar}`} />
          For {forPercent.toFixed(0)}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${VOTE_COLORS.against.bar}`} />
          Against {againstPercent.toFixed(0)}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${VOTE_COLORS.abstain.bar}`} />
          Abstain {abstainPercent.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
