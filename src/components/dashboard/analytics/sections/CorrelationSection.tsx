"use client";

import type { AnalyticsEndorsementCorrelation } from "@/types";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { TraitEndorsementCorrelation } from "../charts/TraitEndorsementCorrelation";

interface CorrelationSectionProps {
  correlation: AnalyticsEndorsementCorrelation;
}

/**
 * VET-91 host. Trait↔endorsement correlation strip.
 * The actual chart lives in ../charts/TraitEndorsementCorrelation (Phase 3 agent).
 */
export function CorrelationSection({ correlation }: CorrelationSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div>
        <EyebrowLabel as="h2">Trait correlation with endorsement</EyebrowLabel>
        <p className="mt-1 text-sm text-muted-foreground">
          Which rubric traits track with experts staking on a candidate.
        </p>
      </div>
      <div className="mt-5">
        <TraitEndorsementCorrelation correlation={correlation} />
      </div>
    </section>
  );
}
