export interface SocialLink {
  platform: string;
  label: string;
  url: string;
}

/** Subset of CandidateProfile used for job application flows (resume + social info). */
export type CandidateUserProfile = Pick<CandidateProfile, "resumeUrl" | "resumeFileName" | "bio" | "socialLinks" | "linkedIn" | "github">;

export interface WorkHistoryEntry {
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface CandidateProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  linkedIn?: string;
  github?: string;
  socialLinks?: SocialLink[];
  skills?: string[];
  experienceLevel?: string;
  headline?: string;
  bio?: string;
  walletAddress?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  workHistory?: WorkHistoryEntry[];
}

/** Candidate as listed in guild member lists. */
export interface CandidateMember {
  id: string;
  fullName: string;
  email: string;
  headline?: string;
  experienceLevel?: string;
  reputation: number;
  endorsements?: number;
  joinedAt?: string;
}

/** Aggregated rejection feedback shown to candidates after a guild application is rejected. */
export interface CandidateRejectionFeedback {
  applicationId: string;
  guildName: string;
  outcome: "rejected";
  overallScore: number;
  maxScore: number;
  /** Anonymized per-criterion aggregate scores (averages across reviewers). */
  criteriaAverages: Array<{
    criterion: string;
    averageScore: number;
    maxScore: number;
  }>;
  /** Aggregated text feedback from reviewers (anonymized — no reviewer names). */
  feedbackSummary: string[];
  /** Specific improvement suggestions. */
  improvementAreas: string[];
  /** Whether the candidate can resubmit. */
  canResubmit: boolean;
  /** Number of resubmissions already used. */
  resubmissionCount: number;
  finalizedAt?: string;
}
