"use client";

import { Badge } from "@/components/ui/badge";
import { formatDeadline } from "@/lib/utils";
import { COMMIT_REVEAL_STATUS_LABELS } from "@/config/constants";

interface CommitRevealStatusCardProps {
  phase: "commit" | "finalized";
  deadline?: string;
  userStatus: "pending" | "committed";
  commitCount: number;
  totalExpected: number;
}

export function CommitRevealStatusCard({
  phase,
  deadline,
  userStatus,
  commitCount,
  totalExpected,
}: CommitRevealStatusCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Voting Status
        </h3>
        <Badge variant="outline">{phase === "commit" ? "In Progress" : "Finalized"}</Badge>
      </div>

      <div className="space-y-3 text-sm">
        {deadline && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Deadline</span>
            <span className="font-medium">{formatDeadline(deadline, "Ended")}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Your Status</span>
          <Badge variant="outline">{COMMIT_REVEAL_STATUS_LABELS[userStatus]}</Badge>
        </div>

        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Voted</span>
            <span className="font-medium tabular-nums">{commitCount} / {totalExpected}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${totalExpected > 0 ? (commitCount / totalExpected) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
