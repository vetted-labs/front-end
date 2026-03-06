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
  /** Populated when aggregating across guilds */
  guildId?: string;
  guildName?: string;
}

/** The current expert's own review data, fetched via my-review endpoints */
export interface MyReviewData {
  vote: string;
  criteriaScores: Record<string, unknown>;
  criteriaJustifications: Record<string, unknown>;
  overallScore: number;
  redFlagDeductions: number;
  feedback?: string;
  createdAt: string;
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
