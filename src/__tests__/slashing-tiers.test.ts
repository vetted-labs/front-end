import { describe, it, expect } from "vitest";
import {
  computeVoteWeight,
  REPUTATION_DECAY_CYCLE_DAYS,
} from "@/config/constants";
import {
  STATUS_COLORS,
  getMatchScoreColors,
  getUrgencyColors,
  getCandidateStatusDot,
} from "@/config/colors";

// ─── computeVoteWeight ───────────────────────────────────────────────────────

describe("computeVoteWeight — non-guild-master", () => {
  it("returns 1.0 at 0 reputation", () => {
    expect(computeVoteWeight(0)).toBe(1.0);
  });

  it("returns 1.5 at 500 reputation", () => {
    expect(computeVoteWeight(500)).toBe(1.5);
  });

  it("returns 2.0 at 1000 reputation", () => {
    expect(computeVoteWeight(1000)).toBe(2.0);
  });

  it("returns 2.5 at 1500 reputation", () => {
    expect(computeVoteWeight(1500)).toBe(2.5);
  });

  it("returns 3.0 at 2000 reputation (cap)", () => {
    expect(computeVoteWeight(2000)).toBe(3.0);
  });

  it("returns 3.0 at 5000 reputation (cap still applies)", () => {
    expect(computeVoteWeight(5000)).toBe(3.0);
  });

  it("defaults isGuildMaster to false", () => {
    // Explicit false vs default should produce identical results
    expect(computeVoteWeight(1000, false)).toBe(computeVoteWeight(1000));
  });
});

describe("computeVoteWeight — guild master (1.5x multiplier, capped at 4.5)", () => {
  it("returns 1.5 at 0 reputation", () => {
    expect(computeVoteWeight(0, true)).toBe(1.5);
  });

  it("returns 3.0 at 1000 reputation", () => {
    expect(computeVoteWeight(1000, true)).toBe(3.0);
  });

  it("returns 4.5 at 2000 reputation (cap)", () => {
    expect(computeVoteWeight(2000, true)).toBe(4.5);
  });

  it("returns 4.5 at 5000 reputation (cap still applies)", () => {
    expect(computeVoteWeight(5000, true)).toBe(4.5);
  });

  it("guild master weight is always >= non-guild-master weight", () => {
    [0, 500, 1000, 1500, 2000, 5000].forEach((rep) => {
      expect(computeVoteWeight(rep, true)).toBeGreaterThanOrEqual(
        computeVoteWeight(rep, false)
      );
    });
  });
});

// ─── REPUTATION_DECAY_CYCLE_DAYS ─────────────────────────────────────────────

describe("REPUTATION_DECAY_CYCLE_DAYS", () => {
  it("is exactly 30 days per whitepaper schedule", () => {
    expect(REPUTATION_DECAY_CYCLE_DAYS).toBe(30);
  });
});

// ─── getMatchScoreColors ─────────────────────────────────────────────────────

describe("getMatchScoreColors — boundary tests", () => {
  it("returns positive colors at exactly 70 (lower bound of positive)", () => {
    expect(getMatchScoreColors(70)).toEqual(STATUS_COLORS.positive);
  });

  it("returns positive colors at 100 (perfect score)", () => {
    expect(getMatchScoreColors(100)).toEqual(STATUS_COLORS.positive);
  });

  it("returns warning colors at exactly 40 (lower bound of warning)", () => {
    expect(getMatchScoreColors(40)).toEqual(STATUS_COLORS.warning);
  });

  it("returns warning colors at 69 (just below positive threshold)", () => {
    expect(getMatchScoreColors(69)).toEqual(STATUS_COLORS.warning);
  });

  it("returns negative colors at 39 (just below warning threshold)", () => {
    expect(getMatchScoreColors(39)).toEqual(STATUS_COLORS.negative);
  });

  it("returns negative colors at 0 (zero score)", () => {
    expect(getMatchScoreColors(0)).toEqual(STATUS_COLORS.negative);
  });
});

// ─── getUrgencyColors ────────────────────────────────────────────────────────

describe("getUrgencyColors — boundary tests", () => {
  it("returns neutral.badge when hoursLeft is null (no deadline)", () => {
    expect(getUrgencyColors(null)).toBe(STATUS_COLORS.neutral.badge);
  });

  it("returns muted string when hoursLeft is 0 (expired)", () => {
    expect(getUrgencyColors(0)).toBe(
      "bg-muted text-muted-foreground border border-border"
    );
  });

  it("returns muted string when hoursLeft is negative (overdue)", () => {
    expect(getUrgencyColors(-1)).toBe(
      "bg-muted text-muted-foreground border border-border"
    );
  });

  it("returns negative.badge at 1 hour left (critical)", () => {
    expect(getUrgencyColors(1)).toBe(STATUS_COLORS.negative.badge);
  });

  it("returns negative.badge at 5 hours left (still critical)", () => {
    expect(getUrgencyColors(5)).toBe(STATUS_COLORS.negative.badge);
  });

  it("returns warning.badge at exactly 6 hours left (lower bound of warning)", () => {
    expect(getUrgencyColors(6)).toBe(STATUS_COLORS.warning.badge);
  });

  it("returns warning.badge at 23 hours left (just below safe threshold)", () => {
    expect(getUrgencyColors(23)).toBe(STATUS_COLORS.warning.badge);
  });

  it("returns positive.badge at exactly 24 hours left (lower bound of safe)", () => {
    expect(getUrgencyColors(24)).toBe(STATUS_COLORS.positive.badge);
  });

  it("returns positive.badge at 72 hours left (well within safe range)", () => {
    expect(getUrgencyColors(72)).toBe(STATUS_COLORS.positive.badge);
  });
});

// ─── getCandidateStatusDot ───────────────────────────────────────────────────

describe("getCandidateStatusDot — known statuses", () => {
  it("returns bg-primary for pending status", () => {
    expect(getCandidateStatusDot("pending")).toBe("bg-primary");
  });

  it("returns bg-info-blue for reviewing status", () => {
    expect(getCandidateStatusDot("reviewing")).toBe("bg-info-blue");
  });

  it("returns bg-rank-officer for interviewed status", () => {
    expect(getCandidateStatusDot("interviewed")).toBe("bg-rank-officer");
  });

  it("returns bg-positive for accepted status", () => {
    expect(getCandidateStatusDot("accepted")).toBe("bg-positive");
  });

  it("returns bg-negative for rejected status", () => {
    expect(getCandidateStatusDot("rejected")).toBe("bg-negative");
  });
});

describe("getCandidateStatusDot — unknown status fallback", () => {
  it("returns bg-neutral for an unrecognised status string", () => {
    expect(getCandidateStatusDot("unknown")).toBe("bg-neutral");
  });

  it("returns bg-neutral for an empty string", () => {
    expect(getCandidateStatusDot("")).toBe("bg-neutral");
  });

  it("returns bg-neutral for a made-up status", () => {
    expect(getCandidateStatusDot("archived")).toBe("bg-neutral");
  });
});
