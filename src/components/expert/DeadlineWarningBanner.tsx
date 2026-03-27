"use client";

import { AlertTriangle } from "lucide-react";
import { CountdownBadge } from "@/components/ui/countdown-badge";
import { STATUS_COLORS } from "@/config/colors";

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
    <div className={`flex items-center gap-3 rounded-lg border ${STATUS_COLORS.warning.border} ${STATUS_COLORS.warning.bgSubtle} p-3 mb-4`}>
      <AlertTriangle className={`h-5 w-5 ${STATUS_COLORS.warning.icon} shrink-0`} />
      <div className="flex-1">
        <p className={`text-sm font-medium ${STATUS_COLORS.warning.text}`}>{message}</p>
      </div>
      <CountdownBadge deadline={deadline} label={`${phase} deadline`} />
    </div>
  );
}
