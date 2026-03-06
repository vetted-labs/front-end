import { useRouter } from "next/navigation";
import { Clock, Users, ArrowRight, CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDeadline } from "@/lib/utils";
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
        : null;

  return (
    <div className="group rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-5 transition-all hover:border-primary/30 dark:bg-card/40 dark:border-white/[0.06] dark:hover:border-white/[0.12]">
      {/* Top row: name + badges + actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3
              className="text-base font-semibold text-foreground hover:text-primary cursor-pointer transition-colors truncate"
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
            {hasVoted && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
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
            ) : isAssigned && !hasVoted ? (
              <Button size="sm" onClick={() => onReview(proposal)}>
                Cast Vote
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
        {!isFinalized && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDeadline(proposal.voting_deadline)}
          </span>
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
              <span className={proposal.alignment_distance < 10 ? " text-green-600 dark:text-green-400" : " text-red-500"}>
                {" "}({proposal.alignment_distance < 10 ? "High" : "Low"} alignment)
              </span>
            )}
          </span>
        )}
        {proposal.voting_phase && proposal.voting_phase !== "direct" && (
          <Badge variant="outline" className="border-orange-500/30 text-orange-500 text-[10px] py-0">
            {proposal.voting_phase}
          </Badge>
        )}
      </div>

      {/* Finalization result summary */}
      {isFinalized && proposal.my_reputation_change !== undefined && (
        <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-4 text-xs">
          <span className={`font-medium ${(proposal.my_reputation_change ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
            {(proposal.my_reputation_change ?? 0) >= 0 ? "+" : ""}{proposal.my_reputation_change} Rep
          </span>
          {proposal.my_reward_amount !== undefined && parseFloat(String(proposal.my_reward_amount)) > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              +{proposal.my_reward_amount} VETD
            </span>
          )}
        </div>
      )}
    </div>
  );
}
