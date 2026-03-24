export type ExpertRole = "recruit" | "apprentice" | "craftsman" | "officer" | "master";

/** Public guild listing — returned by guildsApi.getAll / getPublicDetail. */
export interface Guild {
  id: string;
  name: string;
  description: string;
  memberCount?: number;
  expertCount?: number;
  candidateCount?: number;
  totalMembers?: number;
  openPositions?: number;
  totalProposalsReviewed?: number;
  jobCount?: number;
  icon?: string;
  color?: string;
  blockchainGuildId?: string;
}

/** Extended guild detail returned by guildsApi.getPublicDetail — includes members, jobs, stats. */
export interface GuildPublicDetail extends Guild {
  experts?: import("./expert").ExpertMember[];
  candidates?: import("./candidate").CandidateMember[];
  recentJobs?: import("./job").Job[];
  recentActivity?: Array<{ id: string; type: string; actor: string; details: string; timestamp: string }>;
  averageApprovalTime?: string;
  establishedDate?: string;
  createdAt?: string;
  statistics?: { vettedProposals?: number; totalVetdStaked?: number };
  totalVetdStaked?: number;
}

/** Leaderboard entry from guild context — extends the shared LeaderboardEntry. */
export interface GuildLeaderboardEntry {
  rank: number;
  previousRank?: number;
  memberId: string;
  walletAddress?: string;
  fullName: string;
  role: string;
  reputation: number;
  totalReviews?: number;
  successRate?: number;
  contributionScore: number;
  reputationChange?: string;
  trend?: "up" | "down" | "same";
}

/** Guild as seen on an expert's dashboard — includes role & stats within that guild. */
export interface ExpertGuild {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  expertRole: ExpertRole;
  reputation: number;
  totalEarnings: number;
  joinedAt?: string;
  pendingProposals: number;
  pendingApplications?: number;
  ongoingProposals: number;
  closedProposals: number;
}

/** Extended guild detail returned by expertApi.getGuildDetails — includes members, jobs, applications, earnings. */
export interface ExpertGuildDetail extends ExpertGuild {
  totalMembers?: number;
  experts?: import("./expert").ExpertMember[];
  candidates?: import("./candidate").CandidateMember[];
  recentJobs?: import("./job").Job[];
  guildApplications?: import("./review").ExpertMembershipApplication[];
  applications?: import("./application").GuildJobApplication[];
  recentActivity?: Array<{ id: string; type: string; actor: string; target?: string; details: string; timestamp: string }>;
  earnings?: {
    totalPoints?: number;
    totalEndorsementEarnings?: number;
    recentEarnings?: Array<{ id: string; type: "proposal" | "endorsement"; amount: number; description: string; date: string }>;
  };
  statistics?: { vettedProposals?: number; totalVetdStaked?: number; totalEarningsFromEndorsements?: number };
  totalProposalsReviewed?: number;
  averageApprovalTime?: string;
  totalVetdStaked?: number;
  blockchainGuildId?: string;
  candidateCount?: number;
  openPositions?: number;
}

/** Minimal guild record for dropdowns and selection lists. */
export interface GuildRecord {
  id: string;
  name: string;
  blockchainGuildId?: string;
}

/** Lightweight guild option for selector dropdowns. */
export interface GuildOption {
  id: string;
  name: string;
}

/** Guild leaderboard expert — used in guild detail & leaderboard tab. */
export interface LeaderboardExpert {
  id: string;
  name: string;
  role: "recruit" | "apprentice" | "craftsman" | "officer" | "master";
  reputation: number;
  totalReviews: number;
  accuracy: number;
  totalEarnings: number;
  rank: number;
  rankChange?: number;
  reputationChange?: number;
}

/** Guild-level earnings overview shown in the guild detail earnings tab. */
export interface GuildEarningsOverview {
  totalPoints: number;
  totalEndorsementEarnings: number;
  recentEarnings: Array<{
    id: string;
    type: "proposal" | "endorsement";
    amount: number;
    description: string;
    date: string;
  }>;
}

/** Activity entry shown in the guild activity feed. */
export interface GuildActivity {
  id: string;
  type: "proposal_submitted" | "candidate_approved" | "job_posted" | "endorsement_given" | "expert_applied" | "candidate_applied" | "application_reviewed" | "member_approved" | "member_rejected";
  actor: string;
  target?: string;
  timestamp: string;
  details: string;
}

/** Normalized guild detail used inside the expert guild detail view. */
export interface GuildDetailData {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  expertRole: string;
  reputation: number;
  proposals: {
    pending: import("./guildApplication").GuildApplicationSummary[];
    ongoing: import("./guildApplication").GuildApplicationSummary[];
    closed: import("./guildApplication").GuildApplicationSummary[];
  };
  applications: import("./application").GuildJobApplication[];
  guildApplications: import("./review").ExpertMembershipApplication[];
  earnings: GuildEarningsOverview;
  recentActivity: GuildActivity[];
  experts: import("./expert").ExpertMember[];
  candidates: import("./candidate").CandidateMember[];
  recentJobs: import("./job").Job[];
  totalProposalsReviewed: number;
  averageApprovalTime: string;
  candidateCount: number;
  openPositions: number;
  totalVetdStaked?: number;
}

/** Valid tab values for the guild detail view. */
export const GUILD_DETAIL_TABS = ["feed", "membershipApplications", "jobs", "activity", "earnings", "members", "leaderboard"] as const;
export type GuildDetailTab = (typeof GUILD_DETAIL_TABS)[number];
