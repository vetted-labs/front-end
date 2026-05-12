"use client";

import { STATUS_COLORS } from "@/config/colors";

export interface WizardRailStep {
  number: number;
  label: string;
}

export interface WizardRailProps {
  sectionLabel?: string;
  steps: ReadonlyArray<WizardRailStep>;
  currentStep: number;
  completedSteps?: ReadonlyArray<number>;
  incompleteSteps?: ReadonlyArray<number>;
  maxUnlockedStep?: number;
  onStepClick?: (step: number) => void;
  labelOverride?: (step: WizardRailStep) => string;
  children?: React.ReactNode;
}

export function WizardRail({
  sectionLabel,
  steps,
  currentStep,
  completedSteps,
  incompleteSteps,
  maxUnlockedStep,
  onStepClick,
  labelOverride,
  children,
}: WizardRailProps) {
  const completedSet = new Set(completedSteps ?? []);
  const incompleteSet = new Set(incompleteSteps ?? []);
  const lockBoundary =
    typeof maxUnlockedStep === "number" ? maxUnlockedStep : Number.POSITIVE_INFINITY;

  return (
    <nav
      aria-label={`${sectionLabel ?? "Wizard"} steps`}
      className="flex flex-col gap-1 px-3 py-5 text-sm select-none"
    >
      {sectionLabel && (
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
          {sectionLabel}
        </p>
      )}

      {steps.map((step) => {
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
        const labelText = labelOverride ? labelOverride(step) : step.label;

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
              {labelText}
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
              aria-label={`${labelText}${isCompleted ? " (complete)" : isIncomplete ? " (incomplete)" : ""}`}
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

      {children}
    </nav>
  );
}
