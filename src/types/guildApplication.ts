// --- Guild Application Template types (used by the multi-step application flow) ---

export interface GuildApplicationTemplate {
  templateName: string;
  description: string;
  guidance: string[];
  noAiDeclarationText: string | null;
  requiresResume: boolean;
  requiredLevel?: string;
  requiredSocialLinks?: string[];
  generalQuestions: GuildApplicationQuestion[];
  levels: GuildApplicationLevel[];
  domainQuestions: {
    entry: GuildDomainLevel | null;
    experienced: GuildDomainLevel | null;
    expert: GuildDomainLevel | null;
  };
}

export interface GuildApplicationQuestion {
  id: string;
  title: string;
  prompt: string;
  hints?: string[];
  required: boolean;
  scored: boolean;
  maxPoints: number | null;
}

export interface GuildApplicationLevel {
  id: string;
  label: string;
  description: string;
}

export interface GuildDomainLevel {
  templateName: string;
  description: string;
  totalPoints: number | null;
  topics: GuildDomainTopic[];
}

export interface GuildDomainTopic {
  id: string;
  title: string;
  prompt: string;
}

// --- Guild Application voting/status types ---

export type GuildApplicationStatus = "active" | "closed" | "expired" | "finalized";
export type GuildApplicationOutcome = "approved" | "rejected";

/** Guild application as listed on the voting page. */
export interface GuildApplication {
  id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_id?: string;
  // Structured fields
  years_of_experience?: number;
  skills_summary?: string;
  experience_summary?: string;
  motivation_statement?: string;
  credibility_evidence?: string;
  achievements?: string[];
  // Legacy field
  proposal_text?: string;
  // Voting data
  guild_id: string;
  guild_name: string;
  required_stake: number;
  status: string;
  created_at: string;
  voting_deadline: string;
  vote_count: number;
  votes_for_count?: number;
  votes_against_count?: number;
  total_stake_for?: number;
  total_stake_against?: number;
  assigned_reviewer_count?: number;
  voting_phase?: string;
  // Consensus & finalization
  consensus_score?: number;
  finalized: boolean;
  outcome?: GuildApplicationOutcome;
  finalized_at?: string;
  total_rewards_distributed?: number;
  // Reviewer-specific context
  is_assigned_reviewer?: boolean;
  has_voted?: boolean;
  my_vote_score?: number;
  alignment_distance?: number;
  my_reputation_change?: number;
  my_reward_amount?: number;
}

/** Guild-context application summary (camelCase naming from guild detail views). */
export interface GuildApplicationSummary {
  id: string;
  candidateName: string;
  candidateEmail: string;
  submittedAt: string;
  status: string;
  requiredStake: number;
  participantCount?: number;
  votesFor?: number;
  votesAgainst?: number;
  expertHasStaked?: boolean;
  votingDeadline?: string;
  reviewersAssigned?: number;
  reviewsCompleted?: number;
  expertiseLevel?: string;
  yearsOfExperience?: number;
  voteCount?: number;
  totalExperts?: number;
  // Candidate-facing fields
  guildId?: string;
  guildName?: string;
  guild?: { id: string; name: string };
  jobTitle?: string;
  createdAt?: string;
  reviewCount?: number;
  approvalCount?: number;
}

export interface VoteHistoryItem {
  id: string;
  expert_id: string;
  expert_name?: string;
  score: number;
  alignment_distance?: number;
  reputation_change?: number;
  reward_amount?: number;
  comment?: string;
  created_at: string;
}

/** Guild application detail (camelCase, used in the guild-level application detail view). */
export interface GuildApplicationDetail {
  id: string;
  candidateId?: string;
  candidateName: string;
  candidateEmail: string;
  proposalText: string;
  guildId: string;
  guildName: string;
  requiredStake: number;
  votingDeadline: string;
  status: "pending" | "ongoing" | "approved" | "rejected";
  createdAt: string;
  closedAt?: string;
  votes: GuildApplicationVote[];
}

export interface GuildApplicationVote {
  id: string;
  expertId: string;
  expertName: string;
  expertWallet: string;
  vote: "for" | "against" | "abstain";
  stakeAmount: number;
  comment?: string;
  votedAt: string;
}

// --- Guild Application Appeal types (Stage 2b: Decentralized Arbitration) ---

