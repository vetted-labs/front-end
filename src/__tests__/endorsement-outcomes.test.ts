import { describe, it, expect } from "vitest";

// ─── API contract checks ──────────────────────────────────────────────────────

describe("endorsementAccountabilityApi contract", () => {
  it("is exported from @/lib/api", async () => {
    const apiModule = await import("@/lib/api");
    expect(apiModule.endorsementAccountabilityApi).toBeDefined();
  });

  it("exposes recordHireOutcome as a function", async () => {
    const { endorsementAccountabilityApi } = await import("@/lib/api");
    expect(typeof endorsementAccountabilityApi.recordHireOutcome).toBe("function");
  });

  it("exposes reportPerformanceIssue as a function", async () => {
    const { endorsementAccountabilityApi } = await import("@/lib/api");
    expect(typeof endorsementAccountabilityApi.reportPerformanceIssue).toBe("function");
  });

  it("exposes getHireOutcome as a function", async () => {
    const { endorsementAccountabilityApi } = await import("@/lib/api");
    expect(typeof endorsementAccountabilityApi.getHireOutcome).toBe("function");
  });

  it("exposes getExpertRewards as a function", async () => {
    const { endorsementAccountabilityApi } = await import("@/lib/api");
    expect(typeof endorsementAccountabilityApi.getExpertRewards).toBe("function");
  });

  it("exposes fileDispute as a function", async () => {
    const { endorsementAccountabilityApi } = await import("@/lib/api");
    expect(typeof endorsementAccountabilityApi.fileDispute).toBe("function");
  });

  it("exposes submitArbitrationVote as a function", async () => {
    const { endorsementAccountabilityApi } = await import("@/lib/api");
    expect(typeof endorsementAccountabilityApi.submitArbitrationVote).toBe("function");
  });
});

describe("analyticsApi contract", () => {
  it("is exported from @/lib/api", async () => {
    const apiModule = await import("@/lib/api");
    expect(apiModule.analyticsApi).toBeDefined();
  });
});

// ─── Endorsement outcome logic ────────────────────────────────────────────────

/**
 * COMPLETED_STATUSES mirrors the Set defined in MyEndorsementsHistory.tsx.
 * Tests verify the membership rules without importing from the component
 * (which is a React module and would require a full DOM render environment).
 */
const COMPLETED_STATUSES = new Set(["hired", "not_hired", "refunded"]);

describe("COMPLETED_STATUSES — completed set membership", () => {
  it('"hired" is a completed status', () => {
    expect(COMPLETED_STATUSES.has("hired")).toBe(true);
  });

  it('"not_hired" is a completed status', () => {
    expect(COMPLETED_STATUSES.has("not_hired")).toBe(true);
  });

  it('"refunded" is a completed status', () => {
    expect(COMPLETED_STATUSES.has("refunded")).toBe(true);
  });

  it('"pending" is NOT a completed status', () => {
    expect(COMPLETED_STATUSES.has("pending")).toBe(false);
  });

  it('"active" is NOT a completed status', () => {
    expect(COMPLETED_STATUSES.has("active")).toBe(false);
  });

  it('"reviewing" is NOT a completed status', () => {
    expect(COMPLETED_STATUSES.has("reviewing")).toBe(false);
  });

  it("contains exactly 3 completed statuses", () => {
    expect(COMPLETED_STATUSES.size).toBe(3);
  });
});

/**
 * OutcomeBadge label mapping — mirrors the component logic from
 * MyEndorsementsHistory.tsx without requiring a React render.
 */
function getOutcomeBadgeLabel(statusKey: string): string | null {
  if (statusKey === "hired") return "Hired";
  if (statusKey === "not_hired") return "Not Hired — 10% Slashed";
  if (statusKey === "refunded") return "Refunded";
  return null;
}

