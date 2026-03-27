"use client";

import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";

type StatusType = "positive" | "negative" | "warning" | "info" | "neutral" | "pending";

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({ status, label, pulse = false, className }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
        colors.badge,
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          colors.dot,
          pulse && "animate-pulse"
        )}
      />
      {label}
    </span>
  );
}
