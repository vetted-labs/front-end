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
  job?: {
    id: string;
    title: string;
    companyName?: string;
    location?: string;
  };
  candidate?: {
    name: string;
    headline?: string;
  };
  guild?: {
    name: string;
  };
  application?: {
    status?: string;
    coverLetter?: string;
  };
  blockchainData?: {
    rank?: number;
    bidAmount?: string;
  };
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
