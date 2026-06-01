/** Types for the Quests feature (VET-111..114). */

export type QuestCategory = "general" | "specific";
export type QuestType = "one_time" | "verifiable" | "referral" | "text_answer" | "rubric";
export type QuestCompletionStatus = "submitted" | "approved" | "rejected" | "completed";

export interface Quest {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: QuestCategory;
  questType: QuestType;
  actionType: string | null;
  actionMeta: Record<string, unknown> | null;
  guildId: string | null;
  rewardAmount: number;
  reputationReward: number;
  requiresVerification: boolean;
  repeatable: boolean;
  sortOrder: number;
  /** This expert's latest completion status for the quest, if any. */
  myStatus: QuestCompletionStatus | null;
  myCompletionId: string | null;
}

export interface QuestStreak {
  currentDay: number;
  claimedToday: boolean;
  canClaim: boolean;
  /** The day claimStreak will actually pay next (1..7), accounting for a missed-day reset; null if already claimed today. */
  nextDay: number | null;
  longestStreak: number;
  /** Day 1..7 reward schedule in VETD. */
  schedule: number[];
}

export interface QuestGuildRef {
  id: string;
  name: string;
  role: string;
}

export interface QuestsResponse {
  general: Quest[];
  specific: Quest[];
  guilds: QuestGuildRef[];
  streak: QuestStreak;
  summary: { completedGeneral: number; totalGeneral: number };
  /** True when the expert is an officer/master and can review submissions. */
  isReviewer: boolean;
}

export interface QuestCompletion {
  id: string;
  questId: string;
  expertId: string;
  status: QuestCompletionStatus;
  submission: Record<string, unknown> | null;
  screenshotUrl: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  rewarded: boolean;
  rewardAmount: number;
  completedAt: string | null;
  createdAt: string;
}

export interface PendingSubmission extends QuestCompletion {
  questTitle: string;
  questCategory: QuestCategory;
  questReward: number;
  expertName: string;
}

export interface StreakClaimResult {
  day: number;
  reward: number;
  currentDay: number;
  longestStreak: number;
}

export interface QuestReferralItem {
  id: string;
  code?: string;
  referredEmail: string | null;
  referredExpertId: string | null;
  status: string;
  createdAt: string;
  acceptedAt: string | null;
}

export interface QuestReferralSummary {
  code: string;
  status: string;
  referrals: QuestReferralItem[];
}
