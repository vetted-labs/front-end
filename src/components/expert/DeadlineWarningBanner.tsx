"use client";

import { AlertTriangle } from "lucide-react";
import { CountdownBadge } from "@/components/ui/countdown-badge";

interface DeadlineWarningBannerProps {
  deadline: Date | string;
  phase: "commit" | "reveal";
}

export function DeadlineWarningBanner({ deadline, phase }: DeadlineWarningBannerProps) {
  const deadlineDate = new Date(deadline);
  const hoursRemaining = (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursRemaining > 24 || hoursRemaining <= 0) return null;

  const message =
    phase === "commit"
      ? "You need to commit your vote before the deadline or your review won't count."
      : "You need to reveal your vote or it won't be included in consensus. This affects your reputation.";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 mb-4">
      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{message}</p>
      </div>
      <CountdownBadge deadline={deadline} label={`${phase} deadline`} />
    </div>
  );
}
