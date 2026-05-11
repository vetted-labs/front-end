"use client";

import { STATUS_COLORS } from "@/config/colors";

interface StepDef {
  number: number;
  label: string;
}

const REVIEW_STEPS: ReadonlyArray<StepDef> = [
  { number: 1, label: "Materials" },
  { number: 2, label: "General rubric" },
  { number: 3, label: "Domain rubric" },
  { number: 4, label: "Confirm & submit" },
];

const COMMIT_REVEAL_STEPS: ReadonlyArray<{ label: string; sub: string }> = [
  { label: "Sign commit", sub: "after Submit" },
  { label: "Reveal", sub: "after deadline" },
];

export interface VerticalStepRailProps {
  currentStep: number;
  completedSteps?: ReadonlyArray<number>;
  incompleteSteps?: ReadonlyArray<number>;
  /**
   * Highest step number the reviewer can jump to. Steps beyond this render
   * locked and are not clickable.
   */
  maxUnlockedStep?: number;
  onStepClick?: (step: number) => void;
  /**
   * Whether the modal is in the commit phase. When true, the commit-reveal
   * section is shown with the first sub-step ("Sign commit") highlighted.
   */
  isCommitPhase?: boolean;
  /** Renders sponsor-vouch hint label on the expert applicant variant. */
  variant?: "candidate" | "expert";
}

export function VerticalStepRail({
  currentStep,
  completedSteps,
  incompleteSteps,
  maxUnlockedStep,
  onStepClick,
  isCommitPhase = false,
  variant = "candidate",
}: VerticalStepRailProps) {
  const completedSet = new Set(completedSteps ?? []);
  const incompleteSet = new Set(incompleteSteps ?? []);
  const lockBoundary =
    typeof maxUnlockedStep === "number" ? maxUnlockedStep : Number.POSITIVE_INFINITY;

  const stepLabel = (step: StepDef): string => {
    if (variant === "expert" && step.number === 2) return "Sponsor vouch";
    if (variant === "expert" && step.number === 3) return "Membership rubric";
    return step.label;
  };

  return (
    <nav
      aria-label="Review steps"
      className="flex flex-col gap-1 px-3 py-5 text-sm select-none"
    >
      <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
        Review
      </p>

      {REVIEW_STEPS.map((step) => {
        const isActive = currentStep === step.number;
        const isCompleted =
          completedSet.has(step.number) ||
          (!completedSteps && currentStep > step.number);
        const isIncomplete = incompleteSet.has(step.number) && !isCompleted;
        const isLocked = step.number > lockBoundary && !isCompleted;
        const clickable = !!onStepClick && !isLocked;
        const tooltip = isLocked
          ? "Complete prior steps first"
          : isIncomplete
            ? "Unfinished required fields"
            : undefined;

        const circleClass = isCompleted
          ? `${STATUS_COLORS.positive.bgSubtle} ${STATUS_COLORS.positive.border}`
          : isActive
            ? "bg-primary border-primary text-primary-foreground"
            : isIncomplete
              ? `${STATUS_COLORS.warning.bgSubtle} ${STATUS_COLORS.warning.border}`
              : "bg-muted/40 border-border text-muted-foreground";

        const rowClass = isActive
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground";

        const lockedClass = isLocked ? "opacity-50 cursor-not-allowed" : "";

        const inner = (
          <span className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
            <span
              className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-semibold ${circleClass}`}
              aria-hidden="true"
            >
              {isCompleted ? (
                <svg
                  className={`w-3 h-3 ${STATUS_COLORS.positive.icon}`}
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8l3.5 3.5L13 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : isIncomplete ? (
                <span className={STATUS_COLORS.warning.text}>!</span>
              ) : (
                step.number
              )}
            </span>
            <span
              className={`text-[13px] font-medium ${
                isActive ? "text-foreground" : ""
              }`}
            >
              {stepLabel(step)}
            </span>
          </span>
        );

        if (clickable) {
          return (
            <button
              key={step.number}
              type="button"
              onClick={() => onStepClick?.(step.number)}
              title={tooltip}
              aria-current={isActive ? "step" : undefined}
              aria-label={`${stepLabel(step)}${isCompleted ? " (complete)" : isIncomplete ? " (incomplete)" : ""}`}
              className={`text-left rounded-lg transition-colors ${rowClass} ${lockedClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
            >
              {inner}
            </button>
          );
        }

        return (
          <div
            key={step.number}
            title={tooltip}
            aria-current={isActive ? "step" : undefined}
            className={`rounded-lg ${rowClass} ${lockedClass}`}
          >
            {inner}
          </div>
        );
      })}

      <p className="mt-5 px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
        Commit-Reveal
      </p>

      {COMMIT_REVEAL_STEPS.map((step, idx) => {
        const isActive = isCommitPhase && idx === 0;
        const circleClass = isActive
          ? "bg-primary border-primary text-primary-foreground"
          : "bg-muted/40 border-border text-muted-foreground";

        return (
          <div
            key={step.label}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${
              isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground"
            }`}
            aria-current={isActive ? "step" : undefined}
          >
            <span
              className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-semibold ${circleClass}`}
              aria-hidden="true"
            >
              {idx + 5}
            </span>
            <span className="flex flex-col">
              <span className="text-[13px] font-medium">{step.label}</span>
              <span className="text-[10px] text-muted-foreground/70">
                {step.sub}
              </span>
            </span>
          </div>
        );
      })}
    </nav>
  );
}
