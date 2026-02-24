export type ExpertRole = "recruit" | "apprentice" | "craftsman" | "officer" | "master";

/** Public guild listing — returned by guildsApi.getAll / getPublicDetail. */
export interface Guild {
  id: string;
  name: string;
  description: string;
  memberCount?: number;
  expertCount?: number;
  candidateCount?: number;
  totalMembers?: number;
  openPositions?: number;
  totalProposalsReviewed?: number;
  jobCount?: number;
  icon?: string;
  color?: string;
}

/** Guild as seen on an expert's dashboard — includes role & stats within that guild. */
export interface ExpertGuild {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  expertRole: ExpertRole;
  reputation: number;
  totalEarnings: number;
  joinedAt?: string;
  pendingProposals: number;
  pendingApplications?: number;
  ongoingProposals: number;
  closedProposals: number;
}

/** Minimal guild record for dropdowns and selection lists. */
export interface GuildRecord {
  id: string;
  name: string;
}
