// e2e/real-flow/oracle/__tests__/rewards.spec.ts
import { test, expect } from "@playwright/test";
import { tierOf, tierWeight, distributeReward } from "../rewards";

test("tier thresholds per Appendix §3", () => {
  expect(tierOf(0)).toBe(0);
  expect(tierOf(999)).toBe(0);
  expect(tierOf(1000)).toBe(1);
  expect(tierOf(1999)).toBe(1);
  expect(tierOf(2000)).toBe(2);
  expect(tierWeight(0)).toBe(1.0);
  expect(tierWeight(1)).toBe(1.25);
  expect(tierWeight(2)).toBe(1.5);
});

test("Appendix Example A: 5x Tier-0, pool 500 -> each 100.00", () => {
  const r = distributeReward([0, 0, 0, 0, 0].map((rep) => ({ reputation: rep })), 500);
  expect(r.rewards.map((x) => Number(x.reward.toFixed(2)))).toEqual([
    100, 100, 100, 100, 100,
  ]);
  expect(Number(r.totalDistributed.toFixed(2))).toBe(500);
});

test("Appendix Example B: 2x T0, 2x T1, 1x T2, pool 500", () => {
  const r = distributeReward(
    [450, 720, 1100, 1800, 2400].map((rep) => ({ reputation: rep })),
    500,
  );
  const rounded = r.rewards.map((x) => Number(x.reward.toFixed(2)));
  expect(rounded).toEqual([83.33, 83.33, 104.17, 104.17, 125.0]);
  expect(Number(r.totalDistributed.toFixed(2))).toBe(500);
});

test("Appendix Example C: 3x T0, 2x T1, 2x T2, pool 700", () => {
  const r = distributeReward(
    [80, 350, 900, 1200, 1750, 2200, 3500].map((rep) => ({ reputation: rep })),
    700,
  );
  const rounded = r.rewards.map((x) => Number(x.reward.toFixed(2)));
  expect(rounded).toEqual([82.35, 82.35, 82.35, 102.94, 102.94, 123.53, 123.53]);
  expect(Number(r.totalDistributed.toFixed(2))).toBe(700);
});

test("pool conservation holds for arbitrary inputs", () => {
  const r = distributeReward(
    [10, 1500, 2999, 0, 1001].map((rep) => ({ reputation: rep })),
    1234.56,
  );
  expect(r.totalDistributed).toBeCloseTo(1234.56, 6);
});
