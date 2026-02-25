/** Types for the expert reputation page. */

export interface ReputationTimelineEntry {
  change_amount: number;
  reason: string;
  description: string;
  guild_name: string;
  vote_score: number | null;
  alignment_distance: number | null;
  slash_percent: number | null;
  reward_amount: number | null;
  consensus_score: number | null;
  candidate_name: string | null;
  outcome: string | null;
  proposal_id: string | null;
  created_at: string;
}

export interface ReputationTierConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
}
