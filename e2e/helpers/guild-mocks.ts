import { Page } from "@playwright/test";
import type { GovernanceProposalDetail } from "@/types/governance";

// ---------------------------------------------------------------------------
// Shared IDs
// ---------------------------------------------------------------------------

export const ENGINEERING_GUILD_ID = "e2e-guild-engineering-001";
export const DESIGN_GUILD_ID = "e2e-guild-design-002";
export const APPLICATION_ID = "e2e-application-001";
export const FINALIZED_APPLICATION_ID = "e2e-application-002";
export const CANDIDATE_ID = "e2e-candidate-001";
export const JOB_ID = "e2e-job-001";

// ---------------------------------------------------------------------------
// Local shape interfaces
//
// The mock data predates some strict @/types interfaces (ExpertProfile.guilds
// is ExpertGuild[] which requires many fields; GuildPublicDetail.experts is
// ExpertMember[] which requires email/walletAddress; GuildApplication
// .achievements is string[] but the mock uses objects).  Rather than fight
// those mismatches, we define local interfaces that exactly match the
// wire-format the specs expect.  All interfaces carry an index signature so
// they remain assignable to Record<string, unknown> (required by the
// setupVoting* helper params).
// ---------------------------------------------------------------------------

export interface MockExpertProfile {
  id: string;
  walletAddress: string;
  fullName: string;
  status: string;
  reputation: number;
  reviewCount: number;
  consensusRate: number;
  guilds: Array<{ id: string; name: string; role: string }>;
  [key: string]: unknown;
}

export interface MockGuild {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  memberCount: number;
  expertCount: number;
  candidateCount: number;
  totalMembers: number;
  experts: Array<{ id: string; fullName: string; role: string; reputation: number }>;
  candidates: unknown[];
  recentJobs: unknown[];
  guildApplications: unknown[];
  applications: unknown[];
  recentActivity: unknown[];
  openPositions: number;
  totalProposalsReviewed: number;
  averageApprovalTime: string;
  totalVetdStaked: number;
  statistics: {
    vettedProposals: number;
    totalVetdStaked: number;
    totalEarningsFromEndorsements: number;
  };
  expertRole: string;
  reputation: number;
  earnings: {
    totalPoints: number;
    totalEndorsementEarnings: number;
    recentEarnings: unknown[];
  };
  [key: string]: unknown;
}

/** Guild application as returned by proposals API (snake_case) */
export interface MockApplication {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  guild_id: string;
  guild_name: string;
  status: string;
  finalized: boolean;
  outcome: string | null;
  consensus_score: number | null;
  vote_count: number;
  votes_for_count: number;
  votes_against_count: number;
  assigned_reviewer_count: number;
  required_stake: number;
  voting_deadline: string;
  voting_phase: string;
  created_at: string;
  updated_at: string;
  is_assigned_reviewer: boolean;
  has_voted: boolean;
  my_vote_score: number | null;
  years_of_experience: number;
  skills_summary: string;
  experience_summary: string;
  motivation_statement: string;
  proposal_text: string;
  achievements: Array<{ year: number; title: string }>;
  [key: string]: unknown;
}

export interface MockCandidateProfile {
  id: string;
  fullName: string;
  email: string;
  headline: string;
  bio: string;
  yearsOfExperience: number;
  linkedIn: string;
  github: string;
  resumeUrl: string;
  resumeFileName: string;
  socialLinks: Array<{ platform: string; label: string; url: string }>;
  [key: string]: unknown;
}

export interface MockVoteHistoryItem {
  id: string;
  expert_id: string;
  expert_name: string;
  score: number;
  alignment_distance: number;
  reputation_change: number;
  reward_amount: number;
  comment: string;
  created_at: string;
  [key: string]: unknown;
}

interface MockReputationTimelineEntry {
  id: string;
  change_amount: number;
  reason: string;
  description: string;
  guild_name: string;
  candidate_name: string;
  outcome: string;
  your_vote: number;
  consensus: number;
  distance: number;
  reward: number;
  slash_percent?: number;
  vote_score?: number;
  alignment_distance?: number;
  consensus_score?: number;
  reward_amount?: number;
  created_at: string;
}

export interface MockReputationTimeline {
  timeline?: MockReputationTimelineEntry[];
  items?: MockReputationTimelineEntry[];
  total: number;
  page: number;
  limit: number;
  [key: string]: unknown;
}

export interface MockEarningsBreakdown {
  summary: {
    totalVetd: number;
    votingTotal: number;
    endorsementTotal: number;
    byGuild: Array<{ guildId: string; guildName: string; total: number }>;
  };
  entries: Array<{
    id: string;
    type: string;
    amount: number;
    guild_name: string;
    candidate_name: string;
    created_at: string;
  }>;
  total: number;
  page: number;
  limit: number;
  [key: string]: unknown;
}

export interface MockGuildAppTemplate {
  guildId: string;
  guildName: string;
  description: string;
  generalQuestions: Array<{ id: string; title: string; required: boolean; type: string }>;
  domainQuestions: {
    entry: { level: string; topics: Array<{ id: string; title: string; description: string }> };
    experienced: { level: string; topics: Array<{ id: string; title: string; description: string }> };
    expert: { level: string; topics: Array<{ id: string; title: string; description: string }> };
  };
  levels: Array<{ id: string; label: string; description: string }>;
  requiredLevel: string | null;
  noAiDeclarationText: string;
  requiredSocialLinks: string[];
  [key: string]: unknown;
}

