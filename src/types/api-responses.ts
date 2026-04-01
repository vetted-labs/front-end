/** API response types that don't belong in domain-specific type files. */

// --- Auth ---
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user?: { id: string; email: string; fullName?: string };
  candidate?: { id: string; email: string; fullName?: string };
  company?: { id: string; email: string; name?: string };
}

// --- Notifications ---
export interface Notification {
  id: string;
  expertId: string;
  type: string;
  title: string;
  message: string;
  guildId?: string;
  guildName?: string;
  applicationId?: string;
  applicantType?: "expert" | "candidate";
  link: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationUnreadCount {
  count: number;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
}

// --- Base Notification (shared shape) ---
export interface BaseNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  applicationId?: string;
  link: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
}

// --- Company Notifications ---
export interface CompanyNotification extends BaseNotification {
  companyId: string;
  jobId?: string;
  candidateId?: string;
}

export interface CompanyNotificationsResponse {
  notifications: CompanyNotification[];
  total: number;
}

export interface CompanyNotificationPreferences {
  emailNotifications: boolean;
  newApplications: boolean;
  applicationUpdates: boolean;
  messagesMeetings: boolean;
  jobUpdates: boolean;
  weeklyReports: boolean;
}

// --- Guild Report (visible to recruiter) ---
export interface CandidateGuildReport {
  guildApplication: {
    id: string;
    guildId: string;
    guildName: string;
    status: string;
    reviewCount: number;
    approvalCount: number;
    rejectionCount: number;
    guildApproved: boolean;
    guildApprovedAt: string | null;
    expertiseLevel: string;
    createdAt: string;
  } | null;
  reviews: GuildReportReview[];
}

export interface GuildReportReview {
  id: string;
  vote: "approve" | "reject";
  confidenceLevel: number;
  feedback: string | null;
  criteriaScores: Record<string, number> | null;
  overallScore: number;
  reviewerName: string;
  createdAt: string;
}

// --- Candidate Notifications ---
export interface CandidateNotification extends BaseNotification {
  candidateId: string;
  jobId?: string;
  companyId?: string;
}

export interface CandidateNotificationsResponse {
  notifications: CandidateNotification[];
  total: number;
}

export interface CandidateNotificationPreferences {
  emailNotifications: boolean;
  applicationUpdates: boolean;
  messages: boolean;
  jobRecommendations: boolean;
}

