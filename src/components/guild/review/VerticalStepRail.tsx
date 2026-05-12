"use client";

import { WizardRail, type WizardRailStep } from "@/components/wizard/WizardRail";

export interface StepDef {
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
  maxUnlockedStep?: number;
  onStepClick?: (step: number) => void;
  isCommitPhase?: boolean;
  variant?: "candidate" | "expert";
  steps?: ReadonlyArray<StepDef>;
  sectionLabel?: string;
  showCommitReveal?: boolean;
}

export function VerticalStepRail({
  currentStep,
  completedSteps,
  incompleteSteps,
  maxUnlockedStep,
  onStepClick,
  isCommitPhase = false,
  variant = "candidate",
  steps,
  sectionLabel = "Review",
  showCommitReveal = true,
}: VerticalStepRailProps) {
  const stepList = steps ?? REVIEW_STEPS;

  const labelOverride = (step: WizardRailStep): string => {
    if (variant === "expert" && step.number === 2) return "Sponsor vouch";
    if (variant === "expert" && step.number === 3) return "Membership rubric";
    return step.label;
  };

  return (
    <WizardRail
      sectionLabel={sectionLabel}
      steps={stepList}
      currentStep={currentStep}
      completedSteps={completedSteps}
      incompleteSteps={incompleteSteps}
      maxUnlockedStep={maxUnlockedStep}
      onStepClick={onStepClick}
      labelOverride={labelOverride}
    >
      {showCommitReveal && (
        <>
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
        </>
      )}
    </WizardRail>
  );
}
