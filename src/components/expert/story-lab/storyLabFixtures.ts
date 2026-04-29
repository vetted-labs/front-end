import {
  PRACTICE_GENERAL_TEMPLATE,
  PRACTICE_LEVEL_TEMPLATE,
  PRACTICE_REVIEW_APPLICATION,
} from "@/components/expert/onboarding/practiceReviewData";
import type {
  EarningsEntry,
  EarningsSummary,
  EndorsementApplication,
  ExpertGuild,
  ExpertMembershipApplication,
  ExpertProfile,
  GovernanceProposalDetail,
  GuildDetailData,
  GuildRecord,
  GuildStakeInfo,
  Notification,
  PaginationInfo,
  ReputationTimelineEntry,
} from "@/types";

const STORY_LAB_TIMESTAMPS = {
  expertJoined: "2026-03-15T12:00:00.000Z",
  reviewApplied: "2026-04-27T12:00:00.000Z",
  reviewCommitDeadline: "2026-05-02T12:00:00.000Z",
  voteResolvedAt: "2026-04-29T12:00:00.000Z",
  notificationResult: "2026-04-29T12:00:00.000Z",
  notificationReward: "2026-04-29T11:55:00.000Z",
  earningsPosted: "2026-04-29T11:50:00.000Z",
  reputationPosted: "2026-04-29T11:52:00.000Z",
  endorsementApplied: "2026-04-29T09:00:00.000Z",
  endorsementDeadline: "2026-04-30T08:00:00.000Z",
  governanceCreated: "2026-04-28T12:00:00.000Z",
  governanceDeadline: "2026-05-03T12:00:00.000Z",
} as const;

export const STORY_LAB_GUILD: GuildRecord = {
  id: "story-lab-engineering-guild",
  name: "Engineering",
};

export const STORY_LAB_REVIEW_APPLICATION_ID = "story-lab-review-maya-chen";
export const STORY_LAB_ENDORSEMENT_APPLICATION_ID = "story-lab-endorsement-riley-park";
export const STORY_LAB_GOVERNANCE_PROPOSAL_ID = "story-lab-governance-review-quorum";
export const STORY_LAB_NOTIFICATION_RESULT_ID = "story-lab-notification-review-result";
export const STORY_LAB_NOTIFICATION_REWARD_ID = "story-lab-notification-reward";

export const STORY_LAB_VOTE_OUTCOME = {
  applicationId: STORY_LAB_REVIEW_APPLICATION_ID,
  candidateName: "Maya Chen",
  stake: 100,
  reward: 139,
  reputationDelta: 12,
  weightMultiplier: 1.4,
  voteResolvedAt: STORY_LAB_TIMESTAMPS.voteResolvedAt,
} as const;

export const STORY_LAB_EXPERT_GUILD: ExpertGuild = {
  id: STORY_LAB_GUILD.id,
  name: STORY_LAB_GUILD.name,
  description:
    "Software engineers, data scientists, and technical builders who review engineering applications.",
  memberCount: 128,
  expertRole: "craftsman",
  reputation: 42 + STORY_LAB_VOTE_OUTCOME.reputationDelta,
  totalEarnings: STORY_LAB_VOTE_OUTCOME.reward,
  joinedAt: STORY_LAB_TIMESTAMPS.expertJoined,
  pendingProposals: 1,
  pendingApplications: 0,
  ongoingProposals: 2,
  closedProposals: 18,
};

export const STORY_LAB_REVIEW_APPLICATION: ExpertMembershipApplication = {
  ...PRACTICE_REVIEW_APPLICATION,
  id: STORY_LAB_REVIEW_APPLICATION_ID,
  walletAddress: "0x0000000000000000000000000000000000000420",
  linkedinUrl: PRACTICE_REVIEW_APPLICATION.linkedinUrl ?? "",
  portfolioUrl: PRACTICE_REVIEW_APPLICATION.portfolioUrl,
  resumeUrl: PRACTICE_REVIEW_APPLICATION.resumeUrl,
  expertiseLevel: PRACTICE_REVIEW_APPLICATION.expertiseLevel ?? "senior",
  yearsOfExperience: PRACTICE_REVIEW_APPLICATION.yearsOfExperience ?? 7,
  currentTitle: PRACTICE_REVIEW_APPLICATION.currentTitle ?? "Senior Full-Stack Engineer",
  currentCompany: PRACTICE_REVIEW_APPLICATION.currentCompany ?? "Northstar Labs",
  bio: PRACTICE_REVIEW_APPLICATION.bio ?? "",
  motivation: PRACTICE_REVIEW_APPLICATION.motivation ?? "",
  expertiseAreas: PRACTICE_REVIEW_APPLICATION.expertiseAreas ?? ["TypeScript", "React"],
  appliedAt: STORY_LAB_TIMESTAMPS.reviewApplied,
  reviewCount: 1,
  approvalCount: 1,
  rejectionCount: 0,
  expertHasReviewed: false,
  votingPhase: "commit",
  commitDeadline: STORY_LAB_TIMESTAMPS.reviewCommitDeadline,
  blockchainSessionCreated: true,
  blockchainSessionId:
    "0x0000000000000000000000000000000000000000000000000000000000000420",
  guildId: STORY_LAB_GUILD.id,
  guildName: STORY_LAB_GUILD.name,
};

