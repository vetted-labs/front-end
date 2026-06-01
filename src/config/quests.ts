/**
 * Front-end constants for the Quests feature. The authoritative quest catalog +
 * reward amounts live in the backend (db/migrations/091_quests.sql, returned by
 * questsApi); these are presentational fallbacks and copy only.
 */

/** Daily streak reward schedule, Day 1..7 (mirrors backend QUEST_CONFIG). */
export const DAILY_STREAK_SCHEDULE = [10, 10, 15, 10, 15, 20, 30];

/** Verbatim widget copy from the VET-112 design. */
export const QUEST_DASHBOARD_TAGLINE = "Complete at least 1 quest to earn your daily reward";
