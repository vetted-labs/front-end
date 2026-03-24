"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CandidateRejectionFeedback } from "@/types";

interface RejectionFeedbackCardProps {
  feedback: CandidateRejectionFeedback;
  onResubmit?: () => void;
}

export function RejectionFeedbackCard({ feedback, onResubmit }: RejectionFeedbackCardProps) {
  const [expanded, setExpanded] = useState(false);

  const scorePercent = feedback.maxScore > 0
    ? Math.round((feedback.overallScore / feedback.maxScore) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-red-500/5 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {feedback.guildName} — Review Feedback
            </p>
            <p className="text-xs text-muted-foreground">
              Score: {scorePercent}% — Tap to see reviewer feedback and improvement areas
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-red-500/10">
          {/* Score breakdown */}
          {feedback.criteriaAverages.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Score Breakdown
                </p>
              </div>
              <div className="space-y-2">
                {feedback.criteriaAverages.map((c) => {
                  const pct = c.maxScore > 0 ? Math.round((c.averageScore / c.maxScore) * 100) : 0;
                  return (
                    <div key={c.criterion}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground/80">{c.criterion}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {c.averageScore.toFixed(1)} / {c.maxScore} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviewer feedback */}
          {feedback.feedbackSummary.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Reviewer Feedback
                </p>
              </div>
              <div className="space-y-2">
                {feedback.feedbackSummary.map((fb, i) => (
                  <p key={i} className="text-sm text-foreground/80 bg-muted/30 rounded-lg px-3 py-2 border border-border/40">
                    {fb}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Improvement areas */}
          {feedback.improvementAreas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Areas for Improvement
                </p>
              </div>
              <ul className="space-y-1.5">
                {feedback.improvementAreas.map((area, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resubmit CTA */}
          {feedback.canResubmit && onResubmit && (
            <div className="pt-2 border-t border-red-500/10">
              <Button
                variant="outline"
                size="sm"
                onClick={onResubmit}
                className="gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Resubmit Application
              </Button>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                You have {1 - feedback.resubmissionCount} resubmission{1 - feedback.resubmissionCount !== 1 ? "s" : ""} remaining.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
