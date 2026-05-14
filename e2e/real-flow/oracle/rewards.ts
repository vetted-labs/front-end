// e2e/real-flow/oracle/rewards.ts
//
// Reward distribution — Technical Appendix §3 "Vetting Reward Distribution".
// PRIMARY model: tier-weight distribution Reward_i = (m_i / Sum m_j) * P.
// This is the model the appendix gives WORKED EXAMPLES for (Examples A/B/C).
//
// DOCUMENTED CONTRADICTION: Appendix §7 gives a DIFFERENT reward-weight
// formula W_i = log2(R_i / R_avg + epsilon). The appendix contradicts itself.
// `rewardWeightLog2` below exposes the §7 form, clearly labeled, so callers
// can compare — but the oracle's canonical distributor uses §3 because §3 is
// the exemplified, internally-consistent one. See WHITEPAPER_RECONCILIATION.md §6.

export type Tier = 0 | 1 | 2;

/** Tier from a reputation score — Appendix §3 thresholds. */
export function tierOf(reputation: number): Tier {
  if (reputation >= 2000) return 2;
  if (reputation >= 1000) return 1;
  return 0;
}

/** Tier weight m_i — Appendix §3 (1.00 / 1.25 / 1.50). */
export function tierWeight(tier: Tier): number {
  return tier === 2 ? 1.5 : tier === 1 ? 1.25 : 1.0;
}

export type RewardParticipant = { reputation: number };
export type RewardShare = { reputation: number; tier: Tier; weight: number; reward: number };
export type RewardDistribution = { rewards: RewardShare[]; totalDistributed: number };

/**
 * Distribute a fixed pool P among consensus-aligned participants by tier weight.
 * Reward_i = (m_i / Sum m_j) * P. Guarantees Sum Reward_i = P (pool conservation).
 */
export function distributeReward(
  participants: RewardParticipant[],
  pool: number,
): RewardDistribution {
  if (participants.length === 0) return { rewards: [], totalDistributed: 0 };
  const shares = participants.map((p) => {
    const tier = tierOf(p.reputation);
    return { reputation: p.reputation, tier, weight: tierWeight(tier) };
  });
  const weightSum = shares.reduce((sum, s) => sum + s.weight, 0);
  const rewards: RewardShare[] = shares.map((s) => ({
    ...s,
    reward: (s.weight / weightSum) * pool,
  }));
  const totalDistributed = rewards.reduce((sum, r) => sum + r.reward, 0);
  return { rewards, totalDistributed };
}

/**
 * Appendix §7's ALTERNATIVE reward-weight formula: W_i = log2(R_i / R_avg + epsilon).
 * Exposed for divergence comparison only — NOT used by `distributeReward`.
 * Flagged contradiction "A" in WHITEPAPER_RECONCILIATION.md §6.
 */
export function rewardWeightLog2(
  reputation: number,
  averageReputation: number,
  epsilon = 0.2,
): number {
  const ratio = reputation / (averageReputation || 1) + epsilon;
  return Math.log2(ratio);
}
