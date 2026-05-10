"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardStep {
  num: number;
  name: string;
  sub: string;
}

export const WIZARD_STEPS: ReadonlyArray<WizardStep> = [
  { num: 1, name: "The role", sub: "Title, team, level" },
  { num: 2, name: "Location & comp", sub: "Where and how much" },
  { num: 3, name: "Description", sub: "Story, requirements" },
  { num: 4, name: "Guild assignment", sub: "Reviewer pool" },
  { num: 5, name: "Application form", sub: "Custom questions" },
  { num: 6, name: "Attachments", sub: "Optional media" },
  { num: 7, name: "Review & publish", sub: "Final preview" },
];

interface WizardRailProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

/**
 * Vertical stepper rendered to the left of the wizard content. Mirrors the
 * `wizard-layout.html` mockup — brand lockup at the top, dashed connector
 * line between numbers, three visual states (done / active / pending).
 */
export function WizardRail({ currentStep, onStepClick }: WizardRailProps) {
  return (
    <aside className="bg-background border-r border-border py-7 sticky top-16 self-start">
      <div className="flex items-center gap-2.5 px-6 pb-6 border-b border-border mb-6">
        <div
          className="w-7 h-7 rounded-lg grid place-items-center text-white font-black text-sm font-display"
          style={{
            background: "linear-gradient(135deg, #ff7a1a, #ff4d00)",
          }}
        >
          V
        </div>
        <div className="font-bold text-sm text-foreground tracking-tight">
          New job posting
        </div>
      </div>
      <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 px-6 mb-3 font-semibold">
        Setup
      </div>

      <ol className="relative">
        {WIZARD_STEPS.map((step, i) => {
          const isActive = step.num === currentStep;
          const isDone = step.num < currentStep;
          const isPending = step.num > currentStep;
          const isFirst = i === 0;
          const isLast = i === WIZARD_STEPS.length - 1;

          return (
            <li key={step.num} className="relative">
              {/* Connector line */}
              <span
                aria-hidden
                className={cn(
                  "absolute left-[37px] w-px bg-border",
                  isFirst ? "top-1/2" : "-top-2",
                  isLast ? "bottom-1/2" : "-bottom-2"
                )}
              />
              <button
                type="button"
                onClick={() => onStepClick(step.num)}
                className="grid grid-cols-[28px_1fr] gap-3.5 px-6 py-2.5 items-center w-full text-left hover:bg-muted/40 transition-colors"
              >
                <span
                  className={cn(
                    "relative z-[1] grid place-items-center w-7 h-7 rounded-full border text-[11px] font-bold",
                    isDone &&
                      "bg-emerald-500 text-background border-emerald-500",
                    isActive &&
                      "bg-primary text-background border-primary ring-4 ring-primary/15",
                    isPending &&
                      "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : step.num}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-[13.5px] font-semibold tracking-tight",
                      isActive
                        ? "text-primary"
                        : isDone
                          ? "text-foreground"
                          : "text-muted-foreground"
                    )}
                  >
                    {step.name}
                  </span>
                  <span className="text-[11.5px] text-muted-foreground/70">
                    {step.sub}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
