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
}

/** Enriched endorsement as returned by getExpertEndorsements — includes nested job/candidate/guild data. */
export interface ActiveEndorsement {
  endorsementId?: string;
  applicationId?: string;
  expertAddress: string;
  expertName?: string;
  amount: string;
  stakeAmount?: string;
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
  data?: EarningsBreakdown;
  summary?: { totalVetd: number; totalUsd?: number };
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

// --- Commit-Reveal ---
export interface CommitRevealPhaseStatus {
  phase: "commit" | "reveal" | "finalized" | "none";
  commitDeadline?: string;
  revealDeadline?: string;
  commitCount?: number;
  revealCount?: number;
}

export interface CommitRevealHash {
  hash: string;
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