describe("OutcomeBadge label mapping", () => {
  it('"hired" maps to "Hired"', () => {
    expect(getOutcomeBadgeLabel("hired")).toBe("Hired");
  });

  it('"not_hired" maps to "Not Hired — 10% Slashed"', () => {
    expect(getOutcomeBadgeLabel("not_hired")).toBe("Not Hired — 10% Slashed");
  });

  it('"refunded" maps to "Refunded"', () => {
    expect(getOutcomeBadgeLabel("refunded")).toBe("Refunded");
  });

  it("unknown status maps to null", () => {
    expect(getOutcomeBadgeLabel("pending")).toBeNull();
  });

  it("empty string maps to null", () => {
    expect(getOutcomeBadgeLabel("")).toBeNull();
  });

  it("unrecognised status maps to null", () => {
    expect(getOutcomeBadgeLabel("some_unknown_status")).toBeNull();
  });
});

describe("Endorsement slash — fixed at 10%", () => {
  const ENDORSEMENT_SLASH_PCT = 10;

  it("slash percentage is 10%", () => {
    expect(ENDORSEMENT_SLASH_PCT).toBe(10);
  });

  it("a 100 VETD bid results in exactly 10 VETD slashed", () => {
    const bid = 100;
    const slashed = (bid * ENDORSEMENT_SLASH_PCT) / 100;
    expect(slashed).toBe(10);
  });

  it("a 50 VETD bid results in 5 VETD slashed", () => {
    const bid = 50;
    const slashed = (bid * ENDORSEMENT_SLASH_PCT) / 100;
    expect(slashed).toBe(5);
  });

  it("a 200 VETD bid results in 20 VETD slashed", () => {
    const bid = 200;
    const slashed = (bid * ENDORSEMENT_SLASH_PCT) / 100;
    expect(slashed).toBe(20);
  });
});

// ─── Dispute appeal window ────────────────────────────────────────────────────

const APPEAL_WINDOW_DAYS = 7;
const APPEAL_WINDOW_MS = APPEAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;

function getAppealDeadline(resolvedAt: string): Date {
  return new Date(new Date(resolvedAt).getTime() + APPEAL_WINDOW_MS);
}

