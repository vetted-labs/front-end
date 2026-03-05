import { useRouter } from "next/navigation";
import { Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDeadline } from "@/lib/utils";
import { StructuredApplicationDisplay } from "@/components/StructuredApplicationDisplay";
import { ApplicationFinalizationDisplay } from "@/components/ApplicationFinalizationDisplay";
import { VotingScoreSlider } from "@/components/VotingScoreSlider";
import type { GuildApplication } from "@/types";

interface ProposalCardProps {
  proposal: GuildApplication;
  isVoting: boolean;
  onStartVote: () => void;
  onCancelVote: () => void;
  onSubmitVote: (score: number, stakeAmount: number, comment: string) => void;
  isSubmittingVote: boolean;
  meetsStakingRequirement: boolean;
  showGuildBadge?: boolean;
}

export function ProposalCard({
  proposal,
  isVoting,
  onStartVote,
  onCancelVote,
  onSubmitVote,
  isSubmittingVote,
  meetsStakingRequirement,
  showGuildBadge,
}: ProposalCardProps) {
  const router = useRouter();

  return (
    <div className="border border-border bg-card p-5 transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3
              className="text-base font-semibold hover:text-primary cursor-pointer"
              onClick={() => router.push(`/expert/voting/applications/${proposal.id}`)}
            >
              {proposal.candidate_name}
            </h3>
            {showGuildBadge && proposal.guild_name && (
              <Badge variant="secondary" className="text-xs">
                {proposal.guild_name}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {formatDeadline(proposal.voting_deadline)}
            </Badge>
            {proposal.is_assigned_reviewer && (
              <Badge variant="default">Assigned</Badge>
            )}
            {proposal.has_voted && (
              <Badge variant="secondary">Voted</Badge>
            )}
            {proposal.voting_phase && proposal.voting_phase !== "direct" && (
              <Badge variant="outline" className="border-orange-500/30 text-orange-500 text-xs">
                {proposal.voting_phase}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-3">{proposal.candidate_email}</p>

          <div className="mb-4">
            <StructuredApplicationDisplay application={proposal} compact={true} />
          </div>

          {proposal.finalized && (
            <div className="mb-4">
              <ApplicationFinalizationDisplay
                application={proposal}
                myVote={
                  proposal.my_vote_score !== undefined
                    ? {
                        score: proposal.my_vote_score,
                        alignment_distance: proposal.alignment_distance,
                        reputation_change: proposal.my_reputation_change,
                        reward_amount: proposal.my_reward_amount,
                      }
                    : undefined
                }
                compact={true}
              />
            </div>
          )}

          {/* Vote Stats */}
          <div className="flex gap-6 mb-4 flex-wrap">
            {proposal.consensus_score != null && (
              <Badge variant="default" className="text-base px-3 py-1">
                Consensus: {proposal.consensus_score.toFixed(1)}/100
              </Badge>
            )}

            {proposal.my_vote_score != null && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-base px-3 py-1">
                  Your Score: {proposal.my_vote_score}/100
                </Badge>
                {proposal.alignment_distance !== undefined && (
                  <Badge
                    variant={proposal.alignment_distance < 10 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {proposal.alignment_distance < 10 ? "High" : "Low"} Alignment
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">{proposal.vote_count} Votes</span>
              {proposal.assigned_reviewer_count != null && (
                <span className="text-xs text-muted-foreground">
                  / {proposal.assigned_reviewer_count} assigned
                </span>
              )}
            </div>
          </div>

          {/* Voting Interface */}
          {isVoting && (
            <div className="border-t border-border pt-4 mt-4">
              <VotingScoreSlider
                applicationId={proposal.id}
                requiredStake={proposal.required_stake}
                onSubmit={onSubmitVote}
                onCancel={onCancelVote}
                isSubmitting={isSubmittingVote}
              />
            </div>
          )}
        </div>

        {!isVoting && (
          <div className="flex gap-2 shrink-0 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/expert/voting/applications/${proposal.id}`)}
            >
              View Details
            </Button>
            {!meetsStakingRequirement ? (
              <Button variant="outline" size="sm" disabled title="Stake minimum VETD to unlock voting">
                Stake Required
              </Button>
            ) : proposal.is_assigned_reviewer && !proposal.has_voted ? (
              <Button size="sm" onClick={onStartVote}>
                Cast Vote
              </Button>
            ) : proposal.has_voted ? (
              <Button variant="outline" size="sm" disabled>
                Already Voted
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled title="Only assigned reviewers can vote">
                Not Assigned
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