export const STORY_LAB_GENERAL_TEMPLATE = PRACTICE_GENERAL_TEMPLATE;
export const STORY_LAB_LEVEL_TEMPLATE = PRACTICE_LEVEL_TEMPLATE;

export function buildStoryLabReviewApplication(guild?: GuildRecord): ExpertMembershipApplication {
  return {
    ...STORY_LAB_REVIEW_APPLICATION,
    guildId: guild?.id ?? STORY_LAB_GUILD.id,
    guildName: guild?.name ?? STORY_LAB_GUILD.name,
  };
}

export function buildStoryLabGuildDetail(): GuildDetailData {
  return {
    id: STORY_LAB_EXPERT_GUILD.id,
    name: STORY_LAB_EXPERT_GUILD.name,
    description: STORY_LAB_EXPERT_GUILD.description,
    memberCount: STORY_LAB_EXPERT_GUILD.memberCount,
    expertRole: STORY_LAB_EXPERT_GUILD.expertRole,
    reputation: STORY_LAB_EXPERT_GUILD.reputation,
    proposals: { pending: [], ongoing: [], closed: [] },
    applications: [],
    guildApplications: [buildStoryLabReviewApplication(STORY_LAB_GUILD)],
    earnings: {
      totalPoints: STORY_LAB_EXPERT_GUILD.reputation,
      totalEndorsementEarnings: STORY_LAB_EXPERT_GUILD.totalEarnings,
      recentEarnings: [],
    },
    recentActivity: [
      {
        id: "story-lab-activity-maya-review",
        type: "application_submitted",
        actor: "Maya Chen",
        details: "submitted a senior engineering guild application for story review",
        timestamp: STORY_LAB_TIMESTAMPS.reviewApplied,
      },
    ],
    experts: [
      {
        id: "story-lab-expert",
        fullName: "You",
        email: "story-expert@example.com",
        walletAddress: "0x0000000000000000000000000000000000000E7E",
        role: STORY_LAB_EXPERT_GUILD.expertRole,
        reputation: STORY_LAB_EXPERT_GUILD.reputation,
        joinedAt: STORY_LAB_EXPERT_GUILD.joinedAt,
      },
    ],
    candidates: [],
    recentJobs: [],
    totalProposalsReviewed: STORY_LAB_EXPERT_GUILD.closedProposals,
    averageApprovalTime: "2 days",
    candidateCount: 0,
    openPositions: 3,
    totalVetdStaked: 12500,
  };
}

export function withStoryLabGuilds(guilds: ExpertGuild[]): ExpertGuild[] {
  return prependUniqueById(guilds, STORY_LAB_EXPERT_GUILD, (guild) => guild.id);
}

export function withStoryLabGuildRecords(guilds: GuildRecord[]): GuildRecord[] {
  return prependUniqueById(guilds, STORY_LAB_GUILD, (guild) => guild.id);
}

export const STORY_LAB_NOTIFICATIONS: Notification[] = [
  {
    id: STORY_LAB_NOTIFICATION_RESULT_ID,
    expertId: "story-lab-expert",
    type: "application_status",
    title: "Maya Chen review reached consensus",
    message:
      "Your score aligned with the reviewer panel. The application passed, and reward plus reputation updates are ready.",
    guildId: STORY_LAB_GUILD.id,
    guildName: STORY_LAB_GUILD.name,
    applicationId: STORY_LAB_REVIEW_APPLICATION_ID,
    applicantType: "expert",
    link: "/expert/earnings",
    isRead: false,
    createdAt: STORY_LAB_TIMESTAMPS.notificationResult,
  },
  {
    id: STORY_LAB_NOTIFICATION_REWARD_ID,
    expertId: "story-lab-expert",
    type: "reward_earned",
    title: `Reward posted: +${STORY_LAB_VOTE_OUTCOME.reward} VETD`,
    message:
      "Consensus finalized the review. Your aligned vote produced a story reward and a reputation gain.",
    guildId: STORY_LAB_GUILD.id,
    guildName: STORY_LAB_GUILD.name,
    applicationId: STORY_LAB_REVIEW_APPLICATION_ID,
    applicantType: "expert",
    link: "/expert/earnings",
    isRead: false,
    createdAt: STORY_LAB_TIMESTAMPS.notificationReward,
  },
];

