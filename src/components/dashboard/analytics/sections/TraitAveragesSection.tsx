"use client";

import type { AnalyticsCriteriaAverage } from "@/types";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { RubricTraitBars } from "../charts/RubricTraitBars";

interface TraitAveragesSectionProps {
  criteria: AnalyticsCriteriaAverage[];
}

/**
 * VET-89 host. Renders the "What is your team valuing?" section.
 * The actual chart lives in ../charts/RubricTraitBars (Phase 1 agent).
 */
export function TraitAveragesSection({ criteria }: TraitAveragesSectionProps) {
  if (criteria.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-card p-5">
        <EyebrowLabel as="h2">What is your team valuing?</EyebrowLabel>
        <p className="mt-2 text-sm text-muted-foreground">
          Trait averages will appear once aligned reviews are recorded.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <EyebrowLabel as="h2">What is your team valuing?</EyebrowLabel>
          <p className="mt-1 text-sm text-muted-foreground">
            Average aligned-expert score per rubric trait, ranked.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {criteria.length} traits
        </span>
      </div>
      <div className="mt-5">
        <RubricTraitBars criteria={criteria} />
      </div>
    </section>
  );
}
