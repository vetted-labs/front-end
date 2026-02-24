export type ProposalStatus = "active" | "closed" | "expired" | "finalized";
export type ProposalOutcome = "approved" | "rejected";

/** Proposal as listed on the voting page. */
export interface Proposal {
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
  assigned_reviewer_count?: number;
  // Consensus & finalization
  consensus_score?: number;
  finalized: boolean;
  outcome?: ProposalOutcome;
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

/** Guild-context proposal (camelCase naming from guild detail views). */
export interface GuildProposal {
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
