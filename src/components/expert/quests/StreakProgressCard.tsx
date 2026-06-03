"use client";

import { Check } from "lucide-react";
import { SegmentedProgress } from "@/components/expert/quests/SegmentedProgress";
import { cn } from "@/lib/utils";
import type { StreakProgress } from "@/types";

interface StreakProgressCardProps {
  streak: StreakProgress;
  /** Compact variant for the dashboard widget (no card chrome, tighter spacing). */
  compact?: boolean;
}

interface MilestoneRowProps {
  label: string;
  completed: number;
  total: number;
  reward: string;
  eligible: boolean;
}

function MilestoneRow({ label, completed, total, reward, eligible }: MilestoneRowProps) {
  const capped = Math.min(completed, total);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          {eligible && <Check className="h-3.5 w-3.5 shrink-0 text-positive" />}
          {label}{" "}
          <span className="font-medium text-muted-foreground tabular-nums">
            ({capped}/{total})
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 text-xs font-semibold tabular-nums",
            eligible ? "text-positive" : "text-primary",
          )}
        >
          {reward}
        </span>
      </div>
      <SegmentedProgress completed={capped} total={total} hideCaption />
    </div>
  );
}

/**
 * Two-milestone allocation progress (VET-115), replacing the daily StreakTracker.
 * - Complete 10 Quests -> 500 VETD
 * - Share 5 approved answers -> +300 VETD bonus
 * Both are ALLOCATED, paid once the expert joins a Guild.
 */
export function StreakProgressCard({ streak, compact = false }: StreakProgressCardProps) {
  const body = (
    <div className={cn(compact ? "space-y-3" : "space-y-4")}>
      <MilestoneRow
        label="Complete 10 Quests"
        completed={streak.completedQuestsCount}
        total={streak.streak1Required}
        reward={`${streak.streak1Vetd} VETD`}
        eligible={streak.streak1Eligible}
      />
      <MilestoneRow
        label="Share 5 approved answers"
        completed={streak.approvedSharedAnswersCount}
        total={streak.streak2Required}
        reward={`+${streak.streak2Vetd} VETD bonus`}
        eligible={streak.streak2Eligible}
      />
      <p className={cn("text-xs text-muted-foreground", compact ? "" : "pt-1")}>
        {streak.streak1Vetd} + {streak.streak2Vetd} bonus, allocated once you join a Guild.
      </p>
    </div>
  );

  if (compact) return body;

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
      <div className="absolute left-0 right-0 top-0 h-[2px] bg-primary/60" />
      <h2 className="mb-4 text-sm font-bold text-foreground">Your allocation progress</h2>
      {body}
    </section>
  );
}