export const STORY_LAB_EARNINGS_ENTRY: EarningsEntry = {
  amount: STORY_LAB_VOTE_OUTCOME.reward,
  currency: "VETD",
  type: "voting_reward",
  guild_name: STORY_LAB_GUILD.name,
  candidate_name: STORY_LAB_VOTE_OUTCOME.candidateName,
  proposal_id: STORY_LAB_VOTE_OUTCOME.applicationId,
  created_at: STORY_LAB_TIMESTAMPS.earningsPosted,
};

export const STORY_LAB_REPUTATION_ENTRY: ReputationTimelineEntry = {
  change_amount: STORY_LAB_VOTE_OUTCOME.reputationDelta,
  reason: "aligned",
  description: `Aligned review on ${STORY_LAB_VOTE_OUTCOME.candidateName}'s ${STORY_LAB_GUILD.name} guild application`,
  guild_name: STORY_LAB_GUILD.name,
  vote_score: 82,
  alignment_distance: 3.5,
  slash_percent: null,
  reward_amount: STORY_LAB_VOTE_OUTCOME.reward,
  consensus_score: 78.5,
  candidate_name: STORY_LAB_VOTE_OUTCOME.candidateName,
  outcome: "approved",
  proposal_id: STORY_LAB_VOTE_OUTCOME.applicationId,
  created_at: STORY_LAB_TIMESTAMPS.reputationPosted,
};

export const STORY_LAB_ENDORSEMENT_APPLICATION: EndorsementApplication = {
  application_id: STORY_LAB_ENDORSEMENT_APPLICATION_ID,
  candidate_id: "story-lab-candidate-riley",
  candidate_name: "Riley Park",
  candidate_headline: "Backend engineer with fraud systems experience",
  candidate_wallet: "0x0000000000000000000000000000000000000521",
  candidate_bio:
    "Riley passed guild review and is now applying for a company role. Endorsements are expert-backed signals for hiring, separate from guild membership review.",
  job_id: "story-lab-job-risk-platform",
  job_title: "Senior Backend Engineer",
  job_description: "Build risk scoring services, queues, and audit trails for a fintech platform.",
  company_id: "story-lab-company-atlas",
  company_name: "Atlas Fintech",
  guild_score: 84,
  location: "Remote",
  job_type: "Full-time",
  salary_min: 150000,
  salary_max: 185000,
  salary_currency: "USD",
  applied_at: STORY_LAB_TIMESTAMPS.endorsementApplied,
  bidding_deadline: STORY_LAB_TIMESTAMPS.endorsementDeadline,
  current_bid: "75",
  rank: 2,
  status: "active",
  cover_letter:
    "I have shipped event-driven risk systems and can own the fraud scoring roadmap.",
  screening_answers: {
    "What production system are you most proud of?":
      "A queue-backed anomaly pipeline with audit replay and on-call dashboards.",
  },
  experience_level: "senior",
  job_skills: ["Node.js", "PostgreSQL", "Queues", "Risk"],
  requirements: ["Distributed systems", "Auditability", "Operational ownership"],
  linkedin: "https://example.test/riley-park",
  github: "https://example.test/riley-park-github",
  resume_url: "demo://riley-park-resume",
  endorsement_count: 2,
  matchScore: 86,
};

export const STORY_LAB_GOVERNANCE_PROPOSAL: GovernanceProposalDetail = {
  id: STORY_LAB_GOVERNANCE_PROPOSAL_ID,
  title: "Raise Engineering review quorum for senior applicants",
  description:
    "Require one extra reviewer for senior-level Engineering applications so high-impact approvals have stronger consensus.",
  proposal_type: "guild_policy",
  status: "active",
  proposer_wallet: "0x0000000000000000000000000000000000000642",
  proposer_name: "Engineering Guild Council",
  guild_id: STORY_LAB_GUILD.id,
  guild_name: STORY_LAB_GUILD.name,
  stake_amount: 100,
  voting_deadline: STORY_LAB_TIMESTAMPS.governanceDeadline,
  created_at: STORY_LAB_TIMESTAMPS.governanceCreated,
  votes_for: 18,
  votes_against: 4,
  votes_abstain: 1,
  total_voting_power: 23,
  quorum_required: 20,
  voter_count: 23,
  finalized: false,
  has_voted: true,
  my_vote: "for",
  my_vote_weight: 1.4,
};

