/** Types for the expert reputation page. */

export interface ReputationTimelineEntry {
  change_amount: number;
  reason: string;
  description: string;
  guild_name: string;
  vote_score: number | null;
  alignment_distance: number | null;
  slash_percent: number | null;
  reward_amount: number | null;
  consensus_score: number | null;
  candidate_name: string | null;
  outcome: string | null;
  proposal_id: string | null;
  created_at: string;
}

export interface ReputationTierConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
}

/** 3-tier reward system from whitepaper Section 3. */
export type RewardTierName = "Foundation" | "Established" | "Authority";

export interface RewardTier {
  name: RewardTierName;
  minReputation: number;
  maxReputation: number | null;
  rewardWeight: number;
  description: string;
}

export const REWARD_TIERS: RewardTier[] = [
  {
    name: "Foundation",
    minReputation: 0,
    maxReputation: 999,
    rewardWeight: 1.0,
    description: "Calibration phase — earn a proportional base share of every vetting reward pool.",
  },
  {
    name: "Established",
    minReputation: 1000,
    maxReputation: 1999,
    rewardWeight: 1.25,
    description: "Consistent, sustained record of accurate evaluation — 25% reward bonus.",
  },
  {
    name: "Authority",
    minReputation: 2000,
    maxReputation: null,
    rewardWeight: 1.5,
    description: "Expert elite with exceptional accuracy — 50% reward premium.",
  },
];

export function getRewardTier(reputation: number): RewardTier {
  for (let i = REWARD_TIERS.length - 1; i >= 0; i--) {
    if (reputation >= REWARD_TIERS[i].minReputation) {
      return REWARD_TIERS[i];
    }
  }
  return REWARD_TIERS[0];
}

export function getRewardTierProgress(reputation: number): {
  tier: RewardTier;
  nextTier: RewardTier | null;
  progress: number;
} {
  const tier = getRewardTier(reputation);
  const tierIndex = REWARD_TIERS.indexOf(tier);
  const nextTier = tierIndex < REWARD_TIERS.length - 1 ? REWARD_TIERS[tierIndex + 1] : null;

  if (!nextTier) {
    return { tier, nextTier: null, progress: 100 };
  }

  const range = nextTier.minReputation - tier.minReputation;
  const current = reputation - tier.minReputation;
  const progress = Math.min(Math.round((current / range) * 100), 100);

  return { tier, nextTier, progress };
}
