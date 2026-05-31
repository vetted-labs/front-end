/**
 * Types for the private member guild workspace at `/expert/guild/[id]`.
 *
 * The workspace is a daily-home surface for active reviewers and is distinct
 * from the public guild page IA. Backend endpoints powering these types are
 * landing in Phase 5; UI gracefully empty-states when they aren't available.
 */

/** Items on the unified member queue. */
export type GuildQueueItemType = "candidate" | "expert" | "governance" | "reveal";

/** Phase / kind tag rendered on the row. */
export type GuildQueueItemPhase = "commit" | "reveal" | "review" | "vouch" | "vote" | "open";

/** Triage bucket assigned by the backend. */
export type GuildQueueBucket = "due_soon" | "waiting" | "unclaimed";

/** A single queue row. */
export interface GuildQueueItem {
  id: string;
  /** Bucket the item lives in: due_soon (urgent), waiting, unclaimed. */
  bucket: GuildQueueBucket;
  /** Domain the work item belongs to. */
  type: GuildQueueItemType;
  /** Lifecycle phase of the item (drives the row tag). */
  phase: GuildQueueItemPhase;
  /** Title — usually role+company for candidates, applicant name for expert apps, proposal title for governance. */
  title: string;
  /** Subject name shown in the sub-meta row. */
  subjectName?: string;
  /** Free-form sub-text rendered after the subject (e.g. "ex-Cloudflare staff"). */
  subjectMeta?: string;
  /** ISO timestamp of when the item closes. Null for open-ended items. */
  deadline?: string | null;
  /** Number of commits (or votes) completed and required. */
  commitsCompleted?: number;
  commitsRequired?: number;
  /** Stake required to claim, in VETD. */
  stakeRequired?: number;
  /** Stake currently locked by you on this item, in VETD. */
  stakeLocked?: number;
  /** Estimated fee (USD) when relevant for unclaimed items. */
  estimatedFeeUsd?: number;
  /** Indicates the item gives a first-mover bonus (unclaimed bucket only). */
  firstMoverBonus?: boolean;
  /** Optional href the row's primary action navigates to. */
  actionHref?: string;
  /** Action label override (defaults derived from phase/type). */
  actionLabel?: string;
  /** Whether the action should render as primary (orange) or secondary. */
  actionPrimary?: boolean;
  /** Optional governance vote tally summary (for `type === "governance"`). */
  votesCast?: number;
  totalVoters?: number;
  supportPercent?: number;
}

/** KPI summary returned alongside the queue. */
export interface GuildWorkspaceKpis {
  queueCount: number;
  queueUrgentCount: number;
  activeCommits: number;
  awaitingReveal: number;
  revealOpen: number;
  stakeLockedVetd: number;
  stakeLockedReviewCount: number;
  pendingPayoutsUsd: number;
  pendingPayoutReviewCount: number;
  reputation: number;
  reputationDelta: number;
  rank?: number;
  totalMembers?: number;
}

/** Stake position card on the queue sidebar. */
export interface GuildWorkspaceStakePosition {
  totalStakedVetd: number;
  inReviewVetd: number;
  availableVetd: number;
  atRiskVetd: number;
  inReviewPercent: number;
}

/** Personal performance stats this period. */
export interface GuildWorkspacePeriodStats {
  reviews: number;
  consensusRate: number;
  avgConviction: number;
  reputationDelta: number;
  earnedUsd: number;
}

/** Full payload returned from `GET /guilds/:id/queue`. */
export interface GuildWorkspaceQueueResponse {
  items: GuildQueueItem[];
  kpis: GuildWorkspaceKpis;
  stakePosition: GuildWorkspaceStakePosition;
  periodStats: GuildWorkspacePeriodStats;
}

/** Triaged proposal returned from `GET /guilds/:id/governance/proposals`. */
export interface GuildWorkspaceProposal {
  id: string;
  title: string;
  proposerName?: string;
  proposerWallet?: string;
  proposedAt: string;
  votesCast: number;
  totalVoters: number;
  supportPercent: number;
  /** Voting deadline ISO timestamp. Null for finalized proposals. */
  deadline?: string | null;
  /** Proposal lifecycle status. */
  status: "open" | "passed" | "rejected";
  /** "Trending pass" hint when consensus is leaning in. */
  trending?: "passing" | "failing";
  /** Whether the viewer has cast a vote. */
  hasVoted?: boolean;
  /** The viewer's vote, if cast. */
  myVote?: "for" | "against" | "abstain";
}

/** Tabs available in the private workspace surface. */
export const GUILD_WORKSPACE_TABS = [
  "queue",
  "reviews",
  "governance",
  "feed",
  "members",
  "earnings",
  "leaderboard",
] as const;
export type GuildWorkspaceTab = (typeof GUILD_WORKSPACE_TABS)[number];

// --- Guild Activity tab (BE-C: GET /api/guilds/:guildId/activity) ---

/**
 * A candidate guild application awaiting review by the guild's experts.
 * Surfaced in the "Pending reviews" section of the Guild Activity tab.
 */
export interface GuildActivityPendingReview {
  candidateId: string;
  candidateName: string;
  expertiseLevel?: string | null;
  /** ISO timestamp of when the candidate applied. */
  appliedAt?: string | null;
  /** Job title the candidate is associated with, when available. */
  jobTitle?: string | null;
  status?: string | null;
}

/** A candidate whose guild application was rejected. Shown under History. */
export interface GuildActivityRejectedMember {
  candidateId: string;
  candidateName: string;
  expertiseLevel?: string | null;
  /** ISO timestamp of when the candidate applied. */
  appliedAt?: string | null;
  /** ISO timestamp of when the application was rejected. */
  rejectedAt?: string | null;
}

/** A candidate who was accepted/joined the guild. Shown under History. */
export interface GuildActivityJoinedMember {
  candidateId: string;
  candidateName: string;
  expertiseLevel?: string | null;
  /** ISO timestamp of when the candidate joined. */
  joinedAt?: string | null;
}

/**
 * A candidate job application against a job posted to this guild — e.g.
 * "John applied to Software Engineer at {company}". Links to the job detail.
 */
export interface GuildActivityJobApplication {
  applicationId: string;
  status?: string | null;
  /** ISO timestamp of when the candidate applied to the job. */
  appliedAt?: string | null;
  jobId: string;
  jobTitle: string;
  candidateId: string;
  candidateName: string;
  companyName?: string | null;
}

/** Full payload returned from `GET /api/guilds/:guildId/activity`. */
export interface GuildActivityResponse {
  pendingReviews: GuildActivityPendingReview[];
  /** Candidates rejected from the guild. */
  rejectedMembers: GuildActivityRejectedMember[];
  /** Candidates who joined the guild. May be absent on older backends. */
  joinedMembers?: GuildActivityJoinedMember[];
  jobApplications: GuildActivityJobApplication[];
}
