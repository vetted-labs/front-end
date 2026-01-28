"use client";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  trend?: string | number;
  trendDirection?: "up" | "down" | "neutral";
  badge?: {
    text: string;
    variant: "warning" | "success" | "info";
  };
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconBgColor = "bg-primary/10",
  iconColor = "text-primary",
  trend,
  trendDirection = "neutral",
  badge,
}: StatCardProps) {
  const badgeStyles = {
    warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-300",
    success: "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300",
  };

  const trendStyles = {
    up: "text-green-600 dark:text-green-400",
    down: "text-red-600 dark:text-red-400",
    neutral: "text-muted-foreground",
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-md border border-border hover:shadow-lg transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        {trend && (
          <span className={`text-sm font-semibold ${trendStyles[trendDirection]}`}>
            {trendDirection === "up" && "↑ "}
            {trendDirection === "down" && "↓ "}
            {trend}
          </span>
        )}
        {badge && (
          <span className={`px-2 py-1 border text-xs font-semibold rounded-full ${badgeStyles[badge.variant]}`}>
            {badge.text}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}
