import type { ExpertGuild } from "./guild";

export type ExpertStatus = "pending" | "approved" | "rejected";

/** Validation errors keyed by field name. */
export type FieldErrors = Record<string, string>;

/** Guild application info returned for pending experts. */
export interface PendingGuildInfo {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "approved";
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
  guildApplications?: PendingGuildInfo[];
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
