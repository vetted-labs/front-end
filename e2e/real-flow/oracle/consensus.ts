// e2e/real-flow/oracle/consensus.ts
//
// Adaptive Median Band (IQR) consensus — Technical Appendix §4 "Consensus
// Determination" + §7 "Candidate Score". The Technical Appendix does not
// specify the quartile method, but the CEO Consensus Scenarios document
// (2026-05-14) is the authoritative spec for it: all 10 of its scenarios are
// only reproducible with the inclusive-halves quartile method (the median
// element is included in both halves when n is odd). This oracle therefore
// uses inclusive-halves. The backend's VotingConsensusService.calculateIQR()
// uses exclusive-halves and diverges from this spec — tracked as DIV-003.

export type ScoreClassification = { score: number; aligned: boolean };

export type ConsensusResult = {
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  lowerBound: number;
  upperBound: number;
  included: number[]; // sorted, in-band
  excluded: number[]; // sorted, out-of-band
  consensusScore: number; // average of `included` (rounded to 2dp), or median if none in-band
  classification: ScoreClassification[]; // one per INPUT score, input order
};

/** Median of a sorted array. */
function medianOf(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  return n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
}

/**
 * Compute the Adaptive Median Band consensus.
 * Steps (Appendix §4): median M -> IQR -> band [M - 0.75*IQR, M + 0.75*IQR]
 * -> consensus = average of in-band scores. In-band = aligned.
 */
export function computeConsensus(scores: number[]): ConsensusResult {
  if (scores.length === 0) {
    return {
      median: 0, q1: 0, q3: 0, iqr: 0, lowerBound: 0, upperBound: 0,
      included: [], excluded: [], consensusScore: 0, classification: [],
    };
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const n = sorted.length;
  const median = medianOf(sorted);
  // Inclusive-halves quartile method: the median element IS included in both
  // halves when n is odd. This matches the CEO Consensus Scenarios document
  // (the authoritative spec for the quartile method) — all 10 of its scenarios
  // are only reproducible with this method. The backend's
  // VotingConsensusService.calculateIQR() uses exclusive-halves
  // (sorted.slice(0, Math.floor(n/2)) / sorted.slice(Math.ceil(n/2))) and
  // therefore diverges from the spec — tracked as DIV-003.
  const lowerHalf = sorted.slice(0, Math.ceil(n / 2));
  const upperHalf = sorted.slice(Math.floor(n / 2));
  const q1 = lowerHalf.length ? medianOf(lowerHalf) : median;
  const q3 = upperHalf.length ? medianOf(upperHalf) : median;
  const iqr = q3 - q1;
  const lowerBound = median - 0.75 * iqr;
  const upperBound = median + 0.75 * iqr;
  const included = sorted.filter((s) => s >= lowerBound && s <= upperBound);
  const excluded = sorted.filter((s) => s < lowerBound || s > upperBound);
  const rawConsensus =
    included.length > 0
      ? included.reduce((sum, s) => sum + s, 0) / included.length
      : median;
  const consensusScore = Math.round(rawConsensus * 100) / 100;
  const classification: ScoreClassification[] = scores.map((score) => ({
    score,
    aligned: score >= lowerBound && score <= upperBound,
  }));
  return {
    median, q1, q3, iqr, lowerBound, upperBound,
    included, excluded, consensusScore, classification,
  };
}
