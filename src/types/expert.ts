import type { ExpertOnboardingState } from "@/lib/expert-onboarding-tour";
import type { ExpertGuild } from "./guild";

export type ExpertStatus = "pending" | "approved" | "rejected";

/** Validation errors keyed by field name. */
export type FieldErrors = Record<string, string>;

/** Guild application info returned for the application-status page. */
export interface GuildApplicationInfo {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "approved" | "rejected";
  role?: string;
  joinedAt?: string;
  reviewCount?: number;
  approvalCount?: number;
  rejectionCount?: number;
  votingDeadline?: string;
  blockchainSessionCreated?: boolean;
  blockchainSessionTxHash?: string;
}

/** Expert profile — returned by expertApi.getProfile. */
export interface ExpertProfile {
  id: string;
  fullName?: string;
  email?: string;
  walletAddress: string;
  status?: ExpertStatus;
  onboardingState?: ExpertOnboardingState;
  reputation: number;
  totalEarnings?: number;
  endorsementEarnings?: number;
  createdAt?: string;
  bio?: string;
  endorsementCount?: number;
  approvalCount?: number;
  rejectionCount?: number;
  reviewCount?: number;
  showEmail?: boolean;
  guilds: ExpertGuild[];
  recentActivity?: ExpertActivity[];
  pendingTasks?: {
    pendingProposalsCount: number;
    unreviewedApplicationsCount: number;
  };
  /** Present when expert has a pending application to a single guild (legacy). */
  appliedToGuild?: {
    id: string;
    name: string;
    description: string;
  } | null;
  /** Present when expert has applied to multiple guilds. */
  guildApplications?: GuildApplicationInfo[];
  linkedinUrl?: string;
  portfolioUrl?: string;
  currentTitle?: string;
  currentCompany?: string;
  expertiseAreas?: string[];
}

export interface ExpertActivity {
  id: string;
  type: "proposal_vote" | "endorsement" | "earning" | "reputation_gain";
  description: string;
  timestamp: string;
  guildName: string;
  amount?: number;
}

/**
 * A review the expert has already SUBMITTED across any of the three review
 * surfaces — expert-application reviews, candidate-membership reviews, and
 * Schelling proposal votes. Powers the workspace "My Reviews" tab once a
 * reviewer commits; pending assignments stay in the assigned-applications
 * list. `itemType` discriminates which surface the row came from so the
 * client can route deep-links and apply lifecycle-aware filters.
 *
 * - `expert_application` — commit/reveal review on an expert applying to a guild
 * - `guild_application` — single-shot review on a candidate's membership application
 * - `proposal` — Schelling vote on a candidate hiring proposal
 */
export type SubmittedReviewItemType =
  | "expert_application"
  | "guild_application"
  | "proposal";

export interface ExpertSubmittedReview {
  id: string;
  /** Which review surface this row came from. */
  itemType: SubmittedReviewItemType;
  /**
   * The subject's id — an `experts.id` for expert_application,
   * `candidate_guild_applications.id` for guild_application, or
   * `candidate_proposals.id` for proposal. Retained under the legacy
   * `expertApplicationId` name for backwards-compat with the previous
   * single-surface response shape.
   */
  expertApplicationId: string;
  /** Alias for `expertApplicationId`, surface-agnostic. */
  subjectId?: string;
  guildId: string;
  guildName?: string | null;
  candidateName?: string | null;
  candidateEmail?: string | null;
  vote?: string | null;
  normalizedScore?: number | null;
  overallScore?: number | null;
  redFlagDeductions: number;
  commitHash?: string | null;
  onChainCommitTxHash?: string | null;
  createdAt: string;
  reputationChange: number;
  rewardAmount: number;
  slashingTier?: string | null;
  alignmentDistance?: number | null;
  applicationFinalized: boolean;
  applicationFinalizedAt?: string | null;
  applicationOutcome?: string | null;
  applicationLevel?: string | null;
  /**
   * "direct" | "commit" | "reveal" | "finalized" | "tiebreaker" — only set
   * for commit/reveal surfaces (expert_application, proposal). `null` for
   * single-shot guild_application reviews.
   */
  applicationVotingPhase?: string | null;
}

/** Answers for the general section of the expert/guild application form. */
export interface GeneralAnswers {
  learningFromFailure: string;
  decisionUnderUncertainty: string;
  motivationAndConflict: string;
  guildImprovement: string;
}

/** Expertise level option used in the expert application form. */
export interface ExpertiseLevel {
  value: string;
  label: string;
}

/** Expert as listed in guild member lists. */
export interface ExpertMember {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  role: string;
  reputation: number;
  expertise?: string[];
  totalReviews?: number;
  successRate?: number;
  reviewsCompleted?: number;
  joinedAt?: string;
}
