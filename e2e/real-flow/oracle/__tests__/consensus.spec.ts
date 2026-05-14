// e2e/real-flow/oracle/__tests__/consensus.spec.ts
import { test, expect } from "@playwright/test";
import { computeConsensus } from "../consensus";

test("tight cluster: all scores in-band, consensus is their average", () => {
  // [80,81,82,83,84] exclusive-halves:
  //   median 82, lowerHalf [80,81] → Q1 80.5, upperHalf [83,84] → Q3 83.5
  //   IQR 3, band [79.75, 84.25] → all five scores in-band
  //   consensusScore = (80+81+82+83+84)/5 = 82
  const r = computeConsensus([80, 81, 82, 83, 84]);
  expect(r.median).toBe(82);
  expect(r.q1).toBe(80.5);
  expect(r.q3).toBe(83.5);
  expect(r.iqr).toBe(3);
  expect(r.lowerBound).toBeCloseTo(79.75, 5);
  expect(r.upperBound).toBeCloseTo(84.25, 5);
  expect(r.included).toEqual([80, 81, 82, 83, 84]);
  expect(r.excluded).toEqual([]);
  expect(r.consensusScore).toBe(82);
  expect(r.classification.every((c) => c.aligned)).toBe(true);
});

test("outlier exclusion: extreme value is excluded, remaining scores form consensus", () => {
  // [70,80,81,82,95] exclusive-halves:
  //   sorted [70,80,81,82,95], median 81
  //   lowerHalf [70,80] → Q1 75, upperHalf [82,95] → Q3 88.5
  //   IQR 13.5, band [70.875, 91.125]
  //   70 < 70.875 → excluded; 95 > 91.125 → excluded
  //   included [80,81,82], consensusScore = 243/3 = 81
  const r = computeConsensus([70, 80, 81, 82, 95]);
  expect(r.median).toBe(81);
  expect(r.q1).toBe(75);
  expect(r.q3).toBe(88.5);
  expect(r.iqr).toBe(13.5);
  expect(r.lowerBound).toBeCloseTo(70.875, 5);
  expect(r.upperBound).toBeCloseTo(91.125, 5);
  expect(r.included).toEqual([80, 81, 82]);
  expect(r.excluded).toEqual([70, 95]);
  expect(r.consensusScore).toBe(81);
  expect(r.classification.find((c) => c.score === 70)!.aligned).toBe(false);
  expect(r.classification.find((c) => c.score === 95)!.aligned).toBe(false);
  expect(r.classification.find((c) => c.score === 81)!.aligned).toBe(true);
});

test("outlier is excluded from the consensus average and marked misaligned", () => {
  const r = computeConsensus([90, 88, 89, 91, 10]);
  expect(r.classification.find((c) => c.score === 10)!.aligned).toBe(false);
  expect(r.included).not.toContain(10);
  expect(r.consensusScore).toBeGreaterThan(80);
});

test("all identical scores: IQR 0, band collapses to the point, all aligned", () => {
  const r = computeConsensus([70, 70, 70, 70]);
  expect(r.iqr).toBe(0);
  expect(r.consensusScore).toBe(70);
  expect(r.classification.every((c) => c.aligned)).toBe(true);
});

test("empty input returns a zeroed result, not a throw", () => {
  const r = computeConsensus([]);
  expect(r.consensusScore).toBe(0);
  expect(r.included).toEqual([]);
});
