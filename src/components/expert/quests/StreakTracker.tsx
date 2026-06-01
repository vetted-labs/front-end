"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUEST_DASHBOARD_TAGLINE } from "@/config/quests";
import { cn } from "@/lib/utils";
import type { QuestStreak } from "@/types";

interface StreakTrackerProps {
  streak: QuestStreak;
  onClaim?: () => void;
  claiming?: boolean;
  /** Compact variant for the dashboard widget (no claim button, fewer days). */
  compact?: boolean;
  maxDays?: number;
}

/**
 * Horizontal Day 1..7 streak tracker (connected dots + $VETD labels), adapted
 * from ui/step-progress. `currentDay` = days already claimed; the next claimable
 * day is highlighted as active.
 */
export function StreakTracker({
  streak,
  onClaim,
  claiming = false,
  compact = false,
  maxDays = 7,
}: StreakTrackerProps) {
  const schedule = streak.schedule.slice(0, maxDays);
  const len = schedule.length;
  // nextDay (1..7) is the day claim will actually pay — it already accounts for a
  // missed-day reset and the day-7→day-1 wrap. The dot for nextDay is "active" and
  // the days before it in this cycle are "done". When already claimed today, no dot
  // is active and currentDay dots (capped) show as done.
  const canClaimNext = streak.canClaim && streak.nextDay != null;
  const activeIndex = canClaimNext ? (streak.nextDay! - 1) % len : -1;
  const claimedDays = canClaimNext ? activeIndex : Math.min(streak.currentDay, len);

  return (
    <div>
      {!compact && (
        <p className="mb-4 text-sm text-primary">{QUEST_DASHBOARD_TAGLINE}</p>
      )}

      <div className="relative">
        {/* Connecting lines (behind dots) */}
        <div
          className="absolute top-4 left-0 right-0 flex items-center"
          style={{
            paddingLeft: `calc(100% / ${schedule.length} / 2)`,
            paddingRight: `calc(100% / ${schedule.length} / 2)`,
          }}
        >
          {schedule.slice(0, -1).map((_, index) => (
            <div
              key={index}
              className={cn("h-1 flex-1", index < claimedDays ? "bg-primary" : "bg-border")}
            />
          ))}
        </div>

        {/* Dots */}
        <div className="relative flex justify-between">
          {schedule.map((reward, index) => {
            const isDone = index < claimedDays;
            const isActive = index === activeIndex;
            return (
              <div key={index} className="flex flex-1 flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "border-2 border-border bg-muted text-muted-foreground",
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span className="mt-1 text-[10px] font-medium text-muted-foreground">
                  Day {index + 1}
                </span>
                <span className="text-[10px] font-semibold text-primary tabular-nums">
                  {reward} VETD
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {onClaim && (
        <div className="mt-4">
          <Button
            variant="default"
            size="sm"
            onClick={onClaim}
            isLoading={claiming}
            disabled={!streak.canClaim}
            className="w-full"
          >
            {streak.canClaim ? "Claim daily reward" : "Claimed today — come back tomorrow"}
          </Button>
        </div>
      )}
    </div>
  );
}
