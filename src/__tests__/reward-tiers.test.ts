import { describe, it, expect } from "vitest";
import {
  REWARD_TIERS,
  getRewardTier,
  getRewardTierProgress,
} from "@/types/reputation";

describe("REWARD_TIERS constant", () => {
  it("defines exactly 3 tiers per whitepaper Section 3", () => {
    expect(REWARD_TIERS).toHaveLength(3);
  });

  it("has Foundation tier at 0-999 with 1.0x weight", () => {
    const foundation = REWARD_TIERS[0];
    expect(foundation.name).toBe("Foundation");
    expect(foundation.minReputation).toBe(0);
    expect(foundation.maxReputation).toBe(999);
    expect(foundation.rewardWeight).toBe(1.0);
  });

  it("has Established tier at 1000-1999 with 1.25x weight", () => {
    const established = REWARD_TIERS[1];
    expect(established.name).toBe("Established");
    expect(established.minReputation).toBe(1000);
    expect(established.maxReputation).toBe(1999);
    expect(established.rewardWeight).toBe(1.25);
  });

  it("has Authority tier at 2000+ with 1.5x weight", () => {
    const authority = REWARD_TIERS[2];
    expect(authority.name).toBe("Authority");
    expect(authority.minReputation).toBe(2000);
    expect(authority.maxReputation).toBeNull();
    expect(authority.rewardWeight).toBe(1.5);
  });

  it("tiers are contiguous with no gaps", () => {
    for (let i = 1; i < REWARD_TIERS.length; i++) {
      const prev = REWARD_TIERS[i - 1];
      const curr = REWARD_TIERS[i];
      expect(curr.minReputation).toBe((prev.maxReputation ?? 0) + 1);
    }
  });
});

describe("getRewardTier", () => {
  it("returns Foundation for rep 0", () => {
    expect(getRewardTier(0).name).toBe("Foundation");
  });

  it("returns Foundation for rep 500", () => {
    expect(getRewardTier(500).name).toBe("Foundation");
  });

  it("returns Foundation for rep 999", () => {
    expect(getRewardTier(999).name).toBe("Foundation");
  });

  it("returns Established for rep 1000", () => {
    expect(getRewardTier(1000).name).toBe("Established");
  });

  it("returns Established for rep 1500", () => {
    expect(getRewardTier(1500).name).toBe("Established");
  });

  it("returns Established for rep 1999", () => {
    expect(getRewardTier(1999).name).toBe("Established");
  });

  it("returns Authority for rep 2000", () => {
    expect(getRewardTier(2000).name).toBe("Authority");
  });

  it("returns Authority for rep 5000", () => {
    expect(getRewardTier(5000).name).toBe("Authority");
  });

  it("returns Authority for very high rep (50000)", () => {
    expect(getRewardTier(50000).name).toBe("Authority");
  });

  it("returns Foundation as fallback for negative rep", () => {
    expect(getRewardTier(-10).name).toBe("Foundation");
  });
});

describe("getRewardTierProgress", () => {
  it("returns 0% progress at start of Foundation tier", () => {
    const result = getRewardTierProgress(0);
    expect(result.tier.name).toBe("Foundation");
    expect(result.nextTier?.name).toBe("Established");
    expect(result.progress).toBe(0);
  });

  it("returns 50% progress at midpoint of Foundation tier", () => {
    const result = getRewardTierProgress(500);
    expect(result.tier.name).toBe("Foundation");
    expect(result.progress).toBe(50);
  });

  it("returns ~100% progress at top of Foundation tier", () => {
    const result = getRewardTierProgress(999);
    expect(result.tier.name).toBe("Foundation");
    // 999/1000 = 99.9% → rounds to 100
    expect(result.progress).toBe(100);
  });

  it("returns 0% progress at start of Established tier", () => {
    const result = getRewardTierProgress(1000);
    expect(result.tier.name).toBe("Established");
    expect(result.nextTier?.name).toBe("Authority");
    expect(result.progress).toBe(0);
  });

  it("returns 50% progress at midpoint of Established tier", () => {
    const result = getRewardTierProgress(1500);
    expect(result.tier.name).toBe("Established");
    expect(result.progress).toBe(50);
  });

  it("returns 100% progress at Authority tier (max tier)", () => {
    const result = getRewardTierProgress(2000);
    expect(result.tier.name).toBe("Authority");
    expect(result.nextTier).toBeNull();
    expect(result.progress).toBe(100);
  });

  it("returns 100% progress for very high Authority rep", () => {
    const result = getRewardTierProgress(10000);
    expect(result.tier.name).toBe("Authority");
    expect(result.nextTier).toBeNull();
    expect(result.progress).toBe(100);
  });
});

describe("Whitepaper reward formula alignment", () => {
  it("tier weights follow the formula Rewardᵢ = (mᵢ ÷ Σmⱼ) × P", () => {
    // With one expert per tier, total weight = 1.0 + 1.25 + 1.5 = 3.75
    const totalWeight = REWARD_TIERS.reduce((sum, t) => sum + t.rewardWeight, 0);
    expect(totalWeight).toBe(3.75);

    // Foundation share: 1.0/3.75 ≈ 26.67%
    const foundationShare = (1.0 / totalWeight) * 100;
    expect(foundationShare).toBeCloseTo(26.67, 1);

    // Established share: 1.25/3.75 ≈ 33.33%
    const establishedShare = (1.25 / totalWeight) * 100;
    expect(establishedShare).toBeCloseTo(33.33, 1);

    // Authority share: 1.5/3.75 = 40%
    const authorityShare = (1.5 / totalWeight) * 100;
    expect(authorityShare).toBeCloseTo(40.0, 1);
  });

  it("Authority tier earns 50% more than Foundation per expert", () => {
    const foundation = REWARD_TIERS.find((t) => t.name === "Foundation")!;
    const authority = REWARD_TIERS.find((t) => t.name === "Authority")!;
    const ratio = authority.rewardWeight / foundation.rewardWeight;
    expect(ratio).toBe(1.5);
  });

  it("Established tier earns 25% more than Foundation per expert", () => {
    const foundation = REWARD_TIERS.find((t) => t.name === "Foundation")!;
    const established = REWARD_TIERS.find((t) => t.name === "Established")!;
    const ratio = established.rewardWeight / foundation.rewardWeight;
    expect(ratio).toBe(1.25);
  });
});
