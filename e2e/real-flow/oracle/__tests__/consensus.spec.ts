// e2e/real-flow/oracle/__tests__/consensus.spec.ts
import { test, expect } from "@playwright/test";
import { computeConsensus } from "../consensus";

test("tight cluster: edge scores fall just outside the band, middle scores form consensus", () => {
  // [80,81,82,83,84] inclusive-halves:
  //   median 82, lowerHalf [80,81,82] → Q1 81, upperHalf [82,83,84] → Q3 83
  //   IQR 2, band [80.5, 83.5]
  //   80 < 80.5 → excluded; 84 > 83.5 → excluded
  //   included [81,82,83], consensusScore = (81+82+83)/3 = 82
  const r = computeConsensus([80, 81, 82, 83, 84]);
  expect(r.median).toBe(82);
  expect(r.q1).toBe(81);
  expect(r.q3).toBe(83);
  expect(r.iqr).toBe(2);
  expect(r.lowerBound).toBeCloseTo(80.5, 5);
  expect(r.upperBound).toBeCloseTo(83.5, 5);
  expect(r.included).toEqual([81, 82, 83]);
  expect(r.excluded).toEqual([80, 84]);
  expect(r.consensusScore).toBe(82);
  expect(r.classification.find((c) => c.score === 80)!.aligned).toBe(false);
  expect(r.classification.find((c) => c.score === 84)!.aligned).toBe(false);
  expect(r.classification.find((c) => c.score === 81)!.aligned).toBe(true);
  expect(r.classification.find((c) => c.score === 82)!.aligned).toBe(true);
  expect(r.classification.find((c) => c.score === 83)!.aligned).toBe(true);
});

test("outlier exclusion: extreme value is excluded, remaining scores form consensus", () => {
  // [70,80,81,82,95] inclusive-halves:
  //   sorted [70,80,81,82,95], median 81
  //   lowerHalf [70,80,81] → Q1 80, upperHalf [81,82,95] → Q3 82
  //   IQR 2, band [79.5, 82.5]
  //   70 < 79.5 → excluded; 95 > 82.5 → excluded
  //   included [80,81,82], consensusScore = 243/3 = 81
  const r = computeConsensus([70, 80, 81, 82, 95]);
  expect(r.median).toBe(81);
  expect(r.q1).toBe(80);
  expect(r.q3).toBe(82);
  expect(r.iqr).toBe(2);
  expect(r.lowerBound).toBeCloseTo(79.5, 5);
  expect(r.upperBound).toBeCloseTo(82.5, 5);
  expect(r.included).toEqual([80, 81, 82]);
  expect(r.excluded).toEqual([70, 95]);
  expect(r.consensusScore).toBe(81);
  expect(r.classification.find((c) => c.score === 70)!.aligned).toBe(false);
  expect(r.classification.find((c) => c.score === 95)!.aligned).toBe(false);
  expect(r.classification.find((c) => c.score === 81)!.aligned).toBe(true);
});

test("outlier is excluded from the consensus average and marked misaligned", () => {
  // [90,88,89,91,10] inclusive-halves:
  //   sorted [10,88,89,90,91], median 89
  //   lowerHalf [10,88,89] → Q1 88, upperHalf [89,90,91] → Q3 90
  //   IQR 2, band [87.5, 90.5] → included [88,89,90], excluded [10,91]
  //   consensusScore = (88+89+90)/3 = 89
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