export interface MockStakingStatus {
  meetsMinimum: boolean;
  stakedAmount: string;
  minimumRequired: string;
  [key: string]: unknown;
}

export interface MockCommitRevealStatus {
  phase: "direct" | "commit" | "reveal" | "finalized";
  commitDeadline?: string;
  revealDeadline?: string;
  commitCount?: number;
  revealCount?: number;
  totalExpected?: number;
  userCommitted?: boolean;
  userRevealed?: boolean;
  [key: string]: unknown;
}

export interface MockGuildApplicationSummary {
  id: string;
  guildId: string;
  guildName: string;
  guild: { id: string; name: string };
  status: string;
  jobTitle: string | null;
  reviewCount: number;
  approvalCount: number;
  submittedAt: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface MockJob {
  id: string;
  title: string;
  company: string;
  screeningQuestions: string[];
  experienceLevel: string;
  [key: string]: unknown;
}

export interface MockEndorsementHistoryEntry {
  id: string;
  applicationId: string;
  candidateName: string;
  companyName: string;
  guildName: string;
  stakeAmount: number;
  status: string;
  outcome: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface MockDisputeDetail {
  id: string;
  status: string;
  reason: string;
  evidence: string;
  filed_by: string;
  filed_at: string;
  deadline: string;
  candidateName: string;
  jobTitle: string;
  guildName: string;
  panelMembers: Array<{
    id: string;
    expertName: string;
    walletAddress: string;
    vote: string | null;
    votedAt: string | null;
  }>;
  totalPanelSize: number;
  votesSubmitted: number;
  upholdCount: number;
  dismissCount: number;
  isOnPanel: boolean;
  hasVoted: boolean;
  resolution?: string;
  resolvedAt?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Expert profile factory
// ---------------------------------------------------------------------------

const baseExpertProfile: MockExpertProfile = {
  id: "mock-expert-id-001",
  walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
  fullName: "E2E Expert",
  status: "approved",
  reputation: 350,
  reviewCount: 24,
  consensusRate: 88,
  guilds: [{ id: ENGINEERING_GUILD_ID, name: "Engineering", role: "reviewer" }],
};

export function createMockExpertProfile(
  overrides: Partial<MockExpertProfile> = {},
): MockExpertProfile {
  return { ...baseExpertProfile, ...overrides };
}

export const MOCK_EXPERT_PROFILE = createMockExpertProfile();

// ---------------------------------------------------------------------------
// Guild factory
// ---------------------------------------------------------------------------

const baseGuild: MockGuild = {
  id: ENGINEERING_GUILD_ID,
  name: "Engineering",
  description: "Software engineers, data scientists, and all technical builders",
  icon: "code",
  color: "#F97316",
  memberCount: 12,
  expertCount: 8,
  candidateCount: 4,
  totalMembers: 12,
  experts: [
    {
      id: MOCK_EXPERT_PROFILE.id,
      fullName: MOCK_EXPERT_PROFILE.fullName,
      role: "reviewer",
      reputation: 350,
    },
  ],
  candidates: [],
  recentJobs: [],
  guildApplications: [],
  applications: [],
  recentActivity: [],
  openPositions: 3,
  totalProposalsReviewed: 18,
  averageApprovalTime: "3 days",
  totalVetdStaked: 500,
  statistics: {
    vettedProposals: 18,
    totalVetdStaked: 500,
    totalEarningsFromEndorsements: 120,
  },
  expertRole: "reviewer",
  reputation: 350,
  earnings: {
    totalPoints: 350,
    totalEndorsementEarnings: 50,
    recentEarnings: [],
  },
};

export function createMockGuild(overrides: Partial<MockGuild> = {}): MockGuild {
  return { ...baseGuild, ...overrides };
}

export const MOCK_GUILD = createMockGuild();

export const MOCK_DESIGN_GUILD = createMockGuild({
  id: DESIGN_GUILD_ID,
  name: "Design",
  description: "UI/UX designers, brand designers, and creative professionals",
  icon: "palette",
  color: "#8B5CF6",
});

// ---------------------------------------------------------------------------
// Application (guild proposal) factory
// ---------------------------------------------------------------------------

const baseApplication: MockApplication = {
  id: APPLICATION_ID,
  candidate_id: CANDIDATE_ID,
  candidate_name: "Jane Doe",
  candidate_email: "jane@example.com",
  guild_id: ENGINEERING_GUILD_ID,
  guild_name: "Engineering",
  status: "voting",
  finalized: false,
  outcome: null,
  consensus_score: null,
  vote_count: 1,
  votes_for_count: 1,
  votes_against_count: 0,
  assigned_reviewer_count: 3,
  required_stake: 44,
  voting_deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
  voting_phase: "direct",
  created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
  is_assigned_reviewer: true,
  has_voted: false,
  my_vote_score: null,
  years_of_experience: 5,
  skills_summary: "React, TypeScript, Node.js, PostgreSQL",
  experience_summary: "5 years of full-stack development",
  motivation_statement: "I want to contribute to the engineering guild.",
  proposal_text: "I have extensive experience in building scalable web applications.",
  achievements: [{ year: 2024, title: "Led migration to microservices architecture" }],
};

export function createMockApplication(
  overrides: Partial<MockApplication> = {},
): MockApplication {
  return { ...baseApplication, ...overrides };
}

export const MOCK_APPLICATION_ACTIVE = createMockApplication();

export const MOCK_APPLICATION_FINALIZED = createMockApplication({
  id: FINALIZED_APPLICATION_ID,
  candidate_name: "Alex Smith",
  candidate_email: "alex@example.com",
  status: "approved",
  finalized: true,
  outcome: "approved",
  consensus_score: 78.5,
  vote_count: 3,
  votes_for_count: 3,
  votes_against_count: 0,
  is_assigned_reviewer: true,
  has_voted: true,
  my_vote_score: 82,
  alignment_distance: 3.5,
  my_reputation_change: 5,
  my_reward_amount: 12.5,
});

export const MOCK_APPLICATION_VOTED = createMockApplication({
  has_voted: true,
  my_vote_score: 75,
});

// ---------------------------------------------------------------------------
// Candidate profile factory
// ---------------------------------------------------------------------------

const baseCandidateProfile: MockCandidateProfile = {
  id: CANDIDATE_ID,
  fullName: "Jane Doe",
  email: "jane@example.com",
  headline: "Senior Full-Stack Engineer",
  bio: "Passionate about building great software with modern technologies.",
  yearsOfExperience: 5,
  linkedIn: "https://linkedin.com/in/janedoe",
  github: "https://github.com/janedoe",
  resumeUrl: "/uploads/resume-jane.pdf",
  resumeFileName: "jane-doe-resume.pdf",
  socialLinks: [
    {
      platform: "linkedin",
      label: "LinkedIn",
      url: "https://linkedin.com/in/janedoe",
    },
    { platform: "github", label: "GitHub", url: "https://github.com/janedoe" },
  ],
};

export function createMockCandidateProfile(
  overrides: Partial<MockCandidateProfile> = {},
): MockCandidateProfile {
  return { ...baseCandidateProfile, ...overrides };
}

export const MOCK_CANDIDATE_PROFILE = createMockCandidateProfile();

// ---------------------------------------------------------------------------
// Vote history factory
// ---------------------------------------------------------------------------

const baseVoteHistoryItem: MockVoteHistoryItem = {
  id: "vote-001",
  expert_id: MOCK_EXPERT_PROFILE.id,
  expert_name: "E2E Expert",
  score: 82,
  alignment_distance: 3.5,
  reputation_change: 5,
  reward_amount: 12.5,
  comment: "Strong technical background, excellent communication skills.",
  created_at: "2026-02-20T10:00:00Z",
};

export function createMockVoteHistoryItem(
  overrides: Partial<MockVoteHistoryItem> = {},
): MockVoteHistoryItem {
  return { ...baseVoteHistoryItem, ...overrides };
}

export const MOCK_VOTE_HISTORY: MockVoteHistoryItem[] = [
  createMockVoteHistoryItem(),
  createMockVoteHistoryItem({
    id: "vote-002",
    expert_id: "expert-002",
    expert_name: "Second Reviewer",
    score: 75,
    alignment_distance: 7.0,
    reputation_change: 3,
    reward_amount: 8.0,
    comment: "Good candidate, meets requirements.",
    created_at: "2026-02-20T12:00:00Z",
  }),
  createMockVoteHistoryItem({
    id: "vote-003",
    expert_id: "expert-003",
    expert_name: "Third Reviewer",
    score: 80,
    alignment_distance: 1.5,
    reputation_change: 8,
    reward_amount: 15.0,
    comment: "Solid experience. Recommend approval.",
    created_at: "2026-02-21T08:00:00Z",
  }),
];

// ---------------------------------------------------------------------------
// Reputation timeline factory
// ---------------------------------------------------------------------------

const baseReputationTimeline: MockReputationTimeline = {
  timeline: [
    {
      id: "rep-001",
      change_amount: 5,
      reason: "aligned",
      description: "Aligned vote on Engineering guild application",
      guild_name: "Engineering",
      candidate_name: "Alex Smith",
      outcome: "approved",
      your_vote: 82,
      consensus: 78.5,
      distance: 3.5,
      reward: 12.5,
      created_at: "2026-02-22T10:00:00Z",
    },
    {
      id: "rep-002",
      change_amount: -3,
      reason: "mild_deviation",
      description: "Mild deviation on Design guild application",
      guild_name: "Design",
      candidate_name: "Bob Wilson",
      outcome: "rejected",
      your_vote: 60,
      consensus: 25.0,
      distance: 35,
      reward: 2.0,
      created_at: "2026-02-20T14:00:00Z",
    },
    {
      id: "rep-003",
      change_amount: 8,
      reason: "aligned",
      description: "Aligned vote on Engineering guild application",
      guild_name: "Engineering",
      candidate_name: "Carol Davis",
      outcome: "approved",
      your_vote: 90,
      consensus: 88.0,
      distance: 2.0,
      reward: 18.0,
      created_at: "2026-02-18T09:00:00Z",
    },
  ],
  total: 3,
  page: 1,
  limit: 15,
};

export function createMockReputationTimeline(
  overrides: Partial<MockReputationTimeline> = {},
): MockReputationTimeline {
  return { ...baseReputationTimeline, ...overrides };
}

export const MOCK_REPUTATION_TIMELINE = createMockReputationTimeline();

// ---------------------------------------------------------------------------
// Earnings breakdown factory
// ---------------------------------------------------------------------------

const baseEarningsBreakdown: MockEarningsBreakdown = {
  summary: {
    totalVetd: 42.5,
    votingTotal: 32.5,
    endorsementTotal: 10.0,
    byGuild: [
      { guildId: ENGINEERING_GUILD_ID, guildName: "Engineering", total: 32.5 },
      { guildId: DESIGN_GUILD_ID, guildName: "Design", total: 10.0 },
    ],
  },
  entries: [
    {
      id: "earn-001",
      type: "voting_reward",
      amount: 12.5,
      guild_name: "Engineering",
      candidate_name: "Alex Smith",
      created_at: "2026-02-22T10:00:00Z",
    },
    {
      id: "earn-002",
      type: "endorsement",
      amount: 10.0,
      guild_name: "Design",
      candidate_name: "Bob Wilson",
      created_at: "2026-02-21T15:00:00Z",
    },
    {
      id: "earn-003",
      type: "voting_reward",
      amount: 20.0,
      guild_name: "Engineering",
      candidate_name: "Carol Davis",
      created_at: "2026-02-18T09:00:00Z",
    },
  ],
  total: 3,
  page: 1,
  limit: 20,
};

export function createMockEarningsBreakdown(
  overrides: Partial<MockEarningsBreakdown> = {},
): MockEarningsBreakdown {
  return { ...baseEarningsBreakdown, ...overrides };
}

export const MOCK_EARNINGS_BREAKDOWN = createMockEarningsBreakdown();

// ---------------------------------------------------------------------------
// Guild application template factory
// ---------------------------------------------------------------------------

const baseGuildAppTemplate: MockGuildAppTemplate = {
  guildId: ENGINEERING_GUILD_ID,
  guildName: "Engineering",
  description: "Application template for the Engineering guild",
  generalQuestions: [
    {
      id: "motivation",
      title: "Why do you want to join this guild?",
      required: true,
      type: "textarea",
    },
    {
      id: "experience",
      title: "Describe your relevant experience",
      required: true,
      type: "textarea",
    },
  ],
  domainQuestions: {
    entry: {
      level: "entry",
      topics: [
        {
          id: "fundamentals",
          title: "Core fundamentals knowledge",
          description:
            "Explain your understanding of core engineering fundamentals",
        },
      ],
    },
    experienced: {
      level: "experienced",
      topics: [
        {
          id: "architecture",
          title: "System design experience",
          description: "Describe a system you designed from scratch",
        },
      ],
    },
    expert: {
      level: "expert",
      topics: [
        {
          id: "leadership",
          title: "Technical leadership",
          description:
            "Share an example of leading a complex engineering initiative",
        },
      ],
    },
  },
  levels: [
    { id: "entry", label: "Entry-Level", description: "0-2 years experience" },
    {
      id: "experienced",
      label: "Experienced",
      description: "3-7 years experience",
    },
    { id: "expert", label: "Expert", description: "8+ years experience" },
  ],
  requiredLevel: null,
  noAiDeclarationText:
    "I confirm that all answers in this application are my own work and not generated by AI.",
  requiredSocialLinks: [],
};

export function createMockGuildAppTemplate(
  overrides: Partial<MockGuildAppTemplate> = {},
): MockGuildAppTemplate {
  return { ...baseGuildAppTemplate, ...overrides };
}

export const MOCK_GUILD_APP_TEMPLATE = createMockGuildAppTemplate();

// ---------------------------------------------------------------------------
// Staking factories
// ---------------------------------------------------------------------------

const baseStakingMet: MockStakingStatus = {
  meetsMinimum: true,
  stakedAmount: "100",
  minimumRequired: "50",
};

export function createMockStaking(overrides: Partial<MockStakingStatus> = {}): MockStakingStatus {
  return { ...baseStakingMet, ...overrides };
}

export const MOCK_STAKING_MET = createMockStaking();
export const MOCK_STAKING_NOT_MET = createMockStaking({
  meetsMinimum: false,
  stakedAmount: "10",
});

// ---------------------------------------------------------------------------
// Commit-reveal phase factories
// ---------------------------------------------------------------------------

export function createMockCommitReveal(
  overrides: Partial<MockCommitRevealStatus> = {},
): MockCommitRevealStatus {
  return { phase: "direct", ...overrides };
}

export const MOCK_CR_DIRECT: MockCommitRevealStatus = createMockCommitReveal({
  phase: "direct" as const,
});

export const MOCK_CR_COMMIT: MockCommitRevealStatus = createMockCommitReveal({
  phase: "commit" as const,
  commitDeadline: new Date(Date.now() + 3 * 86400000).toISOString(),
  revealDeadline: new Date(Date.now() + 6 * 86400000).toISOString(),
  commitCount: 1,
  revealCount: 0,
  totalExpected: 3,
  userCommitted: false,
  userRevealed: false,
});

export const MOCK_CR_REVEAL: MockCommitRevealStatus = createMockCommitReveal({
  phase: "reveal" as const,
  commitDeadline: new Date(Date.now() - 1 * 86400000).toISOString(),
  revealDeadline: new Date(Date.now() + 3 * 86400000).toISOString(),
  commitCount: 3,
  revealCount: 2,
  totalExpected: 3,
  userCommitted: true,
  userRevealed: false,
});

export const MOCK_CR_FINALIZED: MockCommitRevealStatus = createMockCommitReveal({
  phase: "finalized" as const,
  commitDeadline: new Date(Date.now() - 5 * 86400000).toISOString(),
  revealDeadline: new Date(Date.now() - 2 * 86400000).toISOString(),
  commitCount: 3,
  revealCount: 3,
  totalExpected: 3,
  userCommitted: true,
  userRevealed: true,
});

// ---------------------------------------------------------------------------
// Guild application summaries factory (candidate-facing list)
// ---------------------------------------------------------------------------

const baseGuildApplicationSummary: MockGuildApplicationSummary = {
  id: "ga-001",
  guildId: ENGINEERING_GUILD_ID,
  guildName: "Engineering",
  guild: { id: ENGINEERING_GUILD_ID, name: "Engineering" },
  status: "pending",
  jobTitle: "Senior Frontend Engineer",
  reviewCount: 0,
  approvalCount: 0,
  submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
};

export function createMockGuildApplicationSummary(
  overrides: Partial<MockGuildApplicationSummary> = {},
): MockGuildApplicationSummary {
  return { ...baseGuildApplicationSummary, ...overrides };
}

export const MOCK_GUILD_APPLICATION_SUMMARIES: MockGuildApplicationSummary[] = [
  createMockGuildApplicationSummary(),
  createMockGuildApplicationSummary({
    id: "ga-002",
    guildId: DESIGN_GUILD_ID,
    guildName: "Design",
    guild: { id: DESIGN_GUILD_ID, name: "Design" },
    status: "approved",
    jobTitle: "Product Designer",
    reviewCount: 3,
    approvalCount: 2,
    submittedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  }),
  createMockGuildApplicationSummary({
    id: "ga-003",
    guildId: "guild-003",
    guildName: "Data Science",
    guild: { id: "guild-003", name: "Data Science" },
    status: "rejected",
    jobTitle: null,
    reviewCount: 3,
    approvalCount: 0,
    submittedAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 21 * 86400000).toISOString(),
  }),
];

// ---------------------------------------------------------------------------
// Job factory
// ---------------------------------------------------------------------------

const baseJob: MockJob = {
  id: JOB_ID,
  title: "Senior Frontend Engineer",
  company: "Vetted Inc.",
  screeningQuestions: [
    "Why do you want this role?",
    "Describe your React experience.",
  ],
  experienceLevel: "senior",
};

export function createMockJob(overrides: Partial<MockJob> = {}): MockJob {
  return { ...baseJob, ...overrides };
}

export const MOCK_JOB = createMockJob();

// ---------------------------------------------------------------------------
// Slashing application variants
// ---------------------------------------------------------------------------

export const MOCK_APPLICATION_SLASHED = createMockApplication({
  ...MOCK_APPLICATION_FINALIZED,
  id: "e2e-application-slashed-003",
  candidate_name: "Slashed Expert Test",
  outcome: "rejected",
  status: "rejected",
  consensus_score: 35.2,
  my_vote_score: 90,
  alignment_distance: 54.8,
  my_reputation_change: -20,
  my_reward_amount: 0,
  my_slashing_tier: "severe",
  my_slash_percent: 25,
  iqr: {
    median: 35,
    q1: 28,
    q3: 42,
    iqr: 14,
    includedCount: 4,
    excludedCount: 1,
  },
});

export const MOCK_APPLICATION_MILD_SLASH = createMockApplication({
  ...MOCK_APPLICATION_FINALIZED,
  id: "e2e-application-mild-004",
  candidate_name: "Mild Slash Test",
  consensus_score: 72.0,
  my_vote_score: 85,
  alignment_distance: 13.0,
  my_reputation_change: -5,
  my_reward_amount: 3.0,
  my_slashing_tier: "mild",
  my_slash_percent: 5,
});

// ---------------------------------------------------------------------------
// Reputation timeline with slashing entries
// ---------------------------------------------------------------------------

export const MOCK_REPUTATION_TIMELINE_WITH_SLASHING: MockReputationTimeline = {
  items: [
    {
      id: "rep-slash-001",
      change_amount: -20,
      reason: "severe_slash",
      description: "Severe slashing on Engineering guild application",
      guild_name: "Engineering",
      candidate_name: "Slashed Expert Test",
      outcome: "rejected",
      your_vote: 90,
      consensus: 35.2,
      distance: 54.8,
      reward: 0,
      slash_percent: 25,
      vote_score: 90,
      alignment_distance: 54.8,
      consensus_score: 35.2,
      reward_amount: 0,
      created_at: "2026-03-10T10:00:00Z",
    },
    {
      id: "rep-slash-002",
      change_amount: -5,
      reason: "mild_slash",
      description: "Mild slashing on Engineering guild application",
      guild_name: "Engineering",
      candidate_name: "Mild Slash Test",
      outcome: "approved",
      your_vote: 85,
      consensus: 72.0,
      distance: 13.0,
      reward: 3.0,
      slash_percent: 5,
      vote_score: 85,
      alignment_distance: 13.0,
      consensus_score: 72.0,
      reward_amount: 3.0,
      created_at: "2026-03-08T14:00:00Z",
    },
    {
      id: "rep-slash-003",
      change_amount: 8,
      reason: "aligned",
      description: "Aligned vote on Engineering guild application",
      guild_name: "Engineering",
      candidate_name: "Carol Davis",
      outcome: "approved",
      your_vote: 90,
      consensus: 88.0,
      distance: 2.0,
      reward: 18.0,
      slash_percent: 0,
      vote_score: 90,
      alignment_distance: 2.0,
      consensus_score: 88.0,
      reward_amount: 18.0,
      created_at: "2026-03-05T09:00:00Z",
    },
  ],
  total: 3,
  page: 1,
  limit: 15,
};

// ---------------------------------------------------------------------------
// Endorsement history factory
// ---------------------------------------------------------------------------

const baseEndorsementHistoryEntry: MockEndorsementHistoryEntry = {
  id: "endorse-001",
  applicationId: FINALIZED_APPLICATION_ID,
  candidateName: "Alex Smith",
  companyName: "Vetted Inc.",
  guildName: "Engineering",
  stakeAmount: 50,
  status: "finalized",
  outcome: "hired",
  createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
};

export function createMockEndorsementHistoryEntry(
  overrides: Partial<MockEndorsementHistoryEntry> = {},
): MockEndorsementHistoryEntry {
  return { ...baseEndorsementHistoryEntry, ...overrides };
}

export const MOCK_ENDORSEMENT_HISTORY: MockEndorsementHistoryEntry[] = [
  createMockEndorsementHistoryEntry(),
  createMockEndorsementHistoryEntry({
    id: "endorse-002",
    applicationId: "e2e-application-mild-004",
    candidateName: "Mild Slash Test",
    companyName: "Tech Corp",
    stakeAmount: 30,
    outcome: "not_hired",
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  }),
  createMockEndorsementHistoryEntry({
    id: "endorse-003",
    applicationId: "e2e-application-slashed-003",
    candidateName: "Slashed Expert Test",
    companyName: "Design Studio",
    guildName: "Design",
    stakeAmount: 25,
    status: "refunded",
    outcome: "refunded",
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  }),
];

// ---------------------------------------------------------------------------
// Dispute factory
// ---------------------------------------------------------------------------

const baseDisputeDetail: MockDisputeDetail = {
  id: "dispute-001",
  status: "open",
  reason:
    "Incorrect scoring — my application was scored unfairly by reviewers.",
  evidence:
    "I have 8 years of experience in the relevant domain and my references can confirm.",
  filed_by: CANDIDATE_ID,
  filed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
  candidateName: "Jane Doe",
  jobTitle: "Senior Frontend Engineer",
  guildName: "Engineering",
  panelMembers: [
    {
      id: "panelist-001",
      expertName: "Panel Expert One",
      walletAddress: "0xaaa1000000000000000000000000000000000001",
      vote: "uphold",
      votedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: "panelist-002",
      expertName: "Panel Expert Two",
      walletAddress: "0xaaa2000000000000000000000000000000000002",
      vote: null,
      votedAt: null,
    },
    {
      id: "panelist-003",
      expertName: "Panel Expert Three",
      walletAddress: "0xaaa3000000000000000000000000000000000003",
      vote: null,
      votedAt: null,
    },
  ],
  totalPanelSize: 3,
  votesSubmitted: 1,
  upholdCount: 1,
  dismissCount: 0,
  isOnPanel: true,
  hasVoted: false,
};

export function createMockDisputeDetail(
  overrides: Partial<MockDisputeDetail> = {},
): MockDisputeDetail {
  return { ...baseDisputeDetail, ...overrides };
}

export const MOCK_DISPUTE_DETAIL = createMockDisputeDetail();

export const MOCK_DISPUTE_RESOLVED = createMockDisputeDetail({
  id: "dispute-002",
  status: "resolved",
  resolution: "upheld",
  resolvedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  panelMembers: [
    {
      id: "panelist-001",
      expertName: "Panel Expert One",
      walletAddress: "0xaaa1000000000000000000000000000000000001",
      vote: "uphold",
      votedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: "panelist-002",
      expertName: "Panel Expert Two",
      walletAddress: "0xaaa2000000000000000000000000000000000002",
      vote: "uphold",
      votedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: "panelist-003",
      expertName: "Panel Expert Three",
      walletAddress: "0xaaa3000000000000000000000000000000000003",
      vote: "dismiss",
      votedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ],
  votesSubmitted: 3,
  upholdCount: 2,
  dismissCount: 1,
  hasVoted: true,
});

// ---------------------------------------------------------------------------
// Governance proposal factory
// Uses @/types/governance.GovernanceProposalDetail — exact match.
// ---------------------------------------------------------------------------

const baseGovernanceProposal: GovernanceProposalDetail = {
  id: "gov-proposal-001",
  title: "Increase minimum stake requirement for Engineering guild",
  description:
    "This proposal aims to increase the minimum stake from 50 VETD to 75 VETD to improve reviewer quality and reduce low-effort votes.",
  proposal_type: "standard",
  status: "active",
  proposer_wallet: "0x0000000000000000000000000000000000000001",
  guild_id: ENGINEERING_GUILD_ID,
  guild_name: "Engineering",
  voting_deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
  stake_amount: 100,
  votes_for: 8,
  votes_against: 3,
  votes_abstain: 1,
  total_voting_power: 350,
  quorum_required: 0.3,
  voter_count: 0,
  finalized: false,
  created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
};

export function createMockGovernanceProposal(
  overrides: Partial<GovernanceProposalDetail> = {},
): GovernanceProposalDetail {
  return { ...baseGovernanceProposal, ...overrides };
}

export const MOCK_GOVERNANCE_PROPOSAL = createMockGovernanceProposal();

// ===========================================================================
// Setup functions — call BEFORE page.goto()
// ===========================================================================

/**
 * Common mocks shared across all expert pages:
 * - Expert profile
 * - Notifications (empty)
 * - Wallet verification
 */
export async function setupCommonExpertMocks(
  page: Page,
  overrides?: {
    expertProfile?: Record<string, unknown>;
    stakingStatus?: Record<string, unknown>;
  },
) {
  const profile = overrides?.expertProfile ?? MOCK_EXPERT_PROFILE;
  const staking = overrides?.stakingStatus ?? MOCK_STAKING_MET;

  // Expert profile
  await page.route("**/api/experts/profile**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: profile }),
    });
  });

