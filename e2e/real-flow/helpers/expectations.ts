// e2e/real-flow/helpers/expectations.ts
//
// Shared expectation tables for Suite A (commit-reveal) scenarios. Keep this
// file dependency-free so it can be imported from both helpers and specs
// without dragging in playwright/viem types.

/**
 * Final outcome of a vetting session as surfaced by the BE / UI.
 */
export const REVIEW_OUTCOMES = {
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type ReviewOutcome =
  (typeof REVIEW_OUTCOMES)[keyof typeof REVIEW_OUTCOMES];

/**
 * Numeric values mirror `IVettingManager.SessionPhase`
 * (smart-contracts/src/interfaces/IVettingManager.sol:19):
 *
 *   enum SessionPhase { None, Commit, Reveal, Finalized, Expired }
 *
 * `None` (0) is intentionally omitted — tests never assert against it.
 */
export const SESSION_PHASE = {
  COMMIT: 1,
  REVEAL: 2,
  FINALIZED: 3,
  EXPIRED: 4,
} as const;

export type SessionPhase = (typeof SESSION_PHASE)[keyof typeof SESSION_PHASE];
