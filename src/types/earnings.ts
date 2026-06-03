/** Types for the expert earnings page. */

/** Lifecycle state of an earning. `allocated` VETD is locked until the expert
 * joins a guild; `paid` is realized/claimable; `clawed_back` counts toward
 * neither total. */
export type EarningState = "allocated" | "paid" | "clawed_back";

export interface EarningsEntry {
  amount: number;
  currency: string;
  type: string;
  state?: EarningState;
  guild_name: string | null;
  candidate_name: string | null;
  proposal_id: string | null;
  created_at: string;
}

export interface GuildEarning {
  guildId: string;
  guildName: string;
  total: number;
}

export interface TypeEarning {
  type: string;
  total: number;
}

export interface EarningsSummary {
  /** Back-compat GROSS total = paidTotal + allocatedTotal. Not the claimable figure. */
  totalVetd: number;
  /** Claimable/realized VETD — vote + endorsement rewards + paid expert_earnings. */
  paidTotal?: number;
  /** Locked VETD — allocated expert_earnings, paid out when the expert joins a guild. */
  allocatedTotal?: number;
  byGuild: GuildEarning[];
  byType: TypeEarning[];
}

export type TimeRange = "all" | "day" | "week" | "month";
