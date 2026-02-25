"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { guildApplicationsApi, expertApi, blockchainApi, commitRevealApi } from "@/lib/api";
import { formatDeadline } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  Users,
  Loader2,
  AlertCircle,
  Calendar,
  Mail,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { StructuredApplicationDisplay } from "@/components/StructuredApplicationDisplay";
import { VotingScoreSlider } from "@/components/VotingScoreSlider";
import { ApplicationFinalizationDisplay } from "@/components/ApplicationFinalizationDisplay";
import { CommitRevealPhaseIndicator } from "@/components/CommitRevealPhaseIndicator";
import { CommitmentForm } from "@/components/CommitmentForm";
import { RevealForm } from "@/components/RevealForm";
import { CommitRevealStatusCard } from "@/components/CommitRevealStatusCard";
import type { GuildApplication, VoteHistoryItem, ExpertProfile } from "@/types";

interface StakingStatus {
  meetsMinimum: boolean;
  minimumRequired?: string;
  stakedAmount?: string;
}

type CommitRevealPhaseType = "direct" | "commit" | "reveal" | "finalized";

interface CommitRevealPhase {
  phase: CommitRevealPhaseType;
  commitDeadline?: string;
  revealDeadline?: string;
  commitCount?: number;
  revealCount?: number;
  totalExpected?: number;
  userCommitted?: boolean;
  userRevealed?: boolean;
}

interface VotingApplicationPageProps {
  applicationId: string;
}

