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
