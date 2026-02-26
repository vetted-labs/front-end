"use client";

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

  return (
    <div
      className={`border-l-4 ${
        isPassed ? "border-l-green-500" : "border-l-red-500"
      } bg-card border border-border rounded-xl p-6`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1">
            Proposal {isPassed ? "Passed" : "Rejected"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Voting concluded &middot; {voterCount}{totalEligible ? `/${totalEligible}` : ""} voters &middot; Quorum {quorumReached ? "reached" : "not met"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-4xl font-bold tabular-nums">{approvalPercent.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">approval</p>
        </div>
      </div>
    </div>
  );
}
