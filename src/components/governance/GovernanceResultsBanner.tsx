"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Users, Target } from "lucide-react";

interface GovernanceResultsBannerProps {
  outcome: "passed" | "rejected";
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
    <Card
      className={`border-2 ${
        isPassed ? "border-green-500 bg-green-500/5" : "border-red-500 bg-red-500/5"
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          {isPassed ? (
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          ) : (
            <XCircle className="w-10 h-10 text-red-500" />
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold">
              Proposal {isPassed ? "Passed" : "Rejected"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Voting has concluded
            </p>
          </div>
          <Badge
            variant={isPassed ? "default" : "destructive"}
            className="text-lg px-4 py-1.5"
          >
            {isPassed ? "PASSED" : "REJECTED"}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                Approval
              </span>
            </div>
            <p className="text-2xl font-bold">{approvalPercent.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">
                Voters
              </span>
            </div>
            <p className="text-2xl font-bold">
              {voterCount}
              {totalEligible ? `/${totalEligible}` : ""}
            </p>
          </div>
          <div className="text-center">
            <span className="text-xs font-medium text-muted-foreground">
              Quorum
            </span>
            <p className="text-2xl font-bold">
              <Badge variant={quorumReached ? "default" : "destructive"}>
                {quorumReached ? "Reached" : "Not Met"}
              </Badge>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
