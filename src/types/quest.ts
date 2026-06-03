/** Types for the Quests feature (VET-111..114, reworked in VET-115). */

export type QuestCategory = "specific" | "bonus";
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

/**
 * Two-milestone allocation progress (VET-115), replacing the old daily-claim streak.
 * 10 completed quests -> 500 VETD allocation; 5 approved shared answers -> +300 VETD bonus.
 * Both are ALLOCATED (not paid) until the expert joins a real Guild.
 */
export interface StreakProgress {
  completedQuestsCount: number;
  approvedSharedAnswersCount: number;
  streak1Required: number;
  streak2Required: number;
  streak1Eligible: boolean;
  streak2Eligible: boolean;
  streak1Vetd: number;
  streak2Vetd: number;
  totalAllocation: number;
}

export interface QuestGuildRef {
  id: string;
  name: string;
  role: string;
}

export interface QuestsResponse {
  specific: Quest[];
  bonus: Quest[];
  guilds: QuestGuildRef[];
  streak: StreakProgress;
  summary: { completedBonus: number; totalBonus: number };
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

export type QuestFeedApprovalStatus = "pending" | "approved" | "rejected";

/**
 * A quest answer shared to the public expert feed (VET-115 part 2). Experts share a
 * completed answer tagged with their expertise field; the Vetted team approves before
 * it becomes public; other experts upvote the best answers.
 */
export interface QuestFeedPost {
  id: string;
  questId: string;
  /** Mirrors backend EXPERTISE_FIELDS (e.g. "Engineering", "Product"). */
  expertiseField: string;
  answerText: string;
  upvoteCount: number;
  hasUpvoted: boolean;
  author: { id: string; name: string | null } | null;
  createdAt: string;
  approvalStatus: QuestFeedApprovalStatus;
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
