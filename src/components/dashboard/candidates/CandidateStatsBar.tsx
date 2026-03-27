"use client";

import { cn } from "@/lib/utils";
import { getCandidateStatusDot } from "@/config/colors";

interface CandidateStatsBarProps {
  total: number;
  pending: number;
  accepted: number;
  reviewing: number;
  interviewed: number;
  activeFilter?: string;
  onFilterClick?: (status: string) => void;
}

const statDefs = [
  { key: "all", label: "total", dot: null },
  { key: "pending", label: "pending", dot: "pending" },
  { key: "reviewing", label: "reviewing", dot: "reviewing" },
  { key: "interviewed", label: "interviewed", dot: "interviewed" },
  { key: "accepted", label: "accepted", dot: "accepted" },
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
    <div className="flex items-center gap-3">
      {statDefs.map((stat, i) => (
        <span key={stat.key} className="contents">
          {i > 0 && <span className="text-border/40 dark:text-white/[0.06]">&middot;</span>}
          <button
            type="button"
            onClick={() => onFilterClick?.(stat.key === activeFilter ? "all" : stat.key)}
            className={cn(
              "flex items-center gap-1.5 text-xs text-muted-foreground rounded-md px-1.5 py-0.5 transition-all",
              onFilterClick && "hover:bg-muted/30 cursor-pointer",
              !onFilterClick && "cursor-default",
              activeFilter === stat.key && stat.key !== "all" && "ring-1 ring-primary/30 bg-primary/[0.04]"
            )}
          >
            {stat.dot && (
              <span className={cn("w-1.5 h-1.5 rounded-full", getCandidateStatusDot(stat.dot))} />
            )}
            <span className="font-medium tabular-nums text-foreground">{counts[stat.key]}</span>
            <span className="text-muted-foreground/60">{stat.label}</span>
          </button>
        </span>
      ))}
    </div>
  );
}
