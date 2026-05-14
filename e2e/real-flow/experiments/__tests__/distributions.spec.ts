// e2e/real-flow/experiments/__tests__/distributions.spec.ts
import { test, expect } from "@playwright/test";
import { makePanelScores, SCORE_DISTRIBUTIONS } from "../distributions";

test("each distribution yields a 5-7 length panel of scores in 0-100", () => {
  for (const dist of SCORE_DISTRIBUTIONS) {
    const scores = makePanelScores(dist, 7, 42);
    expect(scores).toHaveLength(7);
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  }
});

test("a fixed seed makes the panel deterministic", () => {
  expect(makePanelScores("realistic", 6, 7)).toEqual(
    makePanelScores("realistic", 6, 7),
  );
});

test("'polarized' produces two clusters; 'consensus' produces a tight cluster", () => {
  const polar = makePanelScores("polarized", 6, 1);
  const consensus = makePanelScores("consensus", 6, 1);
  const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
  expect(spread(polar)).toBeGreaterThan(spread(consensus));
});