export function prependUniqueById<T>(
  items: T[],
  storyItem: T,
  getId: (item: T) => string
): T[] {
  const safe = Array.isArray(items) ? items : [];
  const storyId = getId(storyItem);
  if (safe.some((item) => getId(item) === storyId)) return safe;
  return [storyItem, ...safe];
}

export function withStoryLabNotifications(items: Notification[]): Notification[] {
  return STORY_LAB_NOTIFICATIONS.reduceRight(
    (current, notification) => prependUniqueById(current, notification, (item) => item.id),
    items
  );
}

export function withStoryLabEarnings(
  summary: EarningsSummary | null,
  items: EarningsEntry[],
  pagination: PaginationInfo | null
): {
  summary: EarningsSummary;
  items: EarningsEntry[];
  pagination: PaginationInfo;
} {
  const nextItems = prependUniqueById(
    items,
    STORY_LAB_EARNINGS_ENTRY,
    (item) => item.proposal_id ?? `${item.type}:${item.created_at}:${item.candidate_name ?? ""}`
  );
  const currentSummary = summary ?? { totalVetd: 0, byGuild: [], byType: [] };
  const currentByGuild = currentSummary.byGuild ?? [];
  const currentByType = currentSummary.byType ?? [];
  const currentTotalVetd = currentSummary.totalVetd ?? 0;
  const byGuild = prependOrBumpTotal(
    currentByGuild,
    { guildId: STORY_LAB_GUILD.id, guildName: STORY_LAB_GUILD.name, total: STORY_LAB_VOTE_OUTCOME.reward },
    (item) => item.guildId
  );
  const byType = prependOrBumpTotal(
    currentByType,
    { type: "voting_reward", total: STORY_LAB_VOTE_OUTCOME.reward },
    (item) => item.type
  );

  return {
    summary: {
      ...currentSummary,
      totalVetd:
        Math.max(currentTotalVetd, 0) +
        (items.length === nextItems.length ? 0 : STORY_LAB_VOTE_OUTCOME.reward),
      byGuild,
      byType,
    },
    items: nextItems,
    pagination: pagination ?? {
      page: 1,
      limit: 20,
      total: nextItems.length,
      totalPages: 1,
    },
  };
}

function prependOrBumpTotal<T extends { total: number }>(
  items: T[],
  storyItem: T,
  getId: (item: T) => string
): T[] {
  const storyId = getId(storyItem);
  let found = false;
  const next = items.map((item) => {
    if (getId(item) !== storyId) return item;
    found = true;
    return { ...item, total: Math.max(item.total, storyItem.total) };
  });
  return found ? next : [storyItem, ...next];
}

export function withStoryLabReputation(
  profile: ExpertProfile | null,
  timeline: ReputationTimelineEntry[],
  pagination: PaginationInfo | null
): {
  profile: ExpertProfile | null;
  timeline: ReputationTimelineEntry[];
  pagination: PaginationInfo;
} {
  const nextTimeline = prependUniqueById(
    timeline,
    STORY_LAB_REPUTATION_ENTRY,
    (item) => item.proposal_id ?? `${item.description}:${item.created_at}`
  );
  return {
    profile: profile
      ? {
          ...profile,
          reputation: Math.max(profile.reputation ?? 0, 350),
          reviewCount: Math.max(profile.reviewCount ?? 0, 1),
        }
      : profile,
    timeline: nextTimeline,
    pagination: pagination ?? {
      page: 1,
      limit: 15,
      total: nextTimeline.length,
      totalPages: 1,
    },
  };
}

export function withStoryLabEndorsements(
  applications: EndorsementApplication[]
): EndorsementApplication[] {
  return prependUniqueById(
    applications,
    STORY_LAB_ENDORSEMENT_APPLICATION,
    (item) => item.application_id
  );
}

export function withStoryLabGovernance(
  proposals: GovernanceProposalDetail[] | undefined
): GovernanceProposalDetail[] {
  return prependUniqueById(
    proposals ?? [],
    STORY_LAB_GOVERNANCE_PROPOSAL,
    (item) => item.id
  );
}

export function withStoryLabGuildStakes(
  stakes: GuildStakeInfo[] | null | undefined
): GuildStakeInfo[] {
  return prependUniqueById(
    stakes ?? [],
    {
      guildId: STORY_LAB_GUILD.id,
      stakedAmount: String(STORY_LAB_VOTE_OUTCOME.stake),
      meetsMinimum: true,
    },
    (item) => item.guildId
  );
}

export function getStoryLabReviewModalStep(stepId: string | null): 1 | 2 | 3 | 4 | null {
  if (stepId === "review-evidence") return 1;
  if (stepId === "review-scoring") return 2;
  if (stepId === "review-red-flags" || stepId === "review-commit") return 3;
  if (stepId === "review-result") return 4;
  return null;
}
