"use client";

import { cn } from "@/lib/utils";

interface SegmentedProgressProps {
  completed: number;
  total: number;
  className?: string;
}

/** Segmented "{completed}/{total} Completed" bar (VET-112). */
export function SegmentedProgress({ completed, total, className }: SegmentedProgressProps) {
  const segments = Math.max(total, 1);
  return (
    <div className={className}>
      <div className="flex gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i < completed ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs font-medium text-muted-foreground tabular-nums">
        {completed}/{total} Completed
      </p>
    </div>
  );
}
