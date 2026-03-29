"use client";

import { Check, Circle } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import type { CompletionItem } from "@/lib/profileCompletion";

/* ── Profile Ring SVG ── */

export function ProfileRing({ percentage, size = 110 }: { percentage: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-border/20"
          strokeWidth={5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-primary"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-display text-primary tabular-nums">{percentage}%</span>
        <span className="text-xs text-muted-foreground">Complete</span>
      </div>
    </div>
  );
}

/* ── Profile Completion Banner ── */

export function ProfileCompletionBanner({
  percentage,
  items,
}: {
  percentage: number;
  items: CompletionItem[];
}) {
  if (percentage >= 100) return null;

  const incomplete = items.filter((i) => !i.done);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-6 py-5 flex flex-col sm:flex-row items-center gap-5">
        <ProfileRing percentage={percentage} size={90} />
        <div className="flex-1">
          <h2 className="text-sm font-bold text-foreground font-display uppercase tracking-wider mb-3">
            Complete your profile
          </h2>
          <div className="space-y-1.5">
            {items.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2.5 text-sm ${
                  item.done ? "text-muted-foreground" : "text-foreground font-medium"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                    item.done ? STATUS_COLORS.positive.bgSubtle : "bg-muted/40"
                  }`}
                >
                  {item.done ? (
                    <Check className={`w-3 h-3 ${STATUS_COLORS.positive.icon}`} />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground/40" />
                  )}
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          {incomplete.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              {incomplete.length} {incomplete.length === 1 ? "item" : "items"} remaining to complete your profile
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
