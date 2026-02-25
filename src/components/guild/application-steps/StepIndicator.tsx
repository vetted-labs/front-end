"use client";

import { Check } from "lucide-react";

interface Step {
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export default function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6">
      {/* Step indicator */}
      <div className="relative">
        {/* Connecting lines layer (behind circles) */}
        <div
          className="absolute top-5 left-0 right-0 flex items-center"
          style={{
            paddingLeft: `calc(100% / ${steps.length} / 2)`,
            paddingRight: `calc(100% / ${steps.length} / 2)`,
          }}
        >
          {steps.slice(0, -1).map((_, index) => (
            <div
              key={index}
              className={`flex-1 h-1 transition-colors duration-200 ${
                index < currentStep ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            const isFuture = index > currentStep;
            const canClick = isCompleted;

            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center"
              >
                <button
                  type="button"
                  onClick={() => canClick && onStepClick(index)}
                  disabled={!canClick}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                    transition-all duration-200
                    ${
                      isCompleted
                        ? "bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90"
                        : isActive
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-muted border-2 border-border text-muted-foreground"
                    }
                    ${isFuture ? "cursor-default" : ""}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </button>
                <span
                  className={`mt-2 text-xs font-medium text-center whitespace-nowrap ${
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
            );
          })}
        </div>
      </div>

    </div>
  );
}
