import type { ApplicationResponses } from "./rubric";

/** Expert applying to join a guild as a member */
export interface ExpertMembershipApplication {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  linkedinUrl: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  expertiseLevel: string;
  yearsOfExperience: number;
  currentTitle: string;
  currentCompany: string;
  bio: string;
  motivation: string;
  expertiseAreas: string[];
  appliedAt: string;
  reviewCount: number;
  approvalCount: number;
  rejectionCount: number;
  applicationResponses?: ApplicationResponses;
  expertHasReviewed?: boolean;
  /** IQR finalization fields */
  votingDeadline?: string;
  consensusScore?: number;
  finalized?: boolean;
  finalizedAt?: string;
  outcome?: string;
  /** Consensus failure / tiebreaker fields */
  consensus_failed?: boolean;
  tiebreaker_required?: boolean;
  /** On-chain vetting session fields */
  votingPhase?: "direct" | "commit" | "finalized";
  commitDeadline?: string;
  blockchainSessionId?: string;
  blockchainSessionCreated?: boolean;
  blockchainSessionTxHash?: string;
  /** Populated when aggregating across guilds */
  guildId?: string;
  guildName?: string;
}

/** Finalization results for an expert application */
export interface ExpertApplicationFinalization {
  outcome: string;
  consensusScore: number;
  finalizedAt: string;
  totalRewards: number;
  voteCount: number;
  votes: Array<{
    reviewerId: string;
    reviewerName: string;
    score: number;
    alignmentDistance: number;
    reputationChange: number;
    rewardAmount: number;
    slashPercent: number;
    slashingTier: string;
    cluster?: "majority" | "minority" | "neutral";
    vote: string;
    createdAt: string;
  }>;
  iqr: {
    median: number;
    q1: number;
    q3: number;
    iqr: number;
    consensusScore: number;
    includedScores: number[];
    excludedScores: number[];
  } | null;
}

/** The current expert's own review data, fetched via my-review endpoints */
export interface MyReviewData {
  vote: string | null;
  criteriaScores: Record<string, unknown> | null;
  criteriaJustifications: Record<string, unknown> | null;
  overallScore: number | null;
  redFlagDeductions: number;
  feedback?: string;
  createdAt: string;
  revealed?: boolean;
  committedAt?: string;
  commitHash?: string;
  onChainCommitTxHash?: string;
}

/** Candidate applying to join a guild */
export interface CandidateGuildApplication {
  id: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
  expertiseLevel: string;
  applicationResponses: Record<string, unknown>;
  resumeUrl?: string | null;
  submittedAt: string;
  reviewCount: number;
  approvalCount: number;
  rejectionCount: number;
  jobTitle: string | null;
  jobId: string | null;
  expertHasReviewed: boolean;
  /** Extended fields used for review mapping */
  linkedinUrl?: string;
  currentTitle?: string;
  currentCompany?: string;
  bio?: string;
  motivation?: string;
  expertiseAreas?: string[];
  yearsOfExperience?: number;
  requiredStake?: number;
  /** Populated when aggregating across guilds */
  guildId?: string;
  guildName?: string;
}
