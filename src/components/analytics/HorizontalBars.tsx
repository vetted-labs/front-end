"use client";

import { cn } from "@/lib/utils";
import type { SourceData } from "./mock-data";

interface HorizontalBarsProps {
  data: SourceData[];
}

export function HorizontalBars({ data }: HorizontalBarsProps) {
  return (
    <div className="flex flex-col gap-[18px]">
      {data.map((item, i) => {
        const isFirst = i === 0;
        // Decreasing opacity for muted bars
        const mutedOpacity = Math.max(0.08, 0.35 - i * 0.1);
        const mutedEndOpacity = Math.max(0.03, mutedOpacity * 0.22);

        return (
          <div key={item.label}>
            {/* Label + value row */}
            <div className="flex justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">
                {item.label}
              </span>
              <span
                className={cn(
                  "text-[13px] font-mono font-semibold",
                  isFirst ? "text-primary" : "text-foreground"
                )}
              >
                {item.pct}%
              </span>
            </div>

            {/* Bar */}
            <div className="h-2.5 bg-white/[0.015] rounded-[5px] overflow-hidden">
              <div
                className="h-full rounded-[5px]"
                style={{
                  width: `${Math.max(item.pct, 1)}%`,
                  background: isFirst
                    ? "linear-gradient(90deg, rgba(255,106,0,0.45), rgba(255,106,0,0.1))"
                    : `linear-gradient(90deg, rgba(124,136,152,${mutedOpacity}), rgba(124,136,152,${mutedEndOpacity}))`,
                  minWidth: item.pct < 2 ? "6px" : undefined,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
