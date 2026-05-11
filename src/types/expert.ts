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
 * A review the expert has already SUBMITTED (committed). Lives in
 * `expert_application_reviews` on the backend. Powers the workspace
 * "My Reviews" tab once a reviewer commits — pending assignments stay
 * in the assigned-applications list.
 */
export interface ExpertSubmittedReview {
  id: string;
  expertApplicationId: string;
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
