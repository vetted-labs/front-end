"use client";

import { VotingScoreSlider } from "@/components/VotingScoreSlider";
import { CommitmentForm } from "@/components/CommitmentForm";
import { RevealForm } from "@/components/RevealForm";
import { CommitRevealStatusCard } from "@/components/CommitRevealStatusCard";
import { Button } from "@/components/ui/button";
import type { GuildApplication } from "@/types";
import type { CommitRevealPhase } from "@/lib/hooks/useVotingApplicationData";

interface VotingInterfaceProps {
  application: GuildApplication;
  crPhase: CommitRevealPhase | null;
  expertId: string | undefined;
  hasVoted: boolean;
  meetsMinimumStake: boolean;
  showVoting: boolean;
  isSubmittingVote: boolean;
  onToggleVoting: (show: boolean) => void;
  onVote: (score: number, stakeAmount: number, comment: string) => Promise<void>;
  onCommitOrReveal: () => void;
}

export function VotingInterface({
  application,
  crPhase,
  expertId,
  hasVoted,
  meetsMinimumStake,
  showVoting,
  isSubmittingVote,
  onToggleVoting,
  onVote,
  onCommitOrReveal,
}: VotingInterfaceProps) {
  return (
    <div className="lg:col-span-4 order-first lg:order-last">
      <div className="lg:sticky lg:top-24 space-y-6">
        {/* Direct voting */}
        {(!crPhase || crPhase.phase === "direct") && (
          <div className="bg-card border border-border border-t-2 border-t-primary rounded-xl p-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Your Vote
            </h3>
            {hasVoted ? (
              <div className="text-center py-6">
                <p className="text-2xl font-bold tabular-nums mb-2">
                  {application.my_vote_score}/100
                </p>
                <p className="text-sm text-muted-foreground">
                  Your vote has been recorded. Results will be available after
                  the voting deadline.
                </p>
              </div>
            ) : showVoting ? (
              <VotingScoreSlider
                applicationId={application.id}
                requiredStake={application.required_stake}
                onSubmit={onVote}
                onCancel={() => onToggleVoting(false)}
                isSubmitting={isSubmittingVote}
              />
            ) : (
              <Button
                onClick={() => onToggleVoting(true)}
                disabled={!meetsMinimumStake}
                className="w-full"
                size="lg"
              >
                {!meetsMinimumStake ? "Stake Required" : "Cast Your Vote"}
              </Button>
            )}
          </div>
        )}

        {/* Commit phase */}
        {crPhase?.phase === "commit" &&
          !crPhase.userCommitted &&
          expertId && (
            <div className="bg-card border border-border border-t-2 border-t-primary rounded-xl p-6">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Submit Commitment
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your score is hidden until the reveal phase.
              </p>
              <CommitmentForm
                applicationId={application.id}
                expertId={expertId}
                requiredStake={application.required_stake}
                onSubmit={onCommitOrReveal}
                onCancel={() => {}}
              />
            </div>
          )}

        {/* Reveal phase */}
        {crPhase?.phase === "reveal" &&
          crPhase.userCommitted &&
          !crPhase.userRevealed &&
          expertId && (
            <div className="bg-card border border-border border-t-2 border-t-primary rounded-xl p-6">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Reveal Your Vote
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enter the score and nonce from your commitment to reveal your
                vote.
              </p>
              <RevealForm
                applicationId={application.id}
                expertId={expertId}
                onSubmit={onCommitOrReveal}
                onCancel={() => {}}
              />
            </div>
          )}

        {/* CR status */}
        {crPhase && crPhase.phase !== "direct" && (
          <div className="bg-card border border-border rounded-xl p-6">
            <CommitRevealStatusCard
              phase={crPhase.phase}
              deadline={
                crPhase.phase === "commit"
                  ? crPhase.commitDeadline
                  : crPhase.revealDeadline
              }
              userStatus={
                crPhase.userRevealed
                  ? "revealed"
                  : crPhase.userCommitted
                    ? "committed"
                    : "pending"
              }
              commitCount={crPhase.commitCount || 0}
              revealCount={crPhase.revealCount || 0}
              totalExpected={
                crPhase.totalExpected ||
                application.assigned_reviewer_count ||
                0
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
