// e2e/real-flow/oracle/consensus.ts
//
// Adaptive Median Band (IQR) consensus — Technical Appendix §4 "Consensus
// Determination" + §7 "Candidate Score". This is the CANONICAL consensus
// algorithm per the appendix; it is the oracle's reference, independent of
// any backend or on-chain implementation.

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
  consensusScore: number; // average of `included`, 0 if no scores
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
  // Inclusive-halves quartile method (Tukey / "Method 2"): for odd-length
  // arrays the median element is included in BOTH halves, which is the
  // standard statistical method that matches the Technical Appendix examples.
  const mid = Math.floor(n / 2);
  const lowerHalf = sorted.slice(0, mid + (n % 2 === 1 ? 1 : 0));
  const upperHalf = sorted.slice(mid);
  const q1 = lowerHalf.length ? medianOf(lowerHalf) : median;
  const q3 = upperHalf.length ? medianOf(upperHalf) : median;
  const iqr = q3 - q1;
  const lowerBound = median - 0.75 * iqr;
  const upperBound = median + 0.75 * iqr;
  const included = sorted.filter((s) => s >= lowerBound && s <= upperBound);
  const excluded = sorted.filter((s) => s < lowerBound || s > upperBound);
  const consensusScore =
    included.length > 0
      ? included.reduce((sum, s) => sum + s, 0) / included.length
      : 0;
  const classification: ScoreClassification[] = scores.map((score) => ({
    score,
    aligned: score >= lowerBound && score <= upperBound,
  }));
  return {
    median, q1, q3, iqr, lowerBound, upperBound,
    included, excluded, consensusScore, classification,
  };
}
