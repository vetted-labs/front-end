"use client";

import type { AnalyticsCriteriaDistribution } from "@/types";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { TraitDistributionChart } from "../charts/TraitDistributionChart";

interface DistributionSectionProps {
  distributions: AnalyticsCriteriaDistribution[];
}

/**
 * VET-90 host. Renders the score-distribution-per-trait small-multiples.
 * The actual chart lives in ../charts/TraitDistributionChart (Phase 2 agent).
 */
export function DistributionSection({ distributions }: DistributionSectionProps) {
  if (distributions.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-card p-5">
        <EyebrowLabel as="h2">Score distribution per trait</EyebrowLabel>
        <p className="mt-2 text-sm text-muted-foreground">
          Distribution shapes will appear once enough scored reviews land.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div>
        <EyebrowLabel as="h2">Score distribution per trait</EyebrowLabel>
        <p className="mt-1 text-sm text-muted-foreground">
          Spread of expert scores across the candidate pool.
        </p>
      </div>
      <div className="mt-5">
        <TraitDistributionChart distributions={distributions} />
      </div>
    </section>
  );
}
