"use client";

import { cn } from "@/lib/utils";

// Heat intensity classes matching the mockup exactly
const HEAT_CLASSES: Record<number, string> = {
  0: "bg-white/[0.015]",
  1: "bg-[rgba(255,106,0,0.06)]",
  2: "bg-[rgba(255,106,0,0.14)]",
  3: "bg-[rgba(255,106,0,0.25)]",
  4: "bg-[rgba(255,106,0,0.4)]",
  5: "bg-[rgba(255,106,0,0.6)] shadow-[0_0_8px_rgba(255,106,0,0.12)]",
};

interface HeatmapChartProps {
  data: number[][];
  rows: string[];
  cols: string[];
}

export function HeatmapChart({ data, rows, cols }: HeatmapChartProps) {
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
          <>
            {/* Row label */}
            <div
              key={`label-${rowIdx}`}
              className="text-[9px] text-muted-foreground/60 flex items-center justify-end pr-1.5 font-mono"
            >
              {rows[rowIdx]}
            </div>

            {/* Heat cells */}
            {row.map((val, colIdx) => (
              <div
                key={`cell-${rowIdx}-${colIdx}`}
                className={cn(
                  "aspect-square rounded min-h-[32px]",
                  "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  "cursor-pointer hover:scale-110 hover:z-10 hover:shadow-[0_0_12px_rgba(255,106,0,0.1)]",
                  HEAT_CLASSES[val] ?? HEAT_CLASSES[0]
                )}
              />
            ))}
          </>
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