/** Frontend-normalized status values */
export type AppealStatus = "pending" | "reviewing" | "upheld" | "overturned";

/** Backend raw status values */
type BackendAppealStatus = "open" | "panel_assigned" | "under_review" | "approved" | "dismissed" | "expired";

export interface GuildApplicationAppeal {
  id: string;
  applicationId: string;
  applicationName?: string;
  guildId: string;
  guildName?: string;
  /** Expert who filed the appeal */
  appealerExpertId: string;
  appealerName?: string;
  justification: string;
  stakeAmount: number;
  status: AppealStatus;
  createdAt: string;
  resolvedAt?: string;
  /** Panel votes */
  votes: AppealVote[];
  panelSize: number;
  votesUphold: number;
  votesOverturn: number;
  /** Voting deadline (if the backend provides one) */
  votingDeadline?: string;
  /** Outcome details (derived from resolved status) */
  outcome?: AppealOutcome;
}

export interface AppealVote {
  id: string;
  expertId: string;
  expertName?: string;
  decision: "uphold" | "overturn";
  reasoning: string;
  votedAt: string;
}

export interface AppealOutcome {
  decision: "upheld" | "overturned";
  appealerReputationChange: number;
  appealerStakeReturned: boolean;
  originalReviewersReputationChange?: number;
  resolvedAt: string;
}

/** Raw appeal response shape from the backend API. */
interface BackendAppealResponse {
  id: string;
  application_id: string;
  guild_id: string;
  guild_name?: string;
  appealed_by_expert_id: string;
  appealer_name?: string;
  appeal_reason?: string;
  stake_amount: string | number;
  status: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  voting_deadline?: string;
  panel_members?: BackendPanelMember[];
}

interface BackendPanelMember {
  id: string;
  expert_id: string;
  expert_name?: string;
  vote: string | null;
  reasoning?: string;
  voted_at?: string;
  created_at?: string;
}

// --- Backend response mapper ---

const STATUS_MAP: Record<BackendAppealStatus, AppealStatus> = {
  open: "pending",
  panel_assigned: "pending",
  under_review: "reviewing",
  approved: "overturned",
  dismissed: "upheld",
  expired: "upheld",
};

const VOTE_DECISION_MAP: Record<string, "uphold" | "overturn"> = {
  uphold_rejection: "uphold",
  approve_appeal: "overturn",
};

/** Maps a backend appeal API response (snake_case) to frontend GuildApplicationAppeal. */
export function mapAppealResponse(raw: unknown): GuildApplicationAppeal {
  const r = raw as BackendAppealResponse;
  const status = STATUS_MAP[r.status as BackendAppealStatus] ?? "pending";
  const panelMembers: BackendPanelMember[] = r.panel_members ?? [];

  const votes: AppealVote[] = panelMembers
    .filter((m): m is BackendPanelMember & { vote: string } => m.vote !== null)
    .map((m) => ({
      id: m.id,
      expertId: m.expert_id,
      expertName: m.expert_name ?? undefined,
      decision: VOTE_DECISION_MAP[m.vote] ?? "uphold",
      reasoning: m.reasoning ?? "",
      votedAt: m.voted_at ?? m.created_at ?? "",
    }));

  const votesUphold = votes.filter((v) => v.decision === "uphold").length;
  const votesOverturn = votes.filter((v) => v.decision === "overturn").length;

  const isResolved = ["approved", "dismissed", "expired"].includes(r.status);
  const outcome: AppealOutcome | undefined = isResolved
    ? {
        decision: r.status === "approved" ? "overturned" : "upheld",
        appealerReputationChange: r.status === "approved" ? 3 : -5,
        appealerStakeReturned: r.status === "approved",
        resolvedAt: r.resolved_at ?? r.updated_at ?? "",
      }
    : undefined;

  return {
    id: r.id,
    applicationId: r.application_id,
    guildId: r.guild_id,
    guildName: r.guild_name ?? undefined,
    appealerExpertId: r.appealed_by_expert_id,
    appealerName: r.appealer_name ?? undefined,
    justification: r.appeal_reason ?? "",
    stakeAmount: parseFloat(String(r.stake_amount)) || 0,
    status,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at ?? undefined,
    votes,
    panelSize: panelMembers.length || 3,
    votesUphold,
    votesOverturn,
    votingDeadline: r.voting_deadline ?? undefined,
    outcome,
  };
}
