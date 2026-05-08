"use client";

import { STATUS_COLORS } from "@/config/colors";

const STEPS = [
  { number: 1, label: "Profile" },
  { number: 2, label: "General" },
  { number: 3, label: "Domain" },
  { number: 4, label: "Submit" },
] as const;

export interface StepIndicatorProps {
  currentStep: number;
  /**
   * Optional set of step numbers that are complete and should show a check mark
   * even when the user is currently on a later step. If omitted, the indicator
   * falls back to `currentStep > step.number` (the legacy behaviour).
   */
  completedSteps?: ReadonlyArray<number>;
  /**
   * Steps that are incomplete but required before submit. Renders an
   * exclamation marker on each.
   */
  incompleteSteps?: ReadonlyArray<number>;
  /**
   * If provided, clicking on a step number invokes this callback. The handler
   * is responsible for blocking forward jumps that aren't unlocked yet.
   */
  onStepClick?: (step: number) => void;
  /**
   * The highest step the user is currently allowed to jump to. Steps beyond
   * this are rendered locked with a "Complete prior steps first" tooltip.
   */
  maxUnlockedStep?: number;
}

export function StepIndicator({
  currentStep,
  completedSteps,
  incompleteSteps,
  onStepClick,
  maxUnlockedStep,
}: StepIndicatorProps) {
  const completedSet = new Set(completedSteps ?? []);
  const incompleteSet = new Set(incompleteSteps ?? []);
  const lockBoundary =
    typeof maxUnlockedStep === "number" ? maxUnlockedStep : Number.POSITIVE_INFINITY;

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, idx) => {
        const isActive = currentStep === step.number;
        const isCompleted =
          completedSet.has(step.number) || (!completedSteps && currentStep > step.number);
        const isIncomplete = incompleteSet.has(step.number) && !isCompleted;
        const isLocked = step.number > lockBoundary && !isCompleted;
        const previousCompleted =
          STEPS[idx - 1] &&
          (completedSet.has(STEPS[idx - 1]!.number) ||
            (!completedSteps && currentStep > STEPS[idx - 1]!.number));

        const interactive = Boolean(onStepClick);
        const tooltip = isLocked
          ? "Complete prior steps first"
          : isIncomplete
          ? "This step has unfinished required fields"
          : step.label;

        const stateClass = isCompleted
          ? `${STATUS_COLORS.positive.bgSubtle} border-2 ${STATUS_COLORS.positive.border}`
          : isActive
          ? "bg-primary/15 border-2 border-primary/50 ring-2 ring-primary/25"
          : isIncomplete
          ? `${STATUS_COLORS.warning.bgSubtle} border-2 ${STATUS_COLORS.warning.border}`
          : "bg-muted/50 border border-border";

        const innerNode = (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${stateClass} ${
              isLocked ? "opacity-60" : ""
            }`}
          >
            {isCompleted ? (
              <svg
                className={`w-4 h-4 ${STATUS_COLORS.positive.icon}`}
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
              <span
                className={`text-xs font-bold ${STATUS_COLORS.warning.text}`}
                aria-hidden="true"
              >
                !
              </span>
            ) : (
              <span
                className={`text-xs font-bold ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {step.number}
              </span>
            )}
          </div>
        );

        return (
          <div key={step.number} className="flex items-center">
            {idx > 0 && (
              <div
                className={`flex-1 h-[2px] mx-2 ${
                  previousCompleted ? "bg-primary" : "bg-border"
                }`}
              />
            )}
            <div className="flex items-center gap-3">
              {interactive ? (
                <button
                  type="button"
                  onClick={() => onStepClick?.(step.number)}
                  disabled={isLocked}
                  title={tooltip}
                  aria-label={`${step.label}${
                    isCompleted ? " (complete)" : isIncomplete ? " (incomplete)" : ""
                  }${isLocked ? " — locked" : ""}`}
                  aria-current={isActive ? "step" : undefined}
                  className={`focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full ${
                    isLocked ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  {innerNode}
                </button>
              ) : (
                <div title={tooltip} aria-current={isActive ? "step" : undefined}>
                  {innerNode}
                </div>
              )}
              <span
                className={`text-xs font-medium hidden sm:inline tracking-wide ${
                  isActive
                    ? "text-primary"
                    : isCompleted
                    ? "text-foreground"
                    : isIncomplete
                    ? STATUS_COLORS.warning.text
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
