// e2e/real-flow/oracle/__tests__/consensus.spec.ts
import { test, expect } from "@playwright/test";
import { computeConsensus } from "../consensus";

test("tight cluster: all scores in-band, consensus is their average", () => {
  const r = computeConsensus([80, 82, 84, 83, 81]);
  // median 82, Q1 81, Q3 83, IQR 2, band [80.5, 83.5] -> {82,83,81} in-band
  expect(r.median).toBe(82);
  expect(r.included).toEqual([81, 82, 83]);
  expect(r.excluded).toEqual([80, 84]);
  expect(r.consensusScore).toBeCloseTo(82, 5);
  expect(r.classification.find((c) => c.score === 80)!.aligned).toBe(false);
  expect(r.classification.find((c) => c.score === 82)!.aligned).toBe(true);
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
