"use client";

import type { AnalyticsCandidate, AnalyticsInsights } from "@/types";
import { TraitAveragesSection } from "./sections/TraitAveragesSection";
import { DistributionSection } from "./sections/DistributionSection";
import { CorrelationSection } from "./sections/CorrelationSection";
import { DisagreementSection } from "./sections/DisagreementSection";
import { OutcomeReadinessCard } from "./sections/OutcomeReadinessCard";

interface RoleInsightsGridProps {
  insights: AnalyticsInsights;
  candidates: AnalyticsCandidate[];
}

/**
 * Insights area for a job's analytics page. Hosts the four
 * "What is your team valuing / distribution / correlation / agreement"
 * sections plus the prescriptive lock card.
 *
 * Layout:
 *   row 1 → trait averages (full width, the headline VET-89 chart)
 *   row 2 → 2-up: distribution | correlation
 *   row 3 → 2-up: disagreement | outcome readiness
 */
export function RoleInsightsGrid({ insights, candidates }: RoleInsightsGridProps) {
  return (
    <div className="grid gap-4">
      <TraitAveragesSection criteria={insights.criteriaAverages} />

      <div className="grid gap-4 xl:grid-cols-2">
        <DistributionSection distributions={insights.criteriaDistributions} />
        <CorrelationSection correlation={insights.endorsementCorrelation} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DisagreementSection
          candidates={candidates}
          disagreement={insights.disagreement}
        />
        <OutcomeReadinessCard readiness={insights.outcomeReadiness} />
      </div>
    </div>
  );
}
