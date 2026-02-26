"use client";

import { Badge } from "@/components/ui/badge";
import { formatDeadline } from "@/lib/utils";

interface CommitRevealStatusCardProps {
  phase: "commit" | "reveal" | "finalized";
  deadline?: string;
  userStatus: "pending" | "committed" | "revealed";
  commitCount: number;
  revealCount: number;
  totalExpected: number;
}

export function CommitRevealStatusCard({
  phase,
  deadline,
  userStatus,
  commitCount,
  revealCount,
  totalExpected,
}: CommitRevealStatusCardProps) {
  const statusLabels = {
    pending: "Not Yet Committed",
    committed: "Committed",
    revealed: "Revealed",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Commit-Reveal Status
        </h3>
        <Badge variant="outline">{phase}</Badge>
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
          <Badge variant="outline">{statusLabels[userStatus]}</Badge>
        </div>

        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Committed</span>
            <span className="font-medium tabular-nums">{commitCount} / {totalExpected}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${totalExpected > 0 ? (commitCount / totalExpected) * 100 : 0}%` }}
            />
          </div>

          {phase === "reveal" && (
            <>
              <div className="flex items-center justify-between mt-2">
                <span className="text-muted-foreground">Revealed</span>
                <span className="font-medium tabular-nums">{revealCount} / {totalExpected}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${totalExpected > 0 ? (revealCount / totalExpected) * 100 : 0}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
