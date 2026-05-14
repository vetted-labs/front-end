// e2e/real-flow/oracle/__tests__/ceo-consensus-scenarios.spec.ts
//
// Source: the CEO Consensus Scenarios document (received 2026-05-14).
//
// This file is the AUTHORITATIVE SPEC for the IQR quartile method used by the
// Adaptive Median Band consensus algorithm. The CEO document provides 10
// worked consensus scenarios; all 10 are only reproducible with the
// inclusive-halves quartile method (the median element is included in both
// halves when n is odd). The oracle `computeConsensus()` was corrected to
// inclusive-halves to match this document.
//
// Any change to `computeConsensus` that breaks these tests is a regression
// against the CEO spec. The backend's VotingConsensusService.calculateIQR()
// currently uses exclusive-halves and diverges — tracked as DIV-003 in
// docs/testing/PROTOCOL_DIVERGENCES.md.

import { test, expect } from "@playwright/test";
import { computeConsensus } from "../consensus";

// Candidate pass threshold. The CEO Consensus Scenarios document's
// PASS/FAIL/BORDERLINE results are only consistent with a median pass-threshold
// of 50 (Scenario 9, median 50, is explicitly "BORDERLINE — median sits at
// threshold"; Scenario 4 median 55 = PASS; Scenario 2 median 20 = FAIL).
// NOTE: the Technical Appendix states the threshold is 60. This discrepancy is
// tracked as DIV-004 in docs/testing/PROTOCOL_DIVERGENCES.md. The oracle pins
// 50 here to match the CEO document.
const CEO_PASS_THRESHOLD = 50;

type CandidateResult = "PASS" | "FAIL" | "BORDERLINE";

/** Candidate result from the median vs the CEO pass threshold. */
function candidateResult(median: number): CandidateResult {
  if (median > CEO_PASS_THRESHOLD) return "PASS";
  if (median < CEO_PASS_THRESHOLD) return "FAIL";
  return "BORDERLINE";
}

type Scenario = {
  name: string;
  scores: number[]; // expert order E1..E5
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  lowerBound: number;
  upperBound: number;
  aligned: number[]; // scores inside the band (sorted)
  misaligned: number[]; // scores outside the band (sorted)
  consensusScore: number; // mean of aligned scores, rounded to 2dp
  result: CandidateResult;
};

