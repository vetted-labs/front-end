"use client";

import { STATUS_COLORS } from "@/config/colors";

const STEPS = [
  { number: 1, label: "Profile" },
  { number: 2, label: "General" },
  { number: 3, label: "Domain" },
  { number: 4, label: "Submit" },
] as const;

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {STEPS.map((step, idx) => {
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;

        return (
          <div key={step.number} className="flex items-center">
            {idx > 0 && (
              <div
                className={`flex-1 h-[2px] mx-2 ${
                  STEPS[idx - 1] && currentStep > STEPS[idx - 1].number
                    ? "bg-primary"
                    : "bg-border"
                }`}
              />
            )}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? `${STATUS_COLORS.positive.bgSubtle} border-2 ${STATUS_COLORS.positive.border}`
                    : isActive
                    ? "bg-primary/15 border-2 border-primary/50"
                    : "bg-muted/50 border border-border"
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
              <span
                className={`text-xs font-semibold hidden sm:inline tracking-wide ${
                  isActive
                    ? "text-primary"
                    : isCompleted
                    ? "text-foreground"
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
