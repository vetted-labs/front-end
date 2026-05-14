// e2e/real-flow/oracle/slashing.ts
//
// Review slashing — Technical Appendix §4 "Slashing Mechanics". BINARY model:
// aligned -> 0% slash; misaligned -> 25% slash. Reputation deltas from the
// §3 point schedule (+10 aligned vote, -20 against-consensus vote).

export type ReviewSlashInput = {
  aligned: boolean;
  stake: number;
  /** Optional platform fee % applied to the returned stake (appendix shows ~1%). */
  platformFeePercent?: number;
};

export type ReviewSlashResult = {
  slashPercent: 0 | 25;
  slashedAmount: number;
  stakeReturned: number; // gross of platform fee
  platformFee: number;
  stakeReturnedNet: number; // stakeReturned minus platformFee
  reputationDelta: 10 | -20;
  sharesRewardPool: boolean;
};

export function reviewSlash(input: ReviewSlashInput): ReviewSlashResult {
  const slashPercent = input.aligned ? 0 : 25;
  const slashedAmount = (input.stake * slashPercent) / 100;
  const stakeReturned = input.stake - slashedAmount;
  const feePct = input.platformFeePercent ?? 0;
  const platformFee = (stakeReturned * feePct) / 100;
  return {
    slashPercent,
    slashedAmount,
    stakeReturned,
    platformFee,
    stakeReturnedNet: stakeReturned - platformFee,
    reputationDelta: input.aligned ? 10 : -20,
    sharesRewardPool: input.aligned,
  };
}
