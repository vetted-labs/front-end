"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";

const HEAT_CLASSES: Record<number, string> = {
  0: "bg-foreground/[0.02]",
  1: "bg-primary/[0.06]",
  2: "bg-primary/[0.14]",
  3: "bg-primary/[0.25]",
  4: "bg-primary/[0.40]",
  5: "bg-primary/[0.60]",
};

const INTENSITY_LABELS: Record<number, string> = {
  0: "No activity",
  1: "Very low",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Very high",
};

interface HeatmapChartProps {
  data: number[][];
  rows: string[];
  cols: string[];
  /** Optional raw counts matching the same shape as `data` — shown in tooltip when available */
  rawData?: number[][];
}

export function HeatmapChart({ data, rows, cols, rawData }: HeatmapChartProps) {
  return (
    <div>
      {/* Grid: label column + 7 day columns */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}
      >
        {/* Header row */}
        <div /> {/* Empty corner cell */}
        {cols.map((col) => (
          <div
            key={col}
            className="text-[9px] text-muted-foreground/60 text-center pb-1 font-mono font-medium"
          >
            {col}
          </div>
        ))}

        {/* Data rows */}
        {data.map((row, rowIdx) => (
          <Fragment key={rows[rowIdx]}>
            {/* Row label */}
            <div
              className="text-[9px] text-muted-foreground/60 flex items-center justify-end pr-1.5 font-mono"
            >
              {rows[rowIdx]}
            </div>

            {/* Heat cells */}
            {row.map((val, colIdx) => {
              const rawCount = rawData?.[rowIdx]?.[colIdx];
              const tooltipText = rawCount != null
                ? `${cols[colIdx]} ${rows[rowIdx]} — ${rawCount} application${rawCount !== 1 ? "s" : ""}`
                : `${cols[colIdx]} ${rows[rowIdx]} — ${INTENSITY_LABELS[val] ?? INTENSITY_LABELS[0]}`;

              return (
                <div
                  key={`cell-${rowIdx}-${colIdx}`}
                  className="relative group"
                >
                  <div
                    className={cn(
                      "aspect-square rounded min-h-[32px]",
                      "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      "cursor-pointer group-hover:scale-110 group-hover:z-10",
                      HEAT_CLASSES[val] ?? HEAT_CLASSES[0]
                    )}
                    aria-label={tooltipText}
                  />
                  <div
                    role="tooltip"
                    className={cn(
                      "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50",
                      "px-2.5 py-1.5 rounded-lg",
                      "bg-popover text-popover-foreground border border-border shadow-lg",
                      "text-[11px] font-medium whitespace-nowrap",
                      "opacity-0 scale-95 pointer-events-none",
                      "group-hover:opacity-100 group-hover:scale-100",
                      "transition-all duration-150 ease-out"
                    )}
                  >
                    {tooltipText}
                  </div>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-[3px] mt-3.5 justify-end">
        <span className="text-[9px] text-muted-foreground/60 mr-[3px]">
          Less
        </span>
        {[0, 1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={cn(
              "w-3 h-3 rounded-[3px]",
              HEAT_CLASSES[level]
            )}
          />
        ))}
        <span className="text-[9px] text-muted-foreground/60 ml-[3px]">
          More
        </span>
      </div>
    </div>
  );
}