  // Notifications
  await page.route("**/api/experts/*/notifications**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { notifications: [], unreadCount: 0 },
      }),
    });
  });

  // Staking balance
  await page.route("**/api/blockchain/staking/balance/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: staking }),
    });
  });

  // Wallet verification
  await page.route("**/api/blockchain/wallet/verified/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { verified: true } }),
    });
  });

  // Guild stakes
  await page.route("**/api/blockchain/staking/guilds/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

/**
 * Voting queue page mocks (VotingPage.tsx)
 */
export async function setupVotingQueueMocks(
  page: Page,
  options?: {
    applications?: Record<string, unknown>[];
    assignedApplications?: Record<string, unknown>[];
    stakingStatus?: Record<string, unknown>;
  },
) {
  await setupCommonExpertMocks(page, { stakingStatus: options?.stakingStatus });

  const applications = options?.applications ?? [
    MOCK_APPLICATION_ACTIVE,
    MOCK_APPLICATION_FINALIZED,
  ];
  const assigned = options?.assignedApplications ?? [MOCK_APPLICATION_ACTIVE];

  // Guilds list (for guild selector)
  await page.route("**/api/guilds", (route) => {
    if (route.request().url().includes("/guilds/")) return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [MOCK_GUILD] }),
    });
  });

  // Applications by guild
  await page.route("**/api/proposals/guild/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: applications }),
    });
  });

  // Assigned applications
  await page.route("**/api/proposals/assigned/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: assigned }),
    });
  });

  // Governance proposals (sidebar)
  await page.route("**/api/governance/proposals**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

/**
 * Voting detail page mocks — the 6-call cascade from useVotingApplicationData
 */
export async function setupVotingDetailMocks(
  page: Page,
  applicationId: string,
  options?: {
    application?: Record<string, unknown>;
    candidateProfile?: Record<string, unknown>;
    voteHistory?: Record<string, unknown>[];
    crPhase?: Record<string, unknown>;
    stakingStatus?: Record<string, unknown>;
  },
) {
  const app = options?.application ?? MOCK_APPLICATION_ACTIVE;
  const candidate = options?.candidateProfile ?? MOCK_CANDIDATE_PROFILE;
  const crPhase = options?.crPhase ?? MOCK_CR_DIRECT;
  const votes = options?.voteHistory ?? [];

  await setupCommonExpertMocks(page, { stakingStatus: options?.stakingStatus });

  // Commit-reveal status
  await page.route(
    `**/api/proposals/${applicationId}/commit-reveal/status`,
    (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: crPhase }),
      });
    },
  );

  // Application detail
  await page.route(`**/api/proposals/${applicationId}?**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: app }),
    });
  });
  await page.route(`**/api/proposals/${applicationId}`, (route) => {
    if (
      route.request().url().includes("/vote") ||
      route.request().url().includes("/commit")
    ) {
      return route.fallback();
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: app }),
    });
  });

  // Candidate profile
  const candidateId =
    (app as Record<string, unknown>).candidate_id ??
    (app as Record<string, unknown>).candidateId ??
    CANDIDATE_ID;
  await page.route(`**/api/candidates/${candidateId}`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: candidate }),
    });
  });

  // Vote history
  await page.route(`**/api/proposals/${applicationId}/votes`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: votes }),
    });
  });

  // Appeal by application (no existing appeal)
  await page.route(
    `**/api/guilds/appeals/by-application/${applicationId}`,
    (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: null }),
      });
    },
  );

  // Governance proposals (sidebar)
  await page.route("**/api/governance/proposals**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

/**
 * Reputation page mocks
 */
export async function setupReputationMocks(
  page: Page,
  options?: {
    timeline?: Record<string, unknown>;
    expertProfile?: Record<string, unknown>;
  },
) {
  await setupCommonExpertMocks(page, { expertProfile: options?.expertProfile });

  const timeline = options?.timeline ?? MOCK_REPUTATION_TIMELINE;

  await page.route("**/api/experts/reputation/timeline**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: timeline }),
    });
  });

  // Governance proposals (sidebar)
  await page.route("**/api/governance/proposals**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

/**
 * Earnings page mocks
 */
export async function setupEarningsMocks(
  page: Page,
  options?: {
    earnings?: Record<string, unknown>;
    expertProfile?: Record<string, unknown>;
  },
) {
  await setupCommonExpertMocks(page, { expertProfile: options?.expertProfile });

  const earnings = options?.earnings ?? MOCK_EARNINGS_BREAKDOWN;

  await page.route("**/api/experts/earnings/breakdown**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: earnings }),
    });
  });

  // Governance proposals (sidebar)
  await page.route("**/api/governance/proposals**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

/**
 * Guild application form mocks (for candidate applying to a guild)
 */
export async function setupGuildApplicationMocks(
  page: Page,
  options?: {
    guild?: Record<string, unknown>;
    template?: Record<string, unknown>;
    job?: Record<string, unknown> | null;
    candidateProfile?: Record<string, unknown>;
    membershipStatus?: Record<string, unknown>;
  },
) {
  const guild = options?.guild ?? MOCK_GUILD;
  const template = options?.template ?? MOCK_GUILD_APP_TEMPLATE;
  const guildId = (guild as Record<string, unknown>).id as string;

  // Guild public detail
  await page.route(`**/api/guilds/${guildId}/public`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: guild }),
    });
  });
  await page.route(`**/api/guilds/${guildId}`, (route) => {
    if (
      route.request().url().includes("/application") ||
      route.request().url().includes("/membership") ||
      route.request().url().includes("/posts")
    ) {
      return route.fallback();
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: guild }),
    });
  });

  // Application template
  await page.route(
    `**/api/guilds/${guildId}/application-template**`,
    (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: template }),
      });
    },
  );

  // Job data (optional)
  if (options?.job) {
    const jobId = (options.job as Record<string, unknown>).id as string;
    await page.route(`**/api/jobs/${jobId}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: options.job }),
      });
    });
  }

  // Candidate profile
  await page.route("**/api/candidates/*", (route) => {
    if (
      route.request().url().includes("/resume") ||
      route.request().url().includes("/guild-applications")
    ) {
      return route.fallback();
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: options?.candidateProfile ?? MOCK_CANDIDATE_PROFILE,
      }),
    });
  });

  // Membership check
  const membership = options?.membershipStatus ?? null;
  await page.route(`**/api/guilds/${guildId}/membership**`, (route) => {
    if (membership) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: membership }),
      });
    } else {
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Not a member" }),
      });
    }
  });

  // Resume upload
  await page.route("**/api/candidates/*/resume", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { resumeUrl: "/uploads/test-resume.pdf" },
        }),
      });
    } else {
      route.fallback();
    }
  });

  // Guild application submit
  await page.route(`**/api/guilds/${guildId}/apply**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { id: "new-app-001" } }),
    });
  });
  await page.route("**/api/guilds/*/applications", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { id: "new-app-001" } }),
      });
    } else {
      route.fallback();
    }
  });
}

/**
 * Slashing reputation page mocks — reputation timeline with slashing entries
 */
export async function setupSlashingReputationMocks(page: Page): Promise<void> {
  await setupCommonExpertMocks(page);

  await page.route("**/api/experts/reputation/timeline**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: MOCK_REPUTATION_TIMELINE_WITH_SLASHING,
      }),
    });
  });

  // Governance proposals (sidebar)
  await page.route("**/api/governance/proposals**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [MOCK_GOVERNANCE_PROPOSAL] }),
    });
  });
}

/**
 * Endorsement history page mocks
 */
export async function setupEndorsementHistoryMocks(page: Page): Promise<void> {
  await setupCommonExpertMocks(page);

  // Guilds list
  await page.route("**/api/guilds", (route) => {
    if (route.request().url().includes("/guilds/")) return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [MOCK_GUILD, MOCK_DESIGN_GUILD],
      }),
    });
  });

  // Endorsement history
  await page.route("**/api/experts/endorsements**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_ENDORSEMENT_HISTORY }),
    });
  });

  // Blockchain endorsement data
  await page.route("**/api/blockchain/endorsements/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { endorsed: true, stakeAmount: "50" },
      }),
    });
  });

  // Governance proposals (sidebar)
  await page.route("**/api/governance/proposals**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [MOCK_GOVERNANCE_PROPOSAL] }),
    });
  });
}

/**
 * Dispute detail page mocks
 */
export async function setupDisputeDetailMocks(
  page: Page,
  dispute?: Record<string, unknown>,
): Promise<void> {
  await setupCommonExpertMocks(page);

  const disputeData = dispute ?? MOCK_DISPUTE_DETAIL;
  const disputeId = disputeData.id as string;

  // Hire outcome endpoint
  await page.route("**/api/experts/hire-outcome/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: null }),
    });
  });

  // Dispute detail
  await page.route(`**/api/guilds/disputes/${disputeId}**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: disputeData }),
    });
  });

  // Disputes list
  await page.route("**/api/guilds/disputes**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [disputeData] }),
    });
  });
}

