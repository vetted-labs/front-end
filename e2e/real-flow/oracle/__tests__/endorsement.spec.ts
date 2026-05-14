// e2e/real-flow/oracle/__tests__/endorsement.spec.ts
import { test, expect } from "@playwright/test";
import {
  endorsementPayout,
  notHiredSlash,
  performanceSlash,
} from "../endorsement";

test("Appendix Single Endorsement Case: $90k salary -> 7% pool, top-3 split, 50/50", () => {
  const p = endorsementPayout(90_000);
  expect(p.expertPool).toBeCloseTo(6_300, 5); // 7% of 90k
  expect(p.perEndorser).toBeCloseTo(2_100, 5); // split among 3
  expect(p.immediate).toBeCloseTo(1_050, 5); // 50%
  expect(p.locked).toBeCloseTo(1_050, 5); // 50%, locked 90 days
});

test("not-hired: 10% of each endorser's stake slashed", () => {
  // Appendix example endorser stakes 800 / 750 / 600.
  expect(notHiredSlash(800).slashed).toBeCloseTo(80, 5);
  expect(notHiredSlash(750).slashed).toBeCloseTo(75, 5);
  expect(notHiredSlash(600).slashed).toBeCloseTo(60, 5);
  expect(notHiredSlash(800).returned).toBeCloseTo(720, 5);
});

test("performance slash severity scale applies to the LOCKED half only", () => {
  const locked = 1_050; // from the $90k example
  expect(performanceSlash(locked, 0).slashed).toBe(0);
  expect(performanceSlash(locked, 25).slashed).toBeCloseTo(262.5, 5);
  expect(performanceSlash(locked, 50).slashed).toBeCloseTo(525, 5);
  expect(performanceSlash(locked, 100).slashed).toBeCloseTo(1_050, 5);
  // The immediate half is never touched by performance slashing.
  expect(performanceSlash(locked, 100).immediateUnaffected).toBe(true);
});

test("performanceSlash rejects a severity not on the appendix scale", () => {
  expect(() => performanceSlash(1000, 37 as never)).toThrow(/severity/i);
});
