"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, Circle } from "lucide-react";

interface CommitRevealPhaseIndicatorProps {
  currentPhase: "direct" | "commit" | "reveal" | "finalized";
  commitDeadline?: string;
  revealDeadline?: string;
  commitCount?: number;
  revealCount?: number;
  totalExpected?: number;
}

const PHASES = [
  { key: "direct", label: "Open" },
  { key: "commit", label: "Commit" },
  { key: "reveal", label: "Reveal" },
  { key: "finalized", label: "Finalized" },
] as const;

function getTimeRemaining(deadline: string) {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return "Ended";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function CommitRevealPhaseIndicator({
  currentPhase,
  commitDeadline,
  revealDeadline,
  commitCount = 0,
  revealCount = 0,
  totalExpected = 0,
}: CommitRevealPhaseIndicatorProps) {
  if (currentPhase === "direct") return null;

  const currentIndex = PHASES.findIndex((p) => p.key === currentPhase);

  return (
    <Card className="border-orange-500/30 bg-orange-500/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Commit-Reveal Voting</p>
          <Badge variant="outline" className="border-orange-500/30 text-orange-500">
            {PHASES[currentIndex]?.label || currentPhase} Phase
          </Badge>
        </div>

        {/* Phase Timeline */}
        <div className="flex items-center gap-1 mb-3">
          {PHASES.map((phase, index) => {
            const isPast = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isFuture = index > currentIndex;

            return (
              <div key={phase.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    {index > 0 && (
                      <div
                        className={`h-0.5 flex-1 ${
                          isPast || isCurrent ? "bg-green-500" : "bg-muted"
                        }`}
                      />
                    )}
                    <div className="flex-shrink-0">
                      {isPast ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : isCurrent ? (
                        <div className="w-5 h-5 rounded-full bg-orange-500 animate-pulse" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    {index < PHASES.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 ${isPast ? "bg-green-500" : "bg-muted"}`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1 ${
                      isCurrent
                        ? "font-semibold text-orange-500"
                        : isPast
                        ? "text-green-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {phase.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {currentPhase === "commit" && commitDeadline && (
            <>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Commit ends in {getTimeRemaining(commitDeadline)}
              </span>
              <span>
                {commitCount}/{totalExpected} committed
              </span>
            </>
          )}
          {currentPhase === "reveal" && revealDeadline && (
            <>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Reveal ends in {getTimeRemaining(revealDeadline)}
              </span>
              <span>
                {revealCount}/{totalExpected} revealed
              </span>
            </>
          )}
          {currentPhase === "finalized" && (
            <span>Voting complete. Results are final.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
