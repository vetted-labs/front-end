import type { AnalyticsCandidate } from "@/types/analytics";

export function isAnalyticsFixtureModeEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ANALYTICS_FIXTURE_MODE === "true";
}

export function sortAnalyticsCandidates(candidates: AnalyticsCandidate[]) {
  return [...candidates].sort((a, b) =>
    (b.vettingScore ?? -1) - (a.vettingScore ?? -1)
    || b.selectedEndorserCount - a.selectedEndorserCount
    || Number(b.selectedEndorsementAmount || 0) - Number(a.selectedEndorsementAmount || 0)
    || new Date(b.appliedAt ?? 0).getTime() - new Date(a.appliedAt ?? 0).getTime()
  );
}

export function formatBidAmount(amount: string) {
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? `${new Intl.NumberFormat("en-US").format(parsed)} pts` : amount;
}

export function getScoreLabel(candidate: Pick<AnalyticsCandidate, "vettingScore" | "scoreStatus">) {
  if (candidate.vettingScore != null && candidate.scoreStatus === "scored") return String(Math.round(candidate.vettingScore));
  if (candidate.scoreStatus === "tiebreaker_required") return "Tiebreaker needed";
  if (candidate.scoreStatus === "insufficient_reviews") return "Consensus not ready";
  if (candidate.scoreStatus === "criteria_unavailable") return "Criteria unavailable";
  return "Not scored";
}

/**
 * VET-85 helper. Computes the spread of reviewer scores for a candidate so
 * the ranking row can render a consensus-spread bar and the outlier panel
 * can describe how far dissenters fall from consensus.
 *
 * Returns null when fewer than 2 numeric reviews exist — a single score has
 * no meaningful spread, and zero scores have no bar to draw at all.
 */
export function calculateScoreSpread(candidate: AnalyticsCandidate): {
  min: number;
  max: number;
  consensus: number | null;
  width: number;
  reviewCount: number;
} | null {
  const numericScores = candidate.reviews
    .map((review) => review.score)
    .filter((score): score is number => typeof score === "number" && Number.isFinite(score));

  if (numericScores.length < 2) return null;

  const min = Math.min(...numericScores);
  const max = Math.max(...numericScores);
  const consensus =
    typeof candidate.vettingScore === "number" && Number.isFinite(candidate.vettingScore)
      ? candidate.vettingScore
      : null;

  return {
    min,
    max,
    consensus,
    width: max - min,
    reviewCount: numericScores.length,
  };
}
