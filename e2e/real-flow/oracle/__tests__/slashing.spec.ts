// e2e/real-flow/oracle/__tests__/slashing.spec.ts
import { test, expect } from "@playwright/test";
import { reviewSlash } from "../slashing";

test("aligned reviewer: 0% slash, full stake returned, +10 reputation", () => {
  const r = reviewSlash({ aligned: true, stake: 50 });
  expect(r.slashPercent).toBe(0);
  expect(r.slashedAmount).toBe(0);
  expect(r.stakeReturned).toBe(50);
  expect(r.reputationDelta).toBe(10);
  expect(r.sharesRewardPool).toBe(true);
});

test("misaligned reviewer: 25% slash, 75% stake returned, -20 reputation", () => {
  const r = reviewSlash({ aligned: false, stake: 50 });
  expect(r.slashPercent).toBe(25);
  expect(r.slashedAmount).toBeCloseTo(12.5, 5);
  expect(r.stakeReturned).toBeCloseTo(37.5, 5);
  expect(r.reputationDelta).toBe(-20);
  expect(r.sharesRewardPool).toBe(false);
});

test("optional platform fee is applied to the returned stake when supplied", () => {
  // Appendix example: aligned 50 VETD stake, 1% platform fee = 0.5 returned-net.
  const r = reviewSlash({ aligned: true, stake: 50, platformFeePercent: 1 });
  expect(r.platformFee).toBeCloseTo(0.5, 5);
  expect(r.stakeReturnedNet).toBeCloseTo(49.5, 5);
});
