import type { ApplicationResponses, ReviewSubmitPayload, ReviewSubmitResponse } from "./rubric";

// --- Types used by ReviewGuildApplicationModal ---

/** Application shape consumed by the multi-step review modal. */
export interface ReviewModalApplication {
  id: string;
  fullName: string;
  email: string;
  expertiseLevel?: string;
  applicationResponses?: ApplicationResponses;
  resumeUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  socialLinks?: { platform: string; label: string; url: string }[];
  currentTitle?: string;
  currentCompany?: string;
  yearsOfExperience?: number;
  bio?: string;
  motivation?: string;
  expertiseAreas?: string[];
}

/** Props for the ReviewGuildApplicationModal component. */
export interface ReviewGuildApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ReviewModalApplication | null;
  guildId: string;
  onSubmitReview: (payload: ReviewSubmitPayload) => Promise<ReviewSubmitResponse | void>;
  isReviewing: boolean;
  /** When set, renders a staking input in the final step (used for proposal votes). */
  proposalContext?: { requiredStake: number };
  /** Commit-reveal voting phase for expert applications */
  commitRevealPhase?: "direct" | "commit" | "finalized";
  /** On-chain blockchain session ID for commit-reveal */
  blockchainSessionId?: string;
  /** Whether the on-chain session has been created */
  blockchainSessionCreated?: boolean;
  /** The expert reviewer's ID */
  reviewerId?: string;
  /** Called after a successful review submission (including commit-reveal) to refresh parent data */
  onReviewSuccess?: () => void;
  /** Type of application being reviewed — controls modal title */
  reviewType?: "expert" | "candidate" | "proposal";
}

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
