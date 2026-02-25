"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, CheckCircle2, AlertCircle } from "lucide-react";
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
  const statusColors = {
    pending: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    committed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    revealed: "bg-green-500/10 text-green-500 border-green-500/20",
  };

  const statusLabels = {
    pending: "Not Yet Committed",
    committed: "Committed",
    revealed: "Revealed",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Commit-Reveal Status
          <Badge variant="outline" className="border-orange-500/30 text-orange-500">
            {phase}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {deadline && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Deadline
            </span>
            <span className="text-sm font-medium">
              {formatDeadline(deadline, "Ended")}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Your Status</span>
          <Badge variant="outline" className={statusColors[userStatus]}>
            {userStatus === "committed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {userStatus === "revealed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {userStatus === "pending" && <AlertCircle className="w-3 h-3 mr-1" />}
            {statusLabels[userStatus]}
          </Badge>
        </div>

        <div className="space-y-2 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="w-4 h-4" />
              Committed
            </span>
            <span className="font-medium">
              {commitCount} / {totalExpected}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${totalExpected > 0 ? (commitCount / totalExpected) * 100 : 0}%` }}
            />
          </div>

          {phase === "reveal" && (
            <>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Revealed
                </span>
                <span className="font-medium">
                  {revealCount} / {totalExpected}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${totalExpected > 0 ? (revealCount / totalExpected) * 100 : 0}%` }}
                />
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