export default function VotingApplicationPage({ applicationId }: VotingApplicationPageProps) {
  const router = useRouter();
  const { address } = useAccount();

  const [application, setApplication] = useState<GuildApplication | null>(null);
  const [expertData, setExpertData] = useState<ExpertProfile | null>(null);
  const [stakingStatus, setStakingStatus] = useState<StakingStatus | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoting, setShowVoting] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [crPhase, setCrPhase] = useState<CommitRevealPhase | null>(null);

  useEffect(() => {
    if (address) {
      loadExpertData();
      loadStakingStatus();
    }
    loadPhaseStatus();
  }, [address]);

  useEffect(() => {
    if (expertData || !address) {
      loadApplication();
    }
  }, [expertData, applicationId]);

  const loadExpertData = async () => {
    try {
      const response = await expertApi.getProfile(address as string);
      setExpertData(response as ExpertProfile);
    } catch (error) {
      console.error("Error loading expert data:", error);
      toast.error("Failed to load expert profile");
    }
  };

  const loadStakingStatus = async () => {
    try {
      const response = await blockchainApi.getStakeBalance(address as string);
      setStakingStatus(response as unknown as StakingStatus);
    } catch (error) {
      console.error("Error loading staking status:", error);
      toast.error("Failed to load staking status");
    }
  };

  const loadPhaseStatus = async () => {
    try {
      const response = await commitRevealApi.getPhaseStatus(applicationId);
      setCrPhase(response as unknown as CommitRevealPhase);
    } catch {
      // Not a commit-reveal proposal, or endpoint not available
    }
  };

  const loadApplication = async () => {
    try {
      setLoading(true);

      // Get proposal details with expert context
      const response = await guildApplicationsApi.getDetails(
        applicationId,
        expertData?.id
      );
      setApplication(response as GuildApplication);

      // Get vote history if proposal is finalized
      if ((response as GuildApplication)?.finalized) {
        loadVoteHistory();
      }
    } catch (error: unknown) {
      console.error("Error loading application:", error);
      const message = error instanceof Error ? error.message : "Failed to load application";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const loadVoteHistory = async () => {
    try {
      const response = await guildApplicationsApi.getVotes(applicationId);
      setVoteHistory((response as VoteHistoryItem[]) || []);
    } catch {
      // Vote history may not be available yet
    }
  };

  const handleVote = async (score: number, stakeAmount: number, comment: string) => {
    if (!expertData) {
      toast.error("Expert data not loaded");
      return;
    }

    if (!stakingStatus?.meetsMinimum) {
      toast.error("You must stake the minimum VETD amount to vote");
      return;
    }

    try {
      setIsSubmittingVote(true);
      await guildApplicationsApi.vote(applicationId, {
        expertId: expertData.id,
        score,
        stakeAmount,
        comment,
      });

      toast.success("Score submitted successfully!");
      setShowVoting(false);
      loadApplication(); // Reload to get updated data
    } catch (error: unknown) {
      console.error("Vote error:", error);
      const message = error instanceof Error ? error.message : "Failed to submit score";
      toast.error(message);
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const canVote = (): boolean => {
    if (!application || !expertData || !stakingStatus) return false;
    return (
      !!application.is_assigned_reviewer &&
      !application.has_voted &&
      !application.finalized &&
      stakingStatus.meetsMinimum
    );
  };

  if (loading) {
    return null;
  }

  if (!application) {
    return (
      <div className="min-h-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Application not found</p>
              <Button onClick={() => router.back()} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Applications
          </Button>

          {application.is_assigned_reviewer && (
            <Badge variant="default" className="text-base px-4 py-2">
              Assigned Reviewer
            </Badge>
          )}
        </div>

        {/* Staking Warning */}
        {stakingStatus && !stakingStatus.meetsMinimum && application.is_assigned_reviewer && (
          <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">
                    Staking Required to Vote
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You must stake at least {stakingStatus.minimumRequired || "?"} VETD to submit
                    your score. Current stake: {stakingStatus.stakedAmount || "0"} VETD.
                  </p>
                </div>
                <Button variant="default" size="sm">
                  Stake VETD
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commit-Reveal Phase Indicator */}
        {crPhase && crPhase.phase !== "direct" && (
          <div className="mb-6">
            <CommitRevealPhaseIndicator
              currentPhase={crPhase.phase}
              commitDeadline={crPhase.commitDeadline}
              revealDeadline={crPhase.revealDeadline}
              commitCount={crPhase.commitCount}
              revealCount={crPhase.revealCount}
              totalExpected={crPhase.totalExpected || application?.assigned_reviewer_count}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Proposal Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">
                      {application.candidate_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 text-base">
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {application.candidate_email}
                      </span>
                      {application.years_of_experience !== undefined &&
                        application.years_of_experience > 0 && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {application.years_of_experience} years experience
                          </span>
                        )}
                    </CardDescription>
                  </div>

                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {application.guild_name}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Structured Proposal Content */}
            <Card>
              <CardHeader>
                <CardTitle>Application Details</CardTitle>
              </CardHeader>
              <CardContent>
                <StructuredApplicationDisplay application={application} compact={false} />
              </CardContent>
            </Card>

            {/* Finalization Results */}
            {application.finalized && (
              <ApplicationFinalizationDisplay
                application={application}
                myVote={
                  application.my_vote_score !== undefined
                    ? {
                        score: application.my_vote_score,
                        alignment_distance: application.alignment_distance,
                        reputation_change: application.my_reputation_change,
                        reward_amount: application.my_reward_amount,
                      }
                    : undefined
                }
                compact={false}
              />
            )}

            {/* Vote History (if finalized) */}
            {application.finalized && voteHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Voting History</CardTitle>
                  <CardDescription>
                    All reviewer scores and alignment results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {voteHistory.map((vote) => (
                      <Card key={vote.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                Reviewer {vote.expert_name || vote.expert_id.slice(0, 8)}
                              </span>
                            </div>
                            <Badge variant="secondary">Score: {vote.score}/100</Badge>
                          </div>

                          {vote.alignment_distance !== undefined && (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>
                                Alignment: {vote.alignment_distance.toFixed(1)}
                                {vote.alignment_distance < 10 ? " \u2705" : vote.alignment_distance > 20 ? " \u274C" : " \u26A0\uFE0F"}
                              </span>
                              {vote.reputation_change !== undefined && (
                                <span>
                                  Rep: {vote.reputation_change > 0 ? "+" : ""}
                                  {vote.reputation_change}
                                </span>
                              )}
                              {vote.reward_amount !== undefined && vote.reward_amount > 0 && (
                                <span>Reward: {vote.reward_amount.toFixed(2)} VETD</span>
                              )}
                            </div>
                          )}

                          {vote.comment && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              &quot;{vote.comment}&quot;
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Voting Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Voting Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Deadline</span>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-semibold">
                    {formatDeadline(application.voting_deadline)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(application.voting_deadline).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Participation</span>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-semibold">
                    {application.vote_count} /{" "}
                    {application.assigned_reviewer_count || "?"} votes
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {application.assigned_reviewer_count
                      ? (
                          (application.vote_count / application.assigned_reviewer_count) *
                          100
                        ).toFixed(0)
                      : "0"}
                    % participation rate
                  </p>
                </div>

                {application.consensus_score !== undefined && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">
                        Current Consensus
                      </span>
                    </div>
                    <p className="text-lg font-semibold">
                      {application.consensus_score.toFixed(1)}/100
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Required Stake</p>
                  <p className="text-sm font-medium">
                    {application.required_stake} VETD minimum
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Voting Interface */}
            {!application.finalized && application.is_assigned_reviewer && (
              <>
                {/* Direct voting (no commit-reveal or direct phase) */}
                {(!crPhase || crPhase.phase === "direct") && (
                  <Card className={application.has_voted ? "border-green-500/50" : ""}>
                    <CardHeader>
                      <CardTitle>Your Vote</CardTitle>
                      <CardDescription>
                        {application.has_voted
                          ? "You have submitted your score"
                          : "Submit your score for this candidate"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {application.has_voted ? (
                        <div className="text-center py-6">
                          <Badge variant="default" className="text-lg px-6 py-2 mb-2">
                            Score: {application.my_vote_score}/100
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            Your vote has been recorded. Results will be available after the
                            voting deadline.
                          </p>
                        </div>
                      ) : showVoting ? (
                        <VotingScoreSlider
                          applicationId={application.id}
                          requiredStake={application.required_stake}
                          onSubmit={handleVote}
                          onCancel={() => setShowVoting(false)}
                          isSubmitting={isSubmittingVote}
                        />
                      ) : (
                        <Button
                          onClick={() => setShowVoting(true)}
                          disabled={!canVote()}
                          className="w-full"
                          size="lg"
                        >
                          {!stakingStatus?.meetsMinimum
                            ? "Stake Required"
                            : "Cast Your Vote"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Commit phase */}
                {crPhase?.phase === "commit" && !crPhase.userCommitted && expertData && (
                  <CommitmentForm
                    applicationId={application.id}
                    expertId={expertData.id}
                    requiredStake={application.required_stake}
                    onSubmit={() => { loadPhaseStatus(); loadApplication(); }}
                    onCancel={() => {}}
                  />
                )}

                {/* Reveal phase */}
                {crPhase?.phase === "reveal" && crPhase.userCommitted && !crPhase.userRevealed && expertData && (
                  <RevealForm
                    applicationId={application.id}
                    expertId={expertData.id}
                    onSubmit={() => { loadPhaseStatus(); loadApplication(); }}
                    onCancel={() => {}}
                  />
                )}

                {/* Commit-Reveal Status Card */}
                {crPhase && crPhase.phase !== "direct" && (
                  <CommitRevealStatusCard
                    phase={crPhase.phase}
                    deadline={crPhase.phase === "commit" ? crPhase.commitDeadline : crPhase.revealDeadline}
                    userStatus={
                      crPhase.userRevealed
                        ? "revealed"
                        : crPhase.userCommitted
                        ? "committed"
                        : "pending"
                    }
                    commitCount={crPhase.commitCount || 0}
                    revealCount={crPhase.revealCount || 0}
                    totalExpected={crPhase.totalExpected || application.assigned_reviewer_count || 0}
                  />
                )}
              </>
            )}

            {/* Proposal Info */}
            <Card>
              <CardHeader>
                <CardTitle>Application Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(application.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">{application.status}</Badge>
                </div>
                {application.finalized && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Finalized</span>
                      <span className="font-medium">
                        {new Date(application.finalized_at!).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Outcome</span>
                      <Badge
                        variant={
                          application.outcome === "approved" ? "default" : "destructive"
                        }
                      >
                        {application.outcome}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
