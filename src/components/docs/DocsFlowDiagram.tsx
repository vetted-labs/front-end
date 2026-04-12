import type { LucideIcon } from "lucide-react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FlowStep {
  label: string;
  description?: string;
  icon?: LucideIcon;
  /** Optional tag above the label, e.g. "Step 1" or "Day 1". */
  tag?: string;
  /** Optional accent for this step (primary = active/highlighted). */
  accent?: "default" | "primary";
}

interface DocsFlowDiagramProps {
  steps: FlowStep[];
  /** Optional caption below the diagram. */
  caption?: string;
  className?: string;
}

/**
 * Horizontal stepped flow diagram for lifecycle / journey explanations.
 *
 *   ┌─────┐    ┌─────┐    ┌─────┐
 *   │  ●  │ →  │  ●  │ →  │  ●  │
 *   │Apply│    │Review│   │Reveal│
 *   └─────┘    └─────┘    └─────┘
 *
 * On mobile the cards stack vertically with chevrons between them
 * rendered as separate rows (not beside the cards).
 */
export function DocsFlowDiagram({
  steps,
  caption,
  className,
}: DocsFlowDiagramProps) {
  return (
    <figure
      className={cn(
        "my-8 rounded-xl border border-border bg-muted/30 p-4 md:p-6",
        className
      )}
    >
      {/* Desktop: single horizontal flex row */}
      <div className="hidden md:flex md:items-stretch">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={i} className="flex flex-1 items-center">
              <StepCard step={step} />
              {!isLast && (
                <ChevronRight
                  aria-hidden
                  className="mx-1 h-5 w-5 shrink-0 self-center text-muted-foreground/60"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical stack with chevrons between */}
      <div className="flex flex-col gap-2 md:hidden">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={i}>
              <StepCard step={step} />
              {!isLast && (
                <div className="flex justify-center py-1">
                  <ChevronDown
                    aria-hidden
                    className="h-4 w-4 text-muted-foreground/60"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {caption && (
        <figcaption className="mt-4 text-center text-[12.5px] text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function StepCard({ step }: { step: FlowStep }) {
  const Icon = step.icon;
  const isPrimary = step.accent === "primary";
  return (
    <div
      className={cn(
        "flex min-h-[104px] flex-1 flex-col items-center justify-center rounded-lg p-4 text-center transition-colors",
        isPrimary
          ? "bg-primary/10 ring-1 ring-primary/30 dark:bg-primary/15"
          : "bg-background ring-1 ring-border"
      )}
    >
      {step.tag && (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {step.tag}
        </p>
      )}
      {Icon && (
        <div
          className={cn(
            "mb-2 flex h-8 w-8 items-center justify-center rounded-full",
            isPrimary
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      )}
      <p
        className={cn(
          "text-[13.5px] font-semibold leading-[18px]",
          isPrimary ? "text-primary" : "text-foreground"
        )}
      >
        {step.label}
      </p>
      {step.description && (
        <p className="mt-1 text-[12px] leading-[16px] text-muted-foreground">
          {step.description}
        </p>
      )}
    </div>
  );
}
