import type { ExpertGuild } from "./guild";

export type ExpertStatus = "pending" | "approved" | "rejected";

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
  guilds: ExpertGuild[];
  recentActivity?: ExpertActivity[];
  pendingTasks?: {
    pendingProposalsCount: number;
    unreviewedApplicationsCount: number;
  };
}

export interface ExpertActivity {
  id: string;
  type: "proposal_vote" | "endorsement" | "earning" | "reputation_gain";
  description: string;
  timestamp: string;
  guildName: string;
  amount?: number;
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
