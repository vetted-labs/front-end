"use client";

import { cn } from "@/lib/utils";

export type TimePeriod = "30D" | "90D" | "YTD" | "All";

const PERIODS: TimePeriod[] = ["30D", "90D", "YTD", "All"];

interface TimeFilterProps {
  value?: TimePeriod;
  onChange?: (period: TimePeriod) => void;
  dateRange?: string;
}

export function TimeFilter({
  value = "30D",
  onChange,
  dateRange,
}: TimeFilterProps) {
  return (
    <div className="flex items-center gap-1.5">
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange?.(p)}
          className={cn(
            "px-3.5 py-[5px] rounded-full text-xs font-medium border transition-all duration-200",
            "font-sans",
            p === value
              ? "bg-primary/10 border-primary/20 text-primary shadow-[0_0_12px_rgba(255,106,0,0.06)]"
              : "border-border bg-transparent text-muted-foreground hover:border-white/10 hover:text-foreground/50"
          )}
        >
          {p}
        </button>
      ))}

      {dateRange && (
        <>
          <div className="flex-1" />
          <span className="text-[11px] text-muted-foreground font-mono">
            {dateRange}
          </span>
        </>
      )}
    </div>
  );
}
