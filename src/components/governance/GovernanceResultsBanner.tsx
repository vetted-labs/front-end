"use client";

import { Check, X } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import type { GovernanceOutcome } from "@/types";

interface GovernanceResultsBannerProps {
  outcome: GovernanceOutcome;
  approvalPercent: number;
  quorumReached: boolean;
  voterCount: number;
  totalEligible?: number;
}

export function GovernanceResultsBanner({
  outcome,
  approvalPercent,
  quorumReached,
  voterCount,
  totalEligible,
}: GovernanceResultsBannerProps) {
  const isPassed = outcome === "passed";
  const statusColor = isPassed ? STATUS_COLORS.positive : STATUS_COLORS.negative;

  return (
    <div
      className={`rounded-2xl border ${statusColor.border} ${statusColor.bgSubtle} p-6 sm:p-8 relative overflow-hidden`}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent pointer-events-none" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${statusColor.bgSubtle} border ${statusColor.border} flex items-center justify-center shrink-0`}>
            {isPassed ? (
              <Check className={`w-5 h-5 ${statusColor.text}`} />
            ) : (
              <X className={`w-5 h-5 ${statusColor.text}`} />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">
              Proposal {isPassed ? "Passed" : "Rejected"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Voting concluded &middot; {voterCount}
              {totalEligible ? `/${totalEligible}` : ""} voters &middot; Quorum{" "}
              {quorumReached ? "reached" : "not met"}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-3xl font-bold tabular-nums font-mono ${statusColor.text}`}>
            {approvalPercent.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">approval</p>
        </div>
      </div>
    </div>
  );
}
