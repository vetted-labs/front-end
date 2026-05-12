"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EndorseStep, EndorseModalMode } from "./constants";

export interface EndorseNavigationProps {
  currentStep: EndorseStep;
  mode: EndorseModalMode;
  /** When true, all navigation is locked (transaction in flight). */
  locked: boolean;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}

/**
 * Footer navigation for the endorse modal.
 *
 *   step 1: Cancel + Next
 *   step 2: Back + Next
 *   step 3 (endorse mode): Back + Next (forward to stake)
 *   step 3 (view mode): Back + Close (no stake step)
 *   step 4: Back + (StakeStep owns its own Submit button)
 *
 * Locked = transaction in flight; all buttons disabled.
 */
export function EndorseNavigation({
  currentStep,
  mode,
  locked,
  onBack,
  onNext,
  onClose,
}: EndorseNavigationProps) {
  if (currentStep === 1) {
    return (
      <div className="relative flex gap-3 px-6 py-4 border-t border-border bg-card">
        <button
          onClick={onClose}
          disabled={locked}
          className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={onNext}
          disabled={locked}
          className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (currentStep === 3 && mode === "view") {
    return (
      <div className="relative flex gap-3 px-6 py-4 border-t border-border bg-card">
        <button
          onClick={onBack}
          disabled={locked}
          className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
        >
          Close
        </button>
      </div>
    );
  }

  if (currentStep === 4) {
    // StakeStep owns its own submit affordance. Footer just renders Back.
    return (
      <div className="relative flex gap-3 px-6 py-4 border-t border-border bg-card">
        <button
          onClick={onBack}
          disabled={locked}
          className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    );
  }

  // step 2 or step 3 in endorse mode
  return (
    <div className="relative flex gap-3 px-6 py-4 border-t border-border bg-card">
      <button
        onClick={onBack}
        disabled={locked}
        className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>
      <button
        onClick={onNext}
        disabled={locked}
        className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
