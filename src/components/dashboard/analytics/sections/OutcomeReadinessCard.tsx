"use client";

import type { AnalyticsOutcomeReadiness } from "@/types";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";

interface OutcomeReadinessCardProps {
  readiness: AnalyticsOutcomeReadiness;
}

/**
 * VET-86. The prescriptive lock: shows X/N tracked hire outcomes and
 * unlocks once the threshold is hit. Already specified in the brief
 * as locked-by-default until enough outcomes flow back.
 */
export function OutcomeReadinessCard({ readiness }: OutcomeReadinessCardProps) {
  const pct = Math.min(
    100,
    Math.round(
      (readiness.trackedHireOutcomes / Math.max(1, readiness.requiredHireOutcomes)) *
        100,
    ),
  );

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <EyebrowLabel as="h2">What predicts success here?</EyebrowLabel>
          <p className="mt-1 text-sm text-muted-foreground">
            Prescriptive signal. Unlocks once enough hire outcomes are tracked.
          </p>
        </div>
        <span
          className={
            readiness.unlocked
              ? "rounded-md border border-positive/40 bg-positive/10 px-2 py-0.5 text-xs font-semibold text-positive"
              : "rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-semibold text-muted-foreground"
          }
        >
          {readiness.unlocked ? "Unlocked" : "Building"}
        </span>
      </div>

      <div className="mt-5 grid h-32 place-items-center rounded-lg border border-dashed border-primary/40 bg-muted/20 text-center">
        <div>
          <div className="text-2xl font-semibold text-foreground">
            {readiness.trackedHireOutcomes}
            <span className="text-base text-muted-foreground"> / {readiness.requiredHireOutcomes}</span>
            <span className="ml-2 text-xs font-normal text-muted-foreground">({pct}%)</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {readiness.trackedHireOutcomes} of {readiness.requiredHireOutcomes} tracked hire outcomes collected
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Once unlocked: which rubric traits, when scored highly, correlate with successful hire and 90-day retention.
      </p>
    </section>
  );
}
