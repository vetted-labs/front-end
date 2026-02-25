/** Types for the expert earnings page. */

export interface EarningsEntry {
  amount: number;
  currency: string;
  type: string;
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
  totalVetd: number;
  byGuild: GuildEarning[];
  byType: TypeEarning[];
}

export type TimeRange = "all" | "day" | "week" | "month";
