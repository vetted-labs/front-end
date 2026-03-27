"use client";

import { STATUS_COLORS } from "@/config/colors";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextVariant?: "default" | "success" | "warning";
  warningDot?: boolean;
}

export function StatCard({
  label,
  value,
  subtext,
  subtextVariant = "default",
  warningDot = false,
}: StatCardProps) {
  const subtextColors = {
    default: "text-muted-foreground",
    success: STATUS_COLORS.positive.text,
    warning: STATUS_COLORS.warning.text,
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-[18px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        {warningDot && (
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS.warning.dot}`} />
        )}
      </div>
      <div className="text-[28px] font-bold text-foreground tracking-tight mt-1.5">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {subtext && (
        <div className={`text-[11px] mt-1 ${subtextColors[subtextVariant]}`}>
          {subtext}
        </div>
      )}
    </div>
  );
}
