"use client";

import { Loader2, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

export interface ReviewNavigationProps {
  currentStep: number;
  isReviewing: boolean;
  isCommitting: boolean;
  isCommitPhase: boolean;
  onClose: () => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
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
}: ReviewNavigationProps) {
  if (currentStep === 1) {
    return (
      <div className="relative flex gap-3 px-6 py-4 border-t border-border bg-card">
        <button
          onClick={onClose}
          className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
        >
          Cancel
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

  if (currentStep === 2) {
    return (
      <div className="relative flex gap-3 px-6 py-4 border-t border-border bg-card">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 flex items-center justify-center gap-2"
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
    return (
      <div className="relative flex gap-3 px-6 py-4 border-t border-border bg-card">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={isReviewing || isCommitting}
          className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isReviewing || isCommitting ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              {isCommitting ? "Committing..." : "Submitting..."}
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              {isCommitPhase ? "Submit Commitment" : "Submit Review"}
            </>
          )}
        </button>
      </div>
    );
  }

  // Step 4
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
