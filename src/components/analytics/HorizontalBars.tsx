"use client";

import { cn } from "@/lib/utils";

export interface SourceData {
  label: string;
  pct: number;
  hireRate?: string;
}

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
            <div className="h-2.5 bg-foreground/[0.02] rounded-[5px] overflow-hidden">
              <div
                className="h-full rounded-[5px]"
                style={{
                  width: `${Math.max(item.pct, 1)}%`,
                  background: isFirst
                    ? "linear-gradient(90deg, hsl(var(--primary) / 0.45), hsl(var(--primary) / 0.1))"
                    : `linear-gradient(90deg, hsl(var(--muted-foreground) / ${mutedOpacity}), hsl(var(--muted-foreground) / ${mutedEndOpacity}))`,
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