// --- Company Activity ---
export interface CompanyActivityItem {
  id: string;
  companyId: string;
  actionType: string;
  title: string;
  subtitle: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// --- Blockchain / Staking ---
export interface StakeBalance {
  balance: string;
  stakedAmount?: string;
  guildId?: string;
  meetsMinimum?: boolean;
  minimumRequired?: string;
}

export interface GuildStakeInfo {
  guildId: string;
  guildName: string;
  stakedAmount: string;
  stakeTimestamp?: string;
}

export interface UnstakeRequest {
  amount: string;
  requestedAt: string;
  availableAt: string;
  status: string;
}

export interface StakingStats {
  totalStaked: string;
  totalStakers: number;
  averageStake?: string;
}

export interface WalletChallenge {
  message: string;
}

export interface WalletVerification {
  verified: boolean;
}

export interface WalletVerifyResponse {
  verified: boolean;
  token?: string;
}

export interface TokenBalance {
  balance: string;
  formatted?: string;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
}

export interface BlockchainConfig {
  chainId: number;
  rpcUrl: string;
  contracts: Record<string, string>;
}

export interface ReputationScore {
  score: number;
  level?: string;
  rank?: number;
}

export interface PendingRewards {
  total: string;
  rewards: Array<{
    source: string;
    amount: string;
    applicationId?: string;
  }>;
}

export interface RewardPoolBalance {
  balance: string;
}

// --- Endorsements ---
export interface EndorsementStatus {
  hasEndorsed: boolean;
  endorsementAmount?: string;
  endorsedAt?: string;
}

export interface EndorsementInfo {
  expertAddress: string;
  expertName?: string;
  amount: string;
  endorsedAt: string;
}

export interface EndorsementStats {
  totalEndorsements: number;
  totalAmount: string;
  averageAmount?: string;
}

/** Application shape used in the endorsement marketplace components (flat, snake_case). */
export interface EndorsementApplication {
  application_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_headline: string;
  candidate_wallet: string;
  candidate_bio?: string;
  candidate_profile_picture_url?: string;
  job_id: string;
  job_title: string;
  job_description?: string;
  company_id?: string;
  company_name: string;
  company_logo?: string;
  guild_score: number;
  location: string;
  job_type: string;
  salary_min: number;
  salary_max: number;
  salary_currency?: string;
  applied_at: string;
  /** ISO timestamp 24h after applied_at — when blind bidding ends. */
  bidding_deadline?: string;
  current_bid?: string;
  rank?: number;
  status?: string;
  cover_letter?: string;
  screening_answers?: Record<string, string>;
  experience_level?: string;
  job_skills?: string | string[];
  requirements?: string[];
  linkedin?: string;
  github?: string;
  resume_url?: string;
  endorsement_count?: number;
}

/** Enriched endorsement as returned by getExpertEndorsements — includes nested job/candidate/guild data. */
export interface ActiveEndorsement {
  endorsementId?: string;
  applicationId?: string;
  expertAddress: string;
  expertName?: string;
  amount: string;
  /** Always populated after API normalization — prefer this over `amount`. */
  stakeAmount: string;
  endorsedAt: string;
  createdAt?: string;
  notes?: string;
  guildScore?: number;
  job?: {
    id: string;
    title: string;
    companyId?: string;
    companyName?: string;
    companyLogo?: string;
    description?: string;
    location?: string;
    jobType?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    requirements?: string[];
    skills?: string[];
  };
  candidate?: {
    id?: string;
    name: string;
    email?: string;
    headline?: string;
    profilePicture?: string;
    bio?: string;
    walletAddress?: string;
    experienceLevel?: string;
    linkedin?: string;
    github?: string;
    resumeUrl?: string;
  };
  guild?: {
    id?: string;
    name: string;
  };
  application?: {
    id?: string;
    status?: string;
    appliedAt?: string;
    coverLetter?: string;
    screeningAnswers?: Record<string, string>;
  };
  endorsementCount?: number;
  blockchainData?: {
    rank?: number;
    bidAmount?: string;
  };
}

// --- Endorsement Disputes ---
export interface DisputePanelMember {
  id: string;
  expertWallet: string;
  expertName?: string;
  hasVoted: boolean;
  vote?: "uphold" | "dismiss";
}

export interface DisputeDetail {
  id: string;
  status: string;
  reason: string;
  evidence?: string;
  filed_by: string;
  filed_at: string;
  deadline: string;
  candidateName?: string;
  jobTitle?: string;
  guildName?: string;
  hireDate?: string;
  panelMembers: DisputePanelMember[];
  totalPanelSize: number;
  votesSubmitted: number;
  upholdCount: number;
  dismissCount: number;
  isOnPanel?: boolean;
  hasVoted?: boolean;
  myVote?: string;
  resolution?: "upheld" | "dismissed";
  resolvedAt?: string;
}

// --- Expert Earnings / Reputation ---

/** Response shape from expertApi.getEarningsBreakdown — wraps EarningsSummary + paginated items. */
export interface EarningsBreakdownResponse {
  summary?: import("./earnings").EarningsSummary;
  items?: {
    items: import("./earnings").EarningsEntry[];
    pagination: import("./pagination").PaginationInfo;
  };
  data?: {
    summary?: import("./earnings").EarningsSummary;
    items?: {
      items: import("./earnings").EarningsEntry[];
      pagination: import("./pagination").PaginationInfo;
    };
  };
}

export interface EarningsBreakdown {
  entries: Array<{
    id: string;
    type: string;
    amount: number;
    guildName: string;
    description: string;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  summary?: import("./earnings").EarningsSummary;
}

export interface ReputationTimeline {
  entries: Array<{
    id: string;
    reason: string;
    change: number;
    newScore: number;
    guildName: string;
    description: string;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

/** Paginated response shape from expertApi.getReputationTimeline. */
export interface ReputationTimelineResponse {
  items?: import("./reputation").ReputationTimelineEntry[];
  pagination?: import("./pagination").PaginationInfo;
  data?: {
    items?: import("./reputation").ReputationTimelineEntry[];
    pagination?: import("./pagination").PaginationInfo;
  };
}

export interface RewardDetail {
  proposalId: string;
  guildName: string;
  rewardAmount: number;
  alignmentScore: number;
  breakdown: Record<string, number>;
}

// --- Leaderboard ---
export interface LeaderboardEntry {
  rank: number;
  expertId: string;
  expertName?: string;
  fullName?: string;
  walletAddress: string;
  reputation: number;
  reviewCount?: number;
  guildName?: string;
  role?: string;
  guildCount?: number;
  totalEarnings?: number;
  totalReviews: number;
  approvals: number;
  rejections: number;
}

export interface LeaderboardEntryV2 {
  expertId: string;
  fullName: string;
  walletAddress: string;
  role: string;
  guildCount: number;
  reputation: number;
  reputationDelta: number;
  totalEarnings: number;
  earningsDelta: number;
  totalReviews: number;
  approvals: number;
  rejections: number;
  consensusRate: number;
  endorsementCount: number;
  totalBidAmount: string;
  endorsementSuccessRate: number | null;
  activeEndorsementCount: number;
  stakedAmount: string;
  streak: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntryV2[];
  currentUser: LeaderboardEntryV2 | null;
}

// --- Commit-Reveal ---
export interface CommitRevealPhaseStatus {
  phase: "commit" | "finalized" | "none";
  commitDeadline?: string;
  commitCount?: number;
  totalActive?: number;
  blockchainSessionId?: string;
  blockchainSessionCreated?: boolean;
}

export interface CommitRevealHash {
  hash: string;
}

// --- Expert Application Commit-Reveal ---
export interface ExpertCRPhaseStatus {
  applicationId: string;
  votingPhase: "direct" | "commit" | "finalized";
  commitDeadline?: string;
  votingDeadline?: string;
  commitTimeRemaining?: number;
  totalAssigned: number;
  totalCommitments: number;
  reassignmentRound?: number;
  blockchainSessionId?: string;
  blockchainSessionCreated?: boolean;
  blockchainSessionTxHash?: string;
}

// --- Guild Application Eligibility ---
export interface VoteEligibility {
  eligible: boolean;
  reason?: string;
}

// --- Company Profile ---
export interface CompanyProfile {
  id: string;
  name: string;
  company_name?: string;
  email: string;
  phone?: string;
  description?: string;
  industry?: string;
  website?: string;
  size?: string;
  logoUrl?: string;
  location?: string;
  address?: string;
  verified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  walletAddress?: string;
}

// --- Guild Membership ---
export interface GuildMembershipCheck {
  isMember: boolean;
  status?: "approved" | "pending" | "not_member";
  role?: string;
  joinedAt?: string;
}

// --- Guild Averages ---
export interface GuildAverages {
  averageReputation: number;
  averageReviews: number;
  averageSuccessRate: number;
}

// --- Guild Master ---
export interface GuildMaster {
  expertId: string;
  expertName: string;
  walletAddress: string;
}