function getDaysRemaining(deadline: Date, now: Date): number {
  return Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

function canAppeal(resolvedAt: string, now: Date): boolean {
  return now < getAppealDeadline(resolvedAt);
}

describe("Dispute appeal window — configuration", () => {
  it("appeal window is 7 days", () => {
    expect(APPEAL_WINDOW_DAYS).toBe(7);
  });

  it("appeal window in milliseconds equals 7 × 24 × 60 × 60 × 1000", () => {
    expect(APPEAL_WINDOW_MS).toBe(604_800_000);
  });
});

describe("Dispute appeal window — deadline calculation", () => {
  it("deadline is resolvedAt + 7 days", () => {
    const resolvedAt = "2026-03-01T00:00:00.000Z";
    const deadline = getAppealDeadline(resolvedAt);
    const expected = new Date("2026-03-08T00:00:00.000Z");
    expect(deadline.getTime()).toBe(expected.getTime());
  });

  it("deadline is exactly 7 days after resolvedAt (specific dates)", () => {
    const resolvedAt = "2026-04-01T12:30:00.000Z";
    const deadline = getAppealDeadline(resolvedAt);
    // 7 days later: 2026-04-08T12:30:00.000Z
    expect(deadline.toISOString()).toBe("2026-04-08T12:30:00.000Z");
  });

  it("deadline at end-of-month rolls into the next month correctly", () => {
    const resolvedAt = "2026-01-28T00:00:00.000Z";
    const deadline = getAppealDeadline(resolvedAt);
    // 2026-01-28 + 7 days = 2026-02-04
    expect(deadline.toISOString()).toBe("2026-02-04T00:00:00.000Z");
  });
});

describe("Dispute appeal window — days remaining", () => {
  it("returns 7 when checked immediately after resolution", () => {
    const resolvedAt = "2026-03-01T00:00:00.000Z";
    const deadline = getAppealDeadline(resolvedAt);
    const now = new Date("2026-03-01T00:00:01.000Z"); // 1 second after
    expect(getDaysRemaining(deadline, now)).toBe(7);
  });

  it("returns 4 when 3 full days have elapsed", () => {
    const resolvedAt = "2026-03-01T00:00:00.000Z";
    const deadline = getAppealDeadline(resolvedAt);
    const now = new Date("2026-03-04T00:00:00.000Z"); // exactly 3 days later
    expect(getDaysRemaining(deadline, now)).toBe(4);
  });

  it("returns 1 on the last day", () => {
    const resolvedAt = "2026-03-01T00:00:00.000Z";
    const deadline = getAppealDeadline(resolvedAt);
    // 1 hour before deadline
    const now = new Date(deadline.getTime() - 60 * 60 * 1000);
    expect(getDaysRemaining(deadline, now)).toBe(1);
  });

  it("returns 0 or negative when exactly at or past the deadline", () => {
    const resolvedAt = "2026-03-01T00:00:00.000Z";
    const deadline = getAppealDeadline(resolvedAt);
    const now = new Date(deadline.getTime()); // exactly at deadline
    expect(getDaysRemaining(deadline, now)).toBeLessThanOrEqual(0);
  });
});

describe("Dispute appeal window — canAppeal check", () => {
  it("returns true when checked 1 day after resolution (well within window)", () => {
    const resolvedAt = "2026-03-01T00:00:00.000Z";
    const now = new Date("2026-03-02T00:00:00.000Z");
    expect(canAppeal(resolvedAt, now)).toBe(true);
  });

  it("returns true when checked 6 days after resolution (within window)", () => {
    const resolvedAt = "2026-03-01T00:00:00.000Z";
    const now = new Date("2026-03-07T00:00:00.000Z");
    expect(canAppeal(resolvedAt, now)).toBe(true);
  });

  it("returns false when checked exactly 7 days after resolution (deadline passed)", () => {
    const resolvedAt = "2026-03-01T00:00:00.000Z";
    // 7 days later is exactly at the boundary — not < deadline
    const now = new Date("2026-03-08T00:00:00.000Z");
    expect(canAppeal(resolvedAt, now)).toBe(false);
  });

  it("returns false when checked 8 days after resolution (well past window)", () => {
    const resolvedAt = "2026-03-01T00:00:00.000Z";
    const now = new Date("2026-03-09T00:00:00.000Z");
    expect(canAppeal(resolvedAt, now)).toBe(false);
  });

  it("returns false when checked 30 days after resolution", () => {
    const resolvedAt = "2026-03-01T00:00:00.000Z";
    const now = new Date("2026-03-31T00:00:00.000Z");
    expect(canAppeal(resolvedAt, now)).toBe(false);
  });
});

// ─── Vetting alignment slashing tiers ────────────────────────────────────────

/**
 * Alignment slashing tiers mirror the ApplicationFinalizationDisplay.tsx
 * and ExpertApplicationFinalization.votes[].slashingTier field.
 * These rules are defined inline here as they are currently spread across
 * the UI and types rather than exported as a standalone config.
 */
interface AlignmentTier {
  name: string;
  slashPercent: number;
  repChange: number;
}

const VETTING_ALIGNMENT_TIERS: AlignmentTier[] = [
  { name: "aligned",  slashPercent: 0,  repChange: +10 },
  { name: "mild",     slashPercent: 5,  repChange: -5  },
  { name: "moderate", slashPercent: 15, repChange: -10 },
  { name: "severe",   slashPercent: 25, repChange: -20 },
];

describe("Vetting alignment slashing tiers — structure", () => {
  it("defines exactly 4 tiers", () => {
    expect(VETTING_ALIGNMENT_TIERS).toHaveLength(4);
  });

  it("tier names are aligned, mild, moderate, severe in order", () => {
    expect(VETTING_ALIGNMENT_TIERS.map((t) => t.name)).toEqual([
      "aligned",
      "mild",
      "moderate",
      "severe",
    ]);
  });
});

describe("Vetting alignment slashing tiers — aligned (0% slash, +10 rep)", () => {
  const tier = VETTING_ALIGNMENT_TIERS[0];

  it("name is 'aligned'", () => {
    expect(tier.name).toBe("aligned");
  });

  it("slash percent is 0", () => {
    expect(tier.slashPercent).toBe(0);
  });

  it("rep change is +10", () => {
    expect(tier.repChange).toBe(10);
  });
});

describe("Vetting alignment slashing tiers — mild (5% slash, -5 rep)", () => {
  const tier = VETTING_ALIGNMENT_TIERS[1];

  it("name is 'mild'", () => {
    expect(tier.name).toBe("mild");
  });

  it("slash percent is 5", () => {
    expect(tier.slashPercent).toBe(5);
  });

  it("rep change is -5", () => {
    expect(tier.repChange).toBe(-5);
  });
});

describe("Vetting alignment slashing tiers — moderate (15% slash, -10 rep)", () => {
  const tier = VETTING_ALIGNMENT_TIERS[2];

  it("name is 'moderate'", () => {
    expect(tier.name).toBe("moderate");
  });

  it("slash percent is 15", () => {
    expect(tier.slashPercent).toBe(15);
  });

  it("rep change is -10", () => {
    expect(tier.repChange).toBe(-10);
  });
});

describe("Vetting alignment slashing tiers — severe (25% slash, -20 rep)", () => {
  const tier = VETTING_ALIGNMENT_TIERS[3];

  it("name is 'severe'", () => {
    expect(tier.name).toBe("severe");
  });

  it("slash percent is 25", () => {
    expect(tier.slashPercent).toBe(25);
  });

  it("rep change is -20", () => {
    expect(tier.repChange).toBe(-20);
  });
});

describe("Vetting alignment slashing tiers — monotonic severity", () => {
  it("slash percentages increase monotonically from aligned → severe", () => {
    for (let i = 1; i < VETTING_ALIGNMENT_TIERS.length; i++) {
      expect(VETTING_ALIGNMENT_TIERS[i].slashPercent).toBeGreaterThan(
        VETTING_ALIGNMENT_TIERS[i - 1].slashPercent
      );
    }
  });

  it("rep changes decrease monotonically from aligned → severe", () => {
    for (let i = 1; i < VETTING_ALIGNMENT_TIERS.length; i++) {
      expect(VETTING_ALIGNMENT_TIERS[i].repChange).toBeLessThan(
        VETTING_ALIGNMENT_TIERS[i - 1].repChange
      );
    }
  });

  it("max slash is 25%", () => {
    const maxSlash = Math.max(...VETTING_ALIGNMENT_TIERS.map((t) => t.slashPercent));
    expect(maxSlash).toBe(25);
  });

  it("max rep penalty is -20", () => {
    const minRepChange = Math.min(...VETTING_ALIGNMENT_TIERS.map((t) => t.repChange));
    expect(minRepChange).toBe(-20);
  });

  it("only the aligned tier has no slash (0%)", () => {
    const zeroSlashTiers = VETTING_ALIGNMENT_TIERS.filter((t) => t.slashPercent === 0);
    expect(zeroSlashTiers).toHaveLength(1);
    expect(zeroSlashTiers[0].name).toBe("aligned");
  });

  it("only the aligned tier has a positive rep change", () => {
    const positiveTiers = VETTING_ALIGNMENT_TIERS.filter((t) => t.repChange > 0);
    expect(positiveTiers).toHaveLength(1);
    expect(positiveTiers[0].name).toBe("aligned");
  });

  it("all non-aligned tiers carry a negative rep change", () => {
    VETTING_ALIGNMENT_TIERS.filter((t) => t.name !== "aligned").forEach((tier) => {
      expect(tier.repChange).toBeLessThan(0);
    });
  });
});
