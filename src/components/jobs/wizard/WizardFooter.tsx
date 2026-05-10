"use client";

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { TOTAL_STEPS } from "@/hooks/useJobWizard";

interface WizardFooterProps {
  currentStep: number;
  isSubmitting: boolean;
  /** Whether the publish button should be enabled on step 7. */
  canPublish: boolean;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

/**
 * Sticky footer for the wizard. Left side surfaces a thin progress bar and
 * the "Step X of 7 · Y% complete" label. Right side hosts the three actions
 * — Save draft / Back / Continue — with the primary swapping to "Publish job"
 * on the final step.
 */
export function WizardFooter({
  currentStep,
  isSubmitting,
  canPublish,
  onBack,
  onNext,
  onSaveDraft,
  onPublish,
}: WizardFooterProps) {
  const isLast = currentStep === TOTAL_STEPS;
  const pct = Math.round((currentStep / TOTAL_STEPS) * 100);

  return (
    <div className="border-t border-border bg-background px-8 py-4 flex justify-between items-center sticky bottom-0">
      <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
        <div className="w-44 h-1 bg-muted rounded-sm overflow-hidden">
          <div
            className="h-full bg-primary rounded-sm transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span>
          {isLast
            ? `Step ${currentStep} of ${TOTAL_STEPS} · ready to publish`
            : `Step ${currentStep} of ${TOTAL_STEPS} · ${pct}% complete`}
        </span>
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg text-[13.5px] font-semibold border border-border text-muted-foreground bg-transparent hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save draft
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={currentStep === 1 || isSubmitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-semibold border border-border text-foreground bg-muted hover:bg-muted/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={onPublish}
            disabled={isSubmitting || !canPublish}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold bg-primary text-background hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Publish job
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-bold bg-primary text-background hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
