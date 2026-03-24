"use client";

import { StepProgress } from "@/components/ui/step-progress";

const APPLICATION_STEPS = [
  { label: "Wallet Verification" },
  { label: "Personal Info" },
  { label: "Professional Background" },
  { label: "Application Questions" },
  { label: "Review & Submit" },
];

interface ExpertApplicationProgressProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function ExpertApplicationProgress({ currentStep, onStepClick }: ExpertApplicationProgressProps) {
  return (
    <div className="mb-8">
      <StepProgress steps={APPLICATION_STEPS} currentStep={currentStep} onStepClick={onStepClick} />
      <p className="text-sm text-muted-foreground text-center mt-2">
        Step {currentStep + 1} of {APPLICATION_STEPS.length} — {APPLICATION_STEPS[currentStep]?.label}
      </p>
    </div>
  );
}
