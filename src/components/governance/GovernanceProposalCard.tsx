"use client";

import { Clock, Check, ChevronRight } from "lucide-react";
import { formatDeadline } from "@/lib/utils";
import { VOTE_COLORS, STATUS_COLORS } from "@/config/colors";

interface GovernanceProposalCardProps {
  proposal: {
    id: string;
    title: string;
    description: string;
    proposal_type: string;
    status: string;
    voting_deadline: string;
    votes_for: number;
    votes_against: number;
    votes_abstain: number;
    total_voting_power: number;
    quorum_required: number;
    voter_count?: number;
    proposer_name?: string;
    proposer_wallet?: string;
    has_voted?: boolean;
    my_vote?: string;
    finalized?: boolean;
  };
  onClick?: () => void;
}

export function GovernanceProposalCard({
  proposal,
  onClick,
}: GovernanceProposalCardProps) {
  const totalVotes = proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
  const forPercent = totalVotes > 0 ? (proposal.votes_for / totalVotes) * 100 : 0;
  const againstPercent = totalVotes > 0 ? (proposal.votes_against / totalVotes) * 100 : 0;
  const abstainPercent = totalVotes > 0 ? (proposal.votes_abstain / totalVotes) * 100 : 0;
  const deadlineStr = formatDeadline(proposal.voting_deadline);
  const isActive = proposal.status === "active" && !proposal.finalized;
  const isPending = proposal.status === "pending";

  const initials = (proposal.proposer_name || "??")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      onClick={onClick}
      className="group grid grid-cols-1 md:grid-cols-[140px_1fr_220px] items-center gap-4 md:gap-6 p-6 md:px-8 rounded-xl border border-border bg-card cursor-pointer hover:translate-y-[-1px] hover:border-border hover:bg-muted/30 transition-all"
    >
      {/* ─── Left: Meta ─── */}
      <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-2">
        <span className="font-mono text-sm font-medium text-primary">
          #{proposal.id.slice(0, 6)}
        </span>

        {isActive && (
          <span className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${STATUS_COLORS.positive.badge}`}>
            <span className="w-[5px] h-[5px] rounded-full bg-positive animate-pulse" />
            Active
          </span>
        )}
        {isPending && (
          <span className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${STATUS_COLORS.warning.badge}`}>
            <Clock className="w-2.5 h-2.5" />
            Pending
          </span>
        )}

        <span className="text-xs text-muted-foreground">
          {isActive ? `Ends in ${deadlineStr}` : isPending ? "Voting not started" : deadlineStr}
        </span>
      </div>

      {/* ─── Center: Content ─── */}
      <div className="min-w-0">
        <h3 className="font-display text-xl font-bold tracking-tight leading-snug mb-1.5">
          {proposal.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-2.5">
          {proposal.description}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-5 h-5 rounded-full bg-muted-foreground flex items-center justify-center text-xs font-bold text-white">
            {initials}
          </span>
          <span>{proposal.proposer_name || "Unknown"}</span>
        </div>

        {/* Read more on hover */}
        <span className="hidden group-hover:inline-flex items-center gap-2 text-xs font-medium text-primary mt-2">
          Read full proposal
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* ─── Right: Votes ─── */}
      <div className="flex flex-col gap-2">
        {totalVotes > 0 ? (
          <>
            {/* Mini vote bar */}
            <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden flex">
              {forPercent > 0 && (
                <div
                  className={`h-full ${VOTE_COLORS.for.bar} rounded-l transition-all duration-700`}
                  style={{ width: `${forPercent}%` }}
                />
              )}
              {againstPercent > 0 && (
                <div
                  className={`h-full ${VOTE_COLORS.against.bar}`}
                  style={{ width: `${againstPercent}%` }}
                />
              )}
              {abstainPercent > 0 && (
                <div
                  className={`h-full ${VOTE_COLORS.abstain.bar} rounded-r`}
                  style={{ width: `${abstainPercent}%` }}
                />
              )}
            </div>

            {/* Stats row */}
            <div className="flex justify-between font-mono text-xs">
              <span className={VOTE_COLORS.for.text}>{forPercent.toFixed(0)}% For</span>
              <span className={VOTE_COLORS.against.text}>{againstPercent.toFixed(0)}% Against</span>
            </div>

            {/* Your vote status */}
            {proposal.has_voted ? (
              <div
                className={`flex items-center gap-2 text-xs font-medium mt-0.5 ${
                  proposal.my_vote === "for"
                    ? VOTE_COLORS.for.text
                    : proposal.my_vote === "against"
                      ? VOTE_COLORS.against.text
                      : VOTE_COLORS.abstain.text
                }`}
              >
                <Check className="w-3 h-3" />
                You voted {proposal.my_vote ? proposal.my_vote.charAt(0).toUpperCase() + proposal.my_vote.slice(1) : ""}
              </div>
            ) : isActive ? (
              <p className="text-xs text-muted-foreground italic mt-0.5">Not yet voted</p>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">
            Voting has not started
          </p>
        )}
      </div>
    </div>
  );
}
