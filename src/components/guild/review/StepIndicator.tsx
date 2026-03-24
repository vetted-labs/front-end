"use client";

import { CheckCircle, Target, Sparkles, Award } from "lucide-react";

const STEPS = [
  { number: 1, label: "Review Profile", icon: Target },
  { number: 2, label: "General Questions", icon: Sparkles },
  { number: 3, label: "Domain Review", icon: Award },
  { number: 4, label: "Submitted", icon: CheckCircle },
] as const;

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {STEPS.map((step, idx) => {
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        const StepIcon = step.icon;

        return (
          <div key={step.number} className="flex items-center">
            {idx > 0 && (
              <div
                className={`w-12 h-[2px] mx-1 transition-all duration-500 ${
                  currentStep > step.number
                    ? "bg-primary"
                    : "bg-border"
                }`}
              />
            )}
            <div className="flex items-center gap-2.5">
              <div
                className={`relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCompleted
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isActive
                    ? "bg-primary/15 text-primary border-2 border-primary/60 shadow-sm"
                    : "bg-muted/50 text-muted-foreground border border-border"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
                {isActive && (
                  <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-pulse" />
                )}
              </div>
              <span
                className={`text-xs font-semibold hidden sm:inline tracking-wide ${
                  isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
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