const SCENARIOS: Scenario[] = [
  {
    name: "CEO Scenario 1 — Tight consensus, clear pass",
    scores: [88, 85, 82, 90, 86],
    median: 86,
    q1: 85,
    q3: 88,
    iqr: 3,
    lowerBound: 83.75,
    upperBound: 88.25,
    aligned: [85, 86, 88],
    misaligned: [82, 90],
    consensusScore: 86.33,
    result: "PASS",
  },
  {
    name: "CEO Scenario 2 — Tight consensus, clear fail",
    scores: [18, 22, 15, 20, 25],
    median: 20,
    q1: 18,
    q3: 22,
    iqr: 4,
    lowerBound: 17.0,
    upperBound: 23.0,
    aligned: [18, 20, 22],
    misaligned: [15, 25],
    consensusScore: 20,
    result: "FAIL",
  },
  {
    name: "CEO Scenario 3 — Two outliers, strong candidate",
    scores: [80, 79, 20, 90, 15],
    median: 79,
    q1: 20,
    q3: 80,
    iqr: 60,
    lowerBound: 34.0,
    upperBound: 124.0,
    aligned: [79, 80, 90],
    misaligned: [15, 20],
    consensusScore: 83,
    result: "PASS",
  },
  {
    name: "CEO Scenario 4 — Wide dispersion, mid-band",
    scores: [55, 70, 40, 65, 45],
    median: 55,
    q1: 45,
    q3: 65,
    iqr: 20,
    lowerBound: 40.0,
    upperBound: 70.0,
    aligned: [40, 45, 55, 65, 70], // all five inside the band
    misaligned: [],
    consensusScore: 55,
    result: "PASS",
  },
  {
    name: "CEO Scenario 5 — Near-perfect convergence, one outside",
    scores: [60, 58, 62, 55, 61],
    median: 60,
    q1: 58,
    q3: 61,
    iqr: 3,
    lowerBound: 57.75,
    upperBound: 62.25,
    aligned: [58, 60, 61, 62],
    misaligned: [55],
    consensusScore: 60.25,
    result: "PASS",
  },
  {
    name: "CEO Scenario 6 — Two high outliers, weak candidate",
    scores: [25, 22, 75, 20, 80],
    median: 25,
    q1: 22,
    q3: 75,
    iqr: 53,
    // lowerBound is mathematically -14.75. The CEO doc notes this "in practice
    // means 0" — but no score falls between -14.75 and 0, so clamping to 0
    // does NOT change any classification here. Asserting the raw -14.75.
    lowerBound: -14.75,
    upperBound: 64.75,
    aligned: [20, 22, 25],
    misaligned: [75, 80],
    consensusScore: 22.33,
    result: "FAIL",
  },
  {
    name: "CEO Scenario 7 — Single low outlier, strong candidate",
    scores: [91, 88, 85, 30, 87],
    median: 87,
    q1: 85,
    q3: 88,
    iqr: 3,
    lowerBound: 84.75,
    upperBound: 89.25,
    aligned: [85, 87, 88],
    misaligned: [30, 91],
    consensusScore: 86.67,
    result: "PASS",
  },
  {
    name: "CEO Scenario 8 — Single extreme high outlier",
    scores: [70, 68, 72, 100, 69],
    median: 70,
    q1: 69,
    q3: 72,
    iqr: 3,
    lowerBound: 67.75,
    upperBound: 72.25,
    aligned: [68, 69, 70, 72],
    misaligned: [100],
    consensusScore: 69.75,
    result: "PASS",
  },
  {
    name: "CEO Scenario 9 — Narrow band, borderline total",
    scores: [50, 52, 48, 51, 49],
    median: 50,
    q1: 49,
    q3: 51,
    iqr: 2,
    lowerBound: 48.5,
    upperBound: 51.5,
    aligned: [49, 50, 51],
    misaligned: [48, 52],
    consensusScore: 50,
    // median sits exactly at the threshold → BORDERLINE
    result: "BORDERLINE",
  },
  {
    name: "CEO Scenario 10 — Polarized panel, two camps",
    scores: [85, 80, 20, 78, 22],
    median: 78,
    q1: 22,
    q3: 80,
    iqr: 58,
    lowerBound: 34.5,
    upperBound: 121.5,
    aligned: [78, 80, 85],
    misaligned: [20, 22],
    consensusScore: 81,
    result: "PASS",
  },
];

for (const s of SCENARIOS) {
  test(s.name, () => {
    const r = computeConsensus(s.scores);

    // Band statistics — integral values exact, fractional bounds to 5dp.
    expect(r.median).toBe(s.median);
    expect(r.q1).toBe(s.q1);
    expect(r.q3).toBe(s.q3);
    expect(r.iqr).toBe(s.iqr);
    expect(r.lowerBound).toBeCloseTo(s.lowerBound, 5);
    expect(r.upperBound).toBeCloseTo(s.upperBound, 5);

    // In-band / out-of-band partition (oracle returns these sorted).
    expect(r.included).toEqual(s.aligned);
    expect(r.excluded).toEqual(s.misaligned);

    // Per-expert alignment classification.
    for (const score of s.aligned) {
      expect(r.classification.find((c) => c.score === score)!.aligned).toBe(true);
    }
    for (const score of s.misaligned) {
      expect(r.classification.find((c) => c.score === score)!.aligned).toBe(false);
    }

    // Consensus score = mean of aligned scores (rounded to 2dp).
    expect(r.consensusScore).toBe(s.consensusScore);

    // Candidate PASS/FAIL/BORDERLINE from the median vs CEO_PASS_THRESHOLD.
    expect(candidateResult(r.median)).toBe(s.result);
  });
}
