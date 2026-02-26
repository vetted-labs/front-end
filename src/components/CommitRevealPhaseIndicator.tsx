"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { formatDeadline } from "@/lib/utils";

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
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Commit-Reveal Voting
        </p>
        <Badge variant="outline">
          {PHASES[currentIndex]?.label || currentPhase} Phase
        </Badge>
      </div>

      {/* Phase Timeline */}
      <div className="flex items-center gap-1 mb-3">
        {PHASES.map((phase, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={phase.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {index > 0 && (
                    <div
                      className={`h-0.5 flex-1 rounded-full ${
                        isPast || isCurrent ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                  <div className="flex-shrink-0">
                    {isPast ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full bg-primary" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/40" />
                    )}
                  </div>
                  {index < PHASES.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 rounded-full ${
                        isPast ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`text-xs mt-1 ${
                    isCurrent
                      ? "font-semibold text-foreground"
                      : isPast
                      ? "text-green-500"
                      : "text-muted-foreground/60"
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
            <span>Commit ends in {formatDeadline(commitDeadline, "Ended")}</span>
            <span>{commitCount}/{totalExpected} committed</span>
          </>
        )}
        {currentPhase === "reveal" && revealDeadline && (
          <>
            <span>Reveal ends in {formatDeadline(revealDeadline, "Ended")}</span>
            <span>{revealCount}/{totalExpected} revealed</span>
          </>
        )}
        {currentPhase === "finalized" && (
          <span>Voting complete. Results are final.</span>
        )}
      </div>
    </div>
  );
}
