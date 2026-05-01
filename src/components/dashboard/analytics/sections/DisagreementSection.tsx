"use client";

import type { AnalyticsCandidate, AnalyticsDisagreement } from "@/types";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { OutlierPanel } from "../OutlierPanel";

interface DisagreementSectionProps {
  candidates: AnalyticsCandidate[];
  disagreement: AnalyticsDisagreement;
}

/**
 * VET-85 host. Renders inter-evaluator disagreement: outlier panel +
 * tiebreaker flags. Actual outlier list lives in ../OutlierPanel (Phase 4 agent).
 */
export function DisagreementSection({
  candidates,
  disagreement,
}: DisagreementSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <EyebrowLabel as="h2">Where does your team agree and disagree?</EyebrowLabel>
          <p className="mt-1 text-sm text-muted-foreground">
            Per-candidate consensus tightness and dissenting reviewers.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {disagreement.status === "available"
            ? `${disagreement.flags.length} flags`
            : "Building"}
        </span>
      </div>
      <div className="mt-5">
        <OutlierPanel candidates={candidates} disagreement={disagreement} />
      </div>
    </section>
  );
}
