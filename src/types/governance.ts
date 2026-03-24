export interface GovernanceVote {
  id: string;
  voter_wallet: string;
  voter_name?: string;
  vote: "for" | "against" | "abstain";
  voting_power: number;
  /** Merit-weighted vote weight (reputation-based). Falls back to voting_power if absent. */
  vote_weight?: number;
  reason?: string;
  created_at: string;
}

export interface GovernanceProposalDetail {
  id: string;
  title: string;
  description: string;
  proposal_type: string;
  status: string;
  proposer_wallet: string;
  proposer_name?: string;
  guild_id?: string;
  guild_name?: string;
  stake_amount: number;
  voting_deadline: string;
  created_at: string;
  // Parameter change
  parameter_name?: string;
  current_value?: string;
  proposed_value?: string;
  // Election
  nominee_wallet?: string;
  nominee_name?: string;
  // Voting data
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  total_voting_power: number;
  quorum_required: number;
  voter_count: number;
  // Threshold
  approval_threshold?: number;
  // Results
  finalized: boolean;
  outcome?: "passed" | "rejected";
  approval_percent?: number;
  quorum_reached?: boolean;
  // User state
  has_voted?: boolean;
  my_vote?: string;
  my_vote_weight?: number;
  // Vote history
  votes?: GovernanceVote[];
}

export type GovernanceOutcome = "passed" | "rejected";

export type GovernanceFilterStatus = "active" | "passed" | "rejected" | "all";

export type ProposalSubmitStep = "idle" | "approving" | "staking" | "confirming" | "creating";

export const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  parameter_change: "Parameter Change",
  guild_master_election: "Guild Master Election",
  guild_creation: "Guild Creation",
  guild_policy: "Guild Policy",
  treasury_spend: "Treasury Spend",
  general: "General Proposal",
};
