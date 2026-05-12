"use client";

import { STATUS_COLORS } from "@/config/colors";
import type { SubstepDescriptor } from "./types";

export interface SubstepChipStripProps {
  substeps: ReadonlyArray<SubstepDescriptor>;
  activeIndex: number;
  onJumpTo: (index: number) => void;
}

export function SubstepChipStrip({
  substeps,
  activeIndex,
  onJumpTo,
}: SubstepChipStripProps) {
  if (substeps.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-6">
      {substeps.map((substep, idx) => {
        const isActive = idx === activeIndex;
        const cls = isActive
          ? "bg-primary text-primary-foreground border-primary"
          : substep.isComplete
            ? `${STATUS_COLORS.positive.bgSubtle} ${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.text}`
            : "bg-card border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground";
        return (
          <button
            key={substep.id}
            type="button"
            onClick={() => onJumpTo(idx)}
            aria-current={isActive ? "step" : undefined}
            aria-label={`${substep.label}${substep.isComplete ? " (complete)" : substep.isRequired ? " (incomplete)" : ""}`}
            className={`h-8 px-3 rounded-md border text-xs font-semibold transition-colors ${cls}`}
          >
            <span className="tabular-nums mr-1.5 opacity-70">
              {String(idx + 1).padStart(2, "0")}
            </span>
            {substep.label}
          </button>
        );
      })}
    </div>
  );
}
