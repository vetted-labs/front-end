"use client";

import { useState, useCallback, useEffect } from "react";
import { Award, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { getPersonAvatar } from "@/lib/avatars";
import { getMatchScoreColors } from "@/config/colors";
import type { CompanyApplication, ApplicationStatus } from "@/types";

interface FastReviewModalProps {
  candidates: CompanyApplication[];
  onStatusChange: (applicationId: string, newStatus: ApplicationStatus) => Promise<void>;
  onClose: () => void;
  getEndorsementCount: (app: CompanyApplication) => number;
  getMatchScore: (app: CompanyApplication) => number | undefined;
  endorserName?: (app: CompanyApplication) => string | undefined;
}

type Decision = "advanced" | "rejected" | "skipped";

export function FastReviewModal({
  candidates,
  onStatusChange,
  onClose,
  getEndorsementCount,
  getMatchScore,
  endorserName,
}: FastReviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Map<string, Decision>>(() => new Map());
  const [isActioning, setIsActioning] = useState(false);

  const isComplete = currentIndex >= candidates.length;
  const current = isComplete ? null : candidates[currentIndex];

  const advancedCount = Array.from(decisions.values()).filter((d) => d === "advanced").length;
  const rejectedCount = Array.from(decisions.values()).filter((d) => d === "rejected").length;
  const skippedCount = Array.from(decisions.values()).filter((d) => d === "skipped").length;

  const recordDecision = useCallback(
    (decision: Decision) => {
      if (!current) return;
      setDecisions((prev) => {
        const next = new Map(prev);
        next.set(current.id, decision);
        return next;
      });
    },
    [current]
  );

  const handleAdvance = useCallback(async () => {
    if (!current || isActioning) return;
    setIsActioning(true);
    try {
      await onStatusChange(current.id, "reviewing");
      recordDecision("advanced");
      setCurrentIndex((prev) => prev + 1);
    } catch {
      toast.error("Failed to advance candidate");
    } finally {
      setIsActioning(false);
    }
  }, [current, isActioning, onStatusChange, recordDecision]);

  const handleReject = useCallback(async () => {
    if (!current || isActioning) return;
    setIsActioning(true);
    try {
      await onStatusChange(current.id, "rejected");
      recordDecision("rejected");
      setCurrentIndex((prev) => prev + 1);
    } catch {
      toast.error("Failed to reject candidate");
    } finally {
      setIsActioning(false);
    }
  }, [current, isActioning, onStatusChange, recordDecision]);

  const handleSkip = useCallback(() => {
    if (!current || isActioning) return;
    recordDecision("skipped");
    setCurrentIndex((prev) => prev + 1);
  }, [current, isActioning, recordDecision]);

  // eslint-disable-next-line no-restricted-syntax -- keyboard shortcuts for fast review actions require a window-level event listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowRight" || e.key === "a") {
        handleAdvance();
      } else if (e.key === "ArrowLeft" || e.key === "r") {
        handleReject();
      } else if (e.key === "ArrowDown" || e.key === "s") {
        e.preventDefault();
        handleSkip();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAdvance, handleReject, handleSkip]);

  const progressPct = candidates.length > 0 ? (currentIndex / candidates.length) * 100 : 0;

  return (
    <Modal isOpen onClose={onClose} size="md">
      <div className="flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">Fast Review</h2>
          {!isComplete && (
            <span className="text-sm font-medium text-muted-foreground tabular-nums">
              {currentIndex + 1} of {candidates.length}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 rounded-full bg-muted/40 mb-8">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {isComplete ? (
          /* ── Completion Summary ──────────────────────────────── */
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-14 h-14 rounded-full bg-positive/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-positive" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Review complete</h3>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-positive font-medium">{advancedCount} advanced</span>
              <span className="text-negative font-medium">{rejectedCount} rejected</span>
              <span className="text-muted-foreground font-medium">{skippedCount} skipped</span>
            </div>
            <Button onClick={onClose} className="mt-4">
              Done
            </Button>
          </div>
        ) : current ? (
          /* ── Candidate Card ─────────────────────────────────── */
          <div className="flex flex-col items-center w-full">
            {/* Avatar */}
            <img
              src={getPersonAvatar(current.candidate.fullName)}
              alt={current.candidate.fullName}
              className="w-16 h-16 rounded-full border-2 border-border bg-muted mb-3"
            />

            {/* Name */}
            <h3 className="text-lg font-bold text-foreground text-center">
              {current.candidate.fullName}
            </h3>

            {/* Headline */}
            {current.candidate.headline && (
              <p className="text-sm text-muted-foreground text-center mt-0.5">
                {current.candidate.headline}
              </p>
            )}

            {/* Job title */}
            <p className="text-xs text-muted-foreground/60 text-center mt-1">
              {current.job.title}
            </p>

            {/* Badges row */}
            <div className="flex items-center gap-3 mt-4">
              {/* Endorsement badge */}
              {getEndorsementCount(current) > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-positive/10 text-positive border border-positive/20">
                  <Award className="w-3.5 h-3.5" />
                  {getEndorsementCount(current)}
                  {endorserName?.(current) && (
                    <span className="text-positive/70">
                      &middot; {endorserName(current)}
                    </span>
                  )}
                </span>
              )}

              {/* Match score badge */}
              {(() => {
                const score = getMatchScore(current);
                if (score === undefined) return null;
                const colors = getMatchScoreColors(score);
                return (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border",
                      colors.bgSubtle,
                      colors.text,
                      colors.border
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {score}% match
                  </span>
                );
              })()}
            </div>

            {/* Cover letter preview */}
            {current.coverLetter && (
              <p className="text-sm text-muted-foreground text-center mt-5 px-4 italic leading-relaxed line-clamp-3">
                &ldquo;{current.coverLetter.slice(0, 200)}
                {current.coverLetter.length > 200 ? "..." : ""}&rdquo;
              </p>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-8 w-full">
              <Button
                onClick={handleReject}
                disabled={isActioning}
                className="flex-1 bg-negative/10 text-negative hover:bg-negative/20 border border-negative/20 shadow-none"
              >
                Reject
              </Button>
              <Button
                onClick={handleSkip}
                disabled={isActioning}
                className="flex-1 bg-muted/40 text-muted-foreground hover:bg-muted/60 shadow-none"
              >
                Skip
              </Button>
              <Button
                onClick={handleAdvance}
                disabled={isActioning}
                isLoading={isActioning}
                className="flex-1 bg-positive text-white hover:bg-positive/90"
              >
                Advance
              </Button>
            </div>

            {/* Keyboard hints */}
            <div className="flex items-center gap-6 mt-3 mb-2">
              <span className="text-[10px] text-muted-foreground/40 font-mono">
                &larr; r
              </span>
              <span className="text-[10px] text-muted-foreground/40 font-mono">
                &darr; s
              </span>
              <span className="text-[10px] text-muted-foreground/40 font-mono">
                &rarr; a
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
