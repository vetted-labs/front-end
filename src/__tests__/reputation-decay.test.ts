import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getDaysUntilDecay,
  buildMonthlyScores,
  computeAccuracy,
  computeConsistency,
} from "@/lib/reputation-helpers";
import type { ReputationTimelineEntry } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal ReputationTimelineEntry for testing. */
function makeEntry(
  created_at: string,
  change_amount: number,
  overrides: Partial<ReputationTimelineEntry> = {},
): ReputationTimelineEntry {
  return {
    change_amount,
    created_at,
    reason: "aligned",
    description: "",
    guild_name: "",
    vote_score: null,
    alignment_distance: null,
    slash_percent: null,
    reward_amount: null,
    consensus_score: null,
    candidate_name: null,
    outcome: null,
    proposal_id: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getDaysUntilDecay
// ---------------------------------------------------------------------------

describe("getDaysUntilDecay", () => {
  // Freeze time at 2026-04-06T12:00:00Z
  const FIXED_NOW = new Date("2026-04-06T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 when recentActivity is undefined", () => {
    expect(getDaysUntilDecay(undefined)).toBe(0);
  });

  it("returns 0 when recentActivity is an empty array", () => {
    expect(getDaysUntilDecay([])).toBe(0);
  });

  it("returns 0 when all timestamps are invalid", () => {
    expect(getDaysUntilDecay([{ timestamp: "not-a-date" }, { timestamp: "" }])).toBe(0);
  });

  it("returns 0 when most-recent activity was more than 30 days ago", () => {
    // 31 days before FIXED_NOW
    const ts = new Date(FIXED_NOW - 31 * 24 * 60 * 60 * 1000).toISOString();
    expect(getDaysUntilDecay([{ timestamp: ts }])).toBe(0);
  });

  it("returns 0 on the exact decay boundary (30 days ago)", () => {
    const ts = new Date(FIXED_NOW - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(getDaysUntilDecay([{ timestamp: ts }])).toBe(0);
  });

  it("returns positive days remaining for recent activity", () => {
    // Activity 10 days ago → 20 days remaining
    const ts = new Date(FIXED_NOW - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(getDaysUntilDecay([{ timestamp: ts }])).toBe(20);
  });

  it("uses the most recent timestamp when multiple entries exist", () => {
    const old = new Date(FIXED_NOW - 25 * 24 * 60 * 60 * 1000).toISOString(); // 5 days left
    const recent = new Date(FIXED_NOW - 5 * 24 * 60 * 60 * 1000).toISOString(); // 25 days left
    expect(getDaysUntilDecay([{ timestamp: old }, { timestamp: recent }])).toBe(25);
  });

  it("returns 30 when activity happened today (now)", () => {
    const ts = new Date(FIXED_NOW).toISOString();
    expect(getDaysUntilDecay([{ timestamp: ts }])).toBe(30);
  });

  it("ignores invalid timestamps and uses valid ones", () => {
    // 5 days ago → 25 days remaining
    const valid = new Date(FIXED_NOW - 5 * 24 * 60 * 60 * 1000).toISOString();
    const result = getDaysUntilDecay([{ timestamp: "bad" }, { timestamp: valid }]);
    expect(result).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// buildMonthlyScores
// ---------------------------------------------------------------------------

describe("buildMonthlyScores", () => {
  // Freeze time at 2026-04-15T12:00:00Z  (current month = April 2026)
  const FIXED_NOW = new Date("2026-04-15T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns exactly 6 months", () => {
    const result = buildMonthlyScores([], 500);
    expect(result).toHaveLength(6);
  });

  it("returns all months at the current reputation when timeline is empty", () => {
    const result = buildMonthlyScores([], 500);
    for (const m of result) {
      expect(m.score).toBe(500);
    }
  });

  it("last entry in result is the current month (Apr)", () => {
    const result = buildMonthlyScores([], 500);
    // With fake time at Apr 15 2026, current month label is "Apr"
    expect(result[result.length - 1].month).toBe("Apr");
  });

  it("first entry is 5 months ago (Nov 2025)", () => {
    const result = buildMonthlyScores([], 500);
    expect(result[0].month).toBe("Nov");
  });

  it("subtracts current-month changes to reconstruct prior-month score", () => {
    // If current score is 500 and Apr has a +50 entry, then Mar score should be 450
    const timeline = [makeEntry("2026-04-10T00:00:00Z", 50)];
    const result = buildMonthlyScores(timeline, 500);
    const aprIdx = result.findIndex((m) => m.month === "Apr");
    const marIdx = result.findIndex((m) => m.month === "Mar");
    expect(result[aprIdx].score).toBe(500);
    expect(result[marIdx].score).toBe(450);
  });

  it("handles multiple entries in the same month", () => {
    // Apr: +30 + +20 = +50 total → Mar should be 500 - 50 = 450
    const timeline = [
      makeEntry("2026-04-01T00:00:00Z", 30),
      makeEntry("2026-04-20T00:00:00Z", 20),
    ];
    const result = buildMonthlyScores(timeline, 500);
    const marIdx = result.findIndex((m) => m.month === "Mar");
    expect(result[marIdx].score).toBe(450);
  });

  it("leaves months with no activity unchanged from the running score", () => {
    // Only Feb 2026 had changes (+100); months before that should be 500 - 100 = 400
    const timeline = [makeEntry("2026-02-15T00:00:00Z", 100)];
    const result = buildMonthlyScores(timeline, 500);

    const novIdx = result.findIndex((m) => m.month === "Nov");
    const decIdx = result.findIndex((m) => m.month === "Dec");
    const janIdx = result.findIndex((m) => m.month === "Jan");
    const febIdx = result.findIndex((m) => m.month === "Feb");
    const marIdx = result.findIndex((m) => m.month === "Mar");
    const aprIdx = result.findIndex((m) => m.month === "Apr");

    // Current score is 500 (Apr)
    expect(result[aprIdx].score).toBe(500);
    // Mar had no changes, same as Apr
    expect(result[marIdx].score).toBe(500);
    // Feb had +100, so months before it are 400
    expect(result[febIdx].score).toBe(500);
    expect(result[janIdx].score).toBe(400);
    expect(result[decIdx].score).toBe(400);
    expect(result[novIdx].score).toBe(400);
  });

  it("correctly handles negative changes (losses)", () => {
    // Current score 500, Mar had -50 → Feb score = 500 - (-50) = 550
    const timeline = [makeEntry("2026-03-10T00:00:00Z", -50)];
    const result = buildMonthlyScores(timeline, 500);
    const aprIdx = result.findIndex((m) => m.month === "Apr");
    const marIdx = result.findIndex((m) => m.month === "Mar");
    const febIdx = result.findIndex((m) => m.month === "Feb");
    expect(result[aprIdx].score).toBe(500);
    expect(result[marIdx].score).toBe(500);
    expect(result[febIdx].score).toBe(550);
  });
});

// ---------------------------------------------------------------------------
// computeAccuracy
// ---------------------------------------------------------------------------

describe("computeAccuracy", () => {
  it("returns 100 when both counts are 0", () => {
    expect(computeAccuracy(0, 0)).toBe(100);
  });

  it("returns 100 when there are only aligned votes (0 deviations)", () => {
    expect(computeAccuracy(10, 0)).toBe(100);
  });

  it("returns 0 when there are only deviation votes (0 aligned)", () => {
    expect(computeAccuracy(0, 10)).toBe(0);
  });

  it("returns 50 for equal aligned and deviation counts", () => {
    expect(computeAccuracy(5, 5)).toBe(50);
  });

  it("returns 80 for 8 aligned out of 10 total", () => {
    expect(computeAccuracy(8, 2)).toBe(80);
  });

  it("returns 33 for 1 aligned out of 3 total (rounds down)", () => {
    expect(computeAccuracy(1, 2)).toBe(33);
  });
});

// ---------------------------------------------------------------------------
// computeConsistency
// ---------------------------------------------------------------------------

describe("computeConsistency", () => {
  it("returns 100 when there is no activity (both 0)", () => {
    expect(computeConsistency(0, 0)).toBe(100);
  });

  it("returns 100 when all activity is gains (no losses)", () => {
    expect(computeConsistency(50, 0)).toBe(100);
  });

  it("returns 0 when all activity is losses (no gains)", () => {
    expect(computeConsistency(0, -50)).toBe(0);
  });

  it("returns 50 for equal gains and losses", () => {
    expect(computeConsistency(50, -50)).toBe(50);
  });

  it("returns 80 for gains of 80 and losses of -20", () => {
    expect(computeConsistency(80, -20)).toBe(80);
  });

  it("caps at 100 even if gains vastly outweigh losses", () => {
    // gains=200 losses=-1 → ratio = 200/201 ≈ 99.5% → rounds to 100, then Math.min(100,...) = 100
    expect(computeConsistency(200, -1)).toBe(100);
  });
});
