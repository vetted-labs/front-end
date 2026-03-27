"use client";

import { STATUS_COLORS, STAT_ICON } from "@/config/colors";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextVariant?: "default" | "success" | "warning";
  warningDot?: boolean;
  icon?: LucideIcon;
  accentColor?: "primary" | "positive" | "info" | "warning";
  progress?: { current: number; target: number };
}

export function StatCard({
  label,
  value,
  subtext,
  subtextVariant = "default",
  warningDot = false,
  icon: Icon,
  accentColor = "primary",
  progress,
}: StatCardProps) {
  const subtextColors = {
    default: "text-muted-foreground",
    success: STATUS_COLORS.positive.text,
    warning: STATUS_COLORS.warning.text,
  };

  const accentBar: Record<string, string> = {
    primary: "bg-primary",
    positive: "bg-positive",
    info: "bg-info-blue",
    warning: "bg-warning",
  };

  return (
    <div className="relative bg-card border border-border rounded-xl p-5 overflow-hidden">
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${accentBar[accentColor]} opacity-60`} />

      <div className="flex items-center justify-between mb-3">
        {Icon && (
          <div className={`w-9 h-9 rounded-xl ${STAT_ICON.bg} flex items-center justify-center`}>
            <Icon className={`w-[18px] h-[18px] ${STAT_ICON.text}`} />
          </div>
        )}
        {warningDot && (
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS.warning.dot}`} />
        )}
      </div>

      <div className="text-3xl font-display font-bold text-foreground tracking-tight leading-none mb-1.5">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {subtext && (
          <span className={`text-xs font-medium ${subtextColors[subtextVariant]}`}>
            {subtext}
          </span>
        )}
      </div>

      {/* Progress bar for target-based metrics */}
      {progress && (
        <div className="flex items-center gap-2.5 mt-3">
          <div className="flex-1 h-1.5 bg-border/20 dark:bg-muted/40 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-positive transition-all duration-1000"
              style={{ width: `${Math.min((progress.current / progress.target) * 100, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground/60 tabular-nums whitespace-nowrap">
            {progress.current} / {progress.target}
          </span>
        </div>
      )}
    </div>
  );
}
