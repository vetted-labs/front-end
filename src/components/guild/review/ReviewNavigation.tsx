"use client";

import { Loader2, CheckCircle, ChevronLeft, ChevronRight, Lock } from "lucide-react";

export interface ReviewNavigationProps {
  currentStep: number;
  isReviewing: boolean;
  isCommitting: boolean;
  isCommitPhase: boolean;
  onClose: () => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  canClose?: boolean;
  submitLabel?: string;
  /**
   * When true, the submit button on step 3 is rendered disabled regardless of
   * isReviewing / isCommitting state. Used by the modal to gate submission on
   * pre-submit validation.
   */
  submitDisabled?: boolean;
  /**
   * Tooltip shown on the disabled submit button when `submitDisabled` is true.
   */
  submitDisabledTooltip?: string;
  /**
   * When true, the inline confirmation card (or active commit flow) is owning
   * the action surface. The footer collapses to a minimal Back + non-actionable
   * hint so the user sees a single submit affordance, not two competing ones.
   */
  confirmingInline?: boolean;
  /**
   * Optional data-* attributes to spread onto the submit button (step 3). Used
   * by the expert onboarding tour / story-lab driver to mark the practice
   * review submit affordance without leaking markers into real flows.
   */
  tourMarkerProps?: Record<string, string>;
  /**
   * Step 4 has two modes:
   *  - `"confirm"`: pre-submit confirmation surface. Footer renders Back +
   *    Submit (matching step 3's old behaviour). The user has not yet
   *    submitted and can still revise scores.
   *  - `"done"`: post-submit receipt. Footer renders a single Done button.
   * Defaults to `"done"` for back-compat with the legacy success-only flow.
   */
  step4Mode?: "confirm" | "done";
}

export function ReviewNavigation({
  currentStep,
  isReviewing,
  isCommitting,
  isCommitPhase,
  onClose,
  onNext,
  onBack,
  onSubmit,
  canClose = true,
  submitLabel,
  submitDisabled = false,
  submitDisabledTooltip,
  confirmingInline = false,
  tourMarkerProps,
  step4Mode = "done",
}: ReviewNavigationProps) {
  if (currentStep === 1) {
    return (
      <div className="relative flex gap-3 px-6 py-4 border-t border-border bg-card">
        {canClose && (
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
          >
            Cancel
          </button>
        )}
        <button
          onClick={onNext}
          className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (currentStep === 2) {
    return (
      <div className="relative flex gap-3 px-6 py-4 border-t border-border bg-card">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (currentStep === 3) {
    // Step 3 is now scoring + summary only. Next advances to step 4 — the
    // pre-submit confirmation surface that owns the Submit action.
    return (
      <div className="relative flex gap-3 px-6 py-4 border-t border-border bg-card">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Step 4 — `"done"` is the post-submit receipt; `"confirm"` is the
  // pre-submit confirmation surface (old step-3 submit behaviour).
  if (step4Mode === "confirm") {
    const inFlight = isReviewing || isCommitting;

    if (confirmingInline) {
      const hint = isCommitting
        ? "Awaiting on-chain confirmation…"
        : "Confirm above to sign";
      return (
        <div className="relative flex items-center gap-3 px-6 py-4 border-t border-border bg-card">
          <button
            onClick={onBack}
            disabled={isCommitting}
            aria-disabled={isCommitting || undefined}
            className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <span
            role="status"
            aria-live="polite"
            className="flex-[2] py-3 px-4 rounded-xl border border-dashed border-border bg-muted/30 text-sm font-medium text-muted-foreground flex items-center justify-center gap-2"
          >
            {isCommitting && <Loader2 className="animate-spin w-4 h-4" />}
            {hint}
          </span>
        </div>
      );
    }

    const disabled = inFlight || submitDisabled;
    const showLockHint = submitDisabled && !inFlight;
    return (
      <div className="relative flex gap-3 px-6 py-4 border-t border-border bg-card">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={disabled}
          aria-disabled={disabled || undefined}
          title={showLockHint ? submitDisabledTooltip ?? "Resolve the issues above to submit" : undefined}
          className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          {...(tourMarkerProps ?? {})}
        >
          {inFlight ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              {isCommitting ? "Committing..." : "Submitting..."}
            </>
          ) : showLockHint ? (
            <>
              <Lock className="w-4 h-4" />
              {submitLabel ?? (isCommitPhase ? "Submit Commitment" : "Submit Review")}
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              {submitLabel ?? (isCommitPhase ? "Submit Commitment" : "Submit Review")}
            </>
          )}
        </button>
      </div>
    );
  }

  // Step 4 done — post-submit receipt
  return (
    <div className="relative flex gap-3 px-6 py-4 border-t border-border bg-card">
      <button
        onClick={onClose}
        className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
      >
        Done
      </button>
    </div>
  );
}
