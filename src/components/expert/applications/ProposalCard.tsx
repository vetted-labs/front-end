import { useRouter } from "next/navigation";
import { Users, ArrowRight, CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CountdownBadge } from "@/components/ui/countdown-badge";
import { STATUS_COLORS } from "@/config/colors";
import type { GuildApplication } from "@/types";

interface ProposalCardProps {
  proposal: GuildApplication;
  onReview: (proposal: GuildApplication) => void;
  meetsStakingRequirement: boolean;
  showGuildBadge?: boolean;
}

export function ProposalCard({
  proposal,
  onReview,
  meetsStakingRequirement,
  showGuildBadge,
}: ProposalCardProps) {
  const router = useRouter();
  const isFinalized = proposal.finalized;
  const hasVoted = proposal.has_voted;
  const isAssigned = proposal.is_assigned_reviewer;

  const outcomeLabel =
    proposal.outcome === "approved"
      ? "Approved"
      : proposal.outcome === "rejected"
        ? "Rejected"
        : proposal.outcome === "inconclusive"
          ? "Inconclusive"
          : null;

  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 dark:hover:border-border">
      {/* Top row: name + badges + actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3
              className="text-sm font-bold text-foreground hover:text-primary cursor-pointer transition-colors truncate"
              onClick={() => router.push(`/expert/voting/applications/${proposal.id}`)}
            >
              {proposal.candidate_name}
            </h3>
            {showGuildBadge && proposal.guild_name && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {proposal.guild_name}
              </Badge>
            )}
            {isFinalized && outcomeLabel && (
              <Badge
                variant={proposal.outcome === "approved" ? "default" : "destructive"}
                className="text-xs shrink-0"
              >
                {outcomeLabel}
              </Badge>
            )}
            {isAssigned && !isFinalized && (
              <Badge variant="default" className="text-xs shrink-0">Assigned</Badge>
            )}
            {proposal.consensus_failed && !isFinalized && (
              <Badge variant="outline" className={`${STATUS_COLORS.pending.border} ${STATUS_COLORS.pending.text} text-xs shrink-0`}>
                Consensus Failed
              </Badge>
            )}
            {proposal.is_tiebreaker_reviewer && !hasVoted && !isFinalized && (
              <Badge className={`text-xs shrink-0 ${STATUS_COLORS.info.bg}`}>Tiebreaker</Badge>
            )}
            {hasVoted && (
              <span className={`inline-flex items-center gap-1 text-xs ${STATUS_COLORS.positive.text}`}>
                <CheckCircle className="w-3 h-3" />
                Voted
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-1">{proposal.candidate_email}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/expert/voting/applications/${proposal.id}`)}
          >
            View
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
          {!isFinalized && (
            !meetsStakingRequirement ? (
              <Button variant="outline" size="sm" disabled>
                <Lock className="w-3.5 h-3.5 mr-1" />
                Stake Required
              </Button>
            ) : (isAssigned || proposal.is_tiebreaker_reviewer) && !hasVoted ? (
              <Button size="sm" onClick={() => onReview(proposal)}>
                {proposal.is_tiebreaker_reviewer ? "Tiebreaker Vote" : "Cast Vote"}
              </Button>
            ) : hasVoted ? (
              <Button variant="outline" size="sm" disabled>
                Voted
              </Button>
            ) : null
          )}
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
        {!isFinalized && proposal.voting_deadline && (
          <CountdownBadge deadline={proposal.voting_deadline} label="Vote" />
        )}
        {isFinalized && proposal.finalized_at && (
          <span className="inline-flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Finalized {new Date(proposal.finalized_at).toLocaleDateString()}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {proposal.vote_count}{proposal.assigned_reviewer_count != null ? `/${proposal.assigned_reviewer_count}` : ""} votes
        </span>
        {proposal.consensus_score != null && (
          <span className="font-medium text-foreground">
            Consensus {proposal.consensus_score.toFixed(1)}/100
          </span>
        )}
        {proposal.my_vote_score != null && (
          <span>
            Your score: {proposal.my_vote_score}/100
            {proposal.alignment_distance !== undefined && (
              <span className={proposal.alignment_distance < 10 ? ` ${STATUS_COLORS.positive.text}` : ` ${STATUS_COLORS.negative.text}`}>
                {" "}({proposal.alignment_distance < 10 ? "High" : "Low"} alignment)
              </span>
            )}
          </span>
        )}
        {proposal.voting_phase && proposal.voting_phase !== "direct" && (
          <Badge variant="outline" className={`${STATUS_COLORS.pending.border} ${STATUS_COLORS.pending.text} text-xs py-0`}>
            {proposal.voting_phase}
          </Badge>
        )}
      </div>

      {/* Finalization result summary */}
      {isFinalized && proposal.my_reputation_change !== undefined && (
        <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-4 text-xs">
          <span className={`font-medium ${(proposal.my_reputation_change ?? 0) >= 0 ? STATUS_COLORS.positive.text : STATUS_COLORS.negative.text}`}>
            {(proposal.my_reputation_change ?? 0) >= 0 ? "+" : ""}{proposal.my_reputation_change} Rep
          </span>
          {proposal.my_reward_amount !== undefined && parseFloat(String(proposal.my_reward_amount)) > 0 && (
            <span className={`${STATUS_COLORS.warning.text} font-medium`}>
              +{proposal.my_reward_amount} VETD
            </span>
          )}
        </div>
      )}
    </div>
  );
}
