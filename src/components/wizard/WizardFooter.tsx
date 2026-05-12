"use client";

import { ArrowLeft, ArrowRight, Loader2, Send } from "lucide-react";

export interface WizardFooterProps {
  stepLabel: string;
  progressPct: number;
  isSubmitting: boolean;
  isFinalSubstep: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onContinue: () => void;
  onCancel: () => void;
}

export function WizardFooter({
  stepLabel,
  progressPct,
  isSubmitting,
  isFinalSubstep,
  canGoBack,
  onBack,
  onContinue,
  onCancel,
}: WizardFooterProps) {
  return (
    <div className="border-t border-border bg-background/95 backdrop-blur px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sticky bottom-0">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="w-44 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="tabular-nums">{stepLabel}</span>
      </div>

      <div className="flex gap-2.5">
        {canGoBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-semibold border border-border text-foreground bg-muted hover:bg-muted/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-[13.5px] font-semibold border border-border text-muted-foreground bg-transparent hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={onContinue}
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold bg-primary text-background hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting…
            </>
          ) : isFinalSubstep ? (
            <>
              <Send className="w-3.5 h-3.5" />
              Submit application
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
