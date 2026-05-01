import type { GuildApplication } from "@/types";

export const VOTEABLE_PROPOSAL_STATUS = "ongoing";

export function isProposalVoteable(proposal: Pick<
  GuildApplication,
  "status" | "finalized" | "has_voted" | "is_assigned_reviewer" | "is_tiebreaker_reviewer"
>): boolean {
  return (
    proposal.status === VOTEABLE_PROPOSAL_STATUS &&
    !proposal.finalized &&
    !proposal.has_voted &&
    (proposal.is_assigned_reviewer === true || proposal.is_tiebreaker_reviewer === true)
  );
}
