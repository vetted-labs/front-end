"use client";

import { cn } from "@/lib/utils";

interface CandidateStatsBarProps {
  total: number;
  pending: number;
  accepted: number;
  reviewing: number;
  interviewed: number;
  activeFilter?: string;
  onFilterClick?: (status: string) => void;
}

const stats = [
  { key: "all", label: "total", color: "text-foreground" },
  { key: "pending", label: "pending", color: "text-amber-600 dark:text-amber-400" },
  { key: "reviewing", label: "reviewing", color: "text-blue-600 dark:text-blue-400" },
  { key: "interviewed", label: "interviewed", color: "text-purple-600 dark:text-purple-400" },
  { key: "accepted", label: "accepted", color: "text-green-600 dark:text-green-400" },
] as const;

export function CandidateStatsBar({
  total,
  pending,
  accepted,
  reviewing,
  interviewed,
  activeFilter = "all",
  onFilterClick,
}: CandidateStatsBarProps) {
  const counts: Record<string, number> = { all: total, pending, reviewing, interviewed, accepted };

  return (
    <div className="flex items-center gap-4">
      {stats.map((stat, i) => (
        <span key={stat.key} className="contents">
          {i > 0 && <span className="text-border dark:text-white/10">&middot;</span>}
          <button
            type="button"
            onClick={() => onFilterClick?.(stat.key === activeFilter ? "all" : stat.key)}
            className={cn(
              "text-sm text-muted-foreground rounded-md px-1.5 py-0.5 transition-all",
              onFilterClick && "hover:bg-muted/50 cursor-pointer",
              !onFilterClick && "cursor-default",
              activeFilter === stat.key && stat.key !== "all" && "ring-1 ring-primary/40 bg-primary/5"
            )}
          >
            <span className={cn("font-semibold tabular-nums", stat.color)}>{counts[stat.key]}</span>{" "}
            {stat.label}
          </button>
        </span>
      ))}
    </div>
  );
}
