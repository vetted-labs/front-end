"use client";

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
    default: "text-zinc-500",
    success: "text-emerald-400",
    warning: "text-amber-500",
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-[18px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">
          {label}
        </span>
        {warningDot && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        )}
      </div>
      <div className="text-[28px] font-bold text-zinc-50 tracking-tight mt-1.5">
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
