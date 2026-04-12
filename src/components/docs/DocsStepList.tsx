import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DocsStep {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}

interface DocsStepListProps {
  steps: DocsStep[];
  className?: string;
  /** Starting number, default 1. */
  start?: number;
}

/**
 * Quiet numbered step rail, matching GitBook's measurements.
 *
 * 29px-wide left gutter holds a plain 16px number (no filled circle, no tint).
 * Content sits in a right column with the step title (H4-ish) and body.
 * A thin 1px guide rail connects steps vertically.
 */
export function DocsStepList({ steps, className, start = 1 }: DocsStepListProps) {
  return (
    <ol start={start} className={cn("my-8 list-none space-y-8 pl-0", className)}>
      {steps.map((step, i) => {
        const number = start + i;
        const isLast = i === steps.length - 1;
        return (
          <li key={step.title} className="relative pl-[52px]">
            <span
              aria-hidden
              className="absolute left-0 top-[2px] flex w-[29px] justify-center text-[16px] font-semibold tabular-nums text-foreground"
            >
              {number}
            </span>
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[14px] top-8 bottom-[-2.5rem] w-px bg-border"
              />
            )}
            <div className="pt-[1px]">
              <h4 className="text-[17px] font-semibold leading-[24px] text-foreground">
                {step.title}
              </h4>
              {step.description && (
                <div className="mt-1.5 text-[15px] leading-[24px] text-muted-foreground [&>*:last-child]:mb-0 [&>p]:my-1.5 [&_strong]:text-foreground [&_strong]:font-semibold [&_code]:rounded [&_code]:border [&_code]:border-border/60 [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.88em] [&_code]:font-mono">
                  {step.description}
                </div>
              )}
              {step.children && <div className="mt-3">{step.children}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
