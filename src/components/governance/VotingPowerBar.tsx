"use client";

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
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {forPercent > 0 && (
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${forPercent}%` }}
          />
        )}
        {againstPercent > 0 && (
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${againstPercent}%` }}
          />
        )}
        {abstainPercent > 0 && (
          <div
            className="bg-gray-400 transition-all"
            style={{ width: `${abstainPercent}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          For {forPercent.toFixed(0)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          Against {againstPercent.toFixed(0)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
          Abstain {abstainPercent.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
