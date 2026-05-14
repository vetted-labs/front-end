// e2e/real-flow/oracle/endorsement.ts
//
// Endorsement outcome matrix — Technical Appendix §4 "Endorsement Outcome
// Matrix" + "Critical Slashing Events" + "Slashing Severity Scale".

const EXPERT_POOL_PCT = 7; // 7% of final compensation (Appendix §4)
const ENDORSER_COUNT = 3; // top-3 endorsers
const NOT_HIRED_SLASH_PCT = 10; // 10% of stake on a not-hired outcome
/** Performance-slash severities the appendix defines — applied to the LOCKED half. */
export const PERFORMANCE_SEVERITIES = [0, 25, 50, 100] as const;
export type PerformanceSeverity = (typeof PERFORMANCE_SEVERITIES)[number];

export type EndorsementPayout = {
  expertPool: number; // 7% of final compensation
  perEndorser: number; // pool / 3
  immediate: number; // 50% of perEndorser, paid at hire
  locked: number; // 50% of perEndorser, locked 90 days
};

/** Payout breakdown for a hire at `finalCompensation` (Appendix Single Endorsement Case). */
export function endorsementPayout(finalCompensation: number): EndorsementPayout {
  const expertPool = (finalCompensation * EXPERT_POOL_PCT) / 100;
  const perEndorser = expertPool / ENDORSER_COUNT;
  return {
    expertPool,
    perEndorser,
    immediate: perEndorser / 2,
    locked: perEndorser / 2,
  };
}

/** Not-hired outcome: 10% of the endorser's staked amount is slashed. */
export function notHiredSlash(stake: number): { slashed: number; returned: number } {
  const slashed = (stake * NOT_HIRED_SLASH_PCT) / 100;
  return { slashed, returned: stake - slashed };
}

/**
 * Performance-based slash on the LOCKED 50% (hired but failed < 90 days).
 * Severity must be one of the appendix's defined values: 0 / 25 / 50 / 100.
 */
export function performanceSlash(
  lockedHalf: number,
  severity: PerformanceSeverity,
): { slashed: number; lockedReturned: number; immediateUnaffected: true } {
  if (!PERFORMANCE_SEVERITIES.includes(severity)) {
    throw new Error(
      `performanceSlash: severity must be one of ${PERFORMANCE_SEVERITIES.join("/")}, got ${severity}`,
    );
  }
  const slashed = (lockedHalf * severity) / 100;
  return { slashed, lockedReturned: lockedHalf - slashed, immediateUnaffected: true };
}
