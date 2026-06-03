/**
 * Front-end constants for the Quests feature. The authoritative quest catalog +
 * reward amounts live in the backend (db/migrations/091_quests.sql, returned by
 * questsApi); these are presentational fallbacks and copy only.
 *
 * VET-115: the daily-streak schedule + claim tagline were retired in favour of the
 * two-milestone allocation model (see StreakProgressCard). Expertise field labels for
 * the share-to-feed dropdown mirror backend EXPERTISE_FIELDS
 * (backend/src/shared/constants/business-rules.ts) and are added in part 2.
 */

/**
 * Expertise field options for the share-to-feed dropdown. Mirrors the backend SSOT
 * EXPERTISE_FIELDS in backend/src/shared/constants/business-rules.ts EXACTLY — do not
 * invent labels. Consumed by the feed UI in part 2.
 */
export const EXPERTISE_FIELDS = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "Operations",
  "Finance",
  "HR",
] as const;

export type ExpertiseField = (typeof EXPERTISE_FIELDS)[number];

/**
 * Stable UUID of the Founding Experts Pool (formerly "Testing Guild"). This is a
 * fixed seed value that MUST NOT change — it is mirrored on-chain (keccak256 of
 * this UUID). Every open-registration expert is auto-added to this pool, so it's
 * the candidate cohort the batch-1 founder-designation admin draws from.
 * Source: backend guild-templates/founding-experts-pool.ts.
 */
export const FOUNDING_EXPERTS_POOL_UUID = "a1000000-0000-0000-0000-000000000001";