/**
 * Dashboard page mocks with elevated vote weight (high reputation profile)
 */
export async function setupDashboardWithVoteWeight(
  page: Page,
  options?: { expertProfile?: Record<string, unknown> },
): Promise<void> {
  const highRepProfile = {
    ...MOCK_EXPERT_PROFILE,
    reputation: 1500,
    ...(options?.expertProfile ?? {}),
  };

  await setupCommonExpertMocks(page, { expertProfile: highRepProfile });

  // Assigned applications
  await page.route("**/api/proposals/assigned/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [
          MOCK_APPLICATION_ACTIVE,
          MOCK_APPLICATION_FINALIZED,
          MOCK_APPLICATION_SLASHED,
        ],
      }),
    });
  });

  // Governance proposals (sidebar + dashboard widget)
  await page.route("**/api/governance/proposals**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [MOCK_GOVERNANCE_PROPOSAL] }),
    });
  });

  // Earnings breakdown
  await page.route("**/api/experts/earnings/breakdown**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_EARNINGS_BREAKDOWN }),
    });
  });

  // Reputation timeline
  await page.route("**/api/experts/reputation/timeline**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: MOCK_REPUTATION_TIMELINE_WITH_SLASHING,
      }),
    });
  });

  // Guilds list
  await page.route("**/api/guilds", (route) => {
    if (route.request().url().includes("/guilds/")) return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [MOCK_GUILD, MOCK_DESIGN_GUILD],
      }),
    });
  });

  // Endorsements
  await page.route("**/api/experts/endorsements**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_ENDORSEMENT_HISTORY }),
    });
  });
}
