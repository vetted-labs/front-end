"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { proposalsApi, expertApi, blockchainApi } from "@/lib/api";
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
import { StructuredProposalDisplay } from "@/components/StructuredProposalDisplay";
import { VotingScoreSlider } from "@/components/VotingScoreSlider";
import { ProposalFinalizationDisplay } from "@/components/ProposalFinalizationDisplay";
import { ExpertNavbar } from "@/components/ExpertNavbar";

interface ProposalDetail {
  id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_id?: string;
  // Structured fields
  years_of_experience?: number;
  skills_summary?: string;
  experience_summary?: string;
  motivation_statement?: string;
  credibility_evidence?: string;
  achievements?: string[];
  // Legacy field
  proposal_text?: string;
  // Voting data
  guild_id: string;
  guild_name: string;
  required_stake: number;
  status: string;
  created_at: string;
  voting_deadline: string;
  vote_count: number;
  assigned_reviewer_count?: number;
  // Consensus & finalization
  consensus_score?: number;
  finalized: boolean;
  outcome?: "approved" | "rejected";
  finalized_at?: string;
  total_rewards_distributed?: number;
  // My data
  is_assigned_reviewer?: boolean;
  has_voted?: boolean;
  my_vote_score?: number;
  alignment_distance?: number;
  my_reputation_change?: number;
  my_reward_amount?: number;
}

interface VoteHistoryItem {
  id: string;
  expert_id: string;
  expert_name?: string;
  score: number;
  alignment_distance?: number;
  reputation_change?: number;
  reward_amount?: number;
  comment?: string;
  created_at: string;
}

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();

  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [expertData, setExpertData] = useState<any>(null);
  const [stakingStatus, setStakingStatus] = useState<any>(null);
  const [voteHistory, setVoteHistory] = useState<VoteHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoting, setShowVoting] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  const proposalId = params.proposalId as string;

  useEffect(() => {
    if (address) {
      loadExpertData();
      loadStakingStatus();
    }
  }, [address]);

  useEffect(() => {
    if (expertData || !address) {
      loadProposal();
    }
  }, [expertData, proposalId]);

  const loadExpertData = async () => {
    try {
      const response: any = await expertApi.getExpertByWallet(address as string);
      if (response.success) {
        setExpertData(response.data);
      }
    } catch (error) {
      console.error("Error loading expert data:", error);
    }
  };

  const loadStakingStatus = async () => {
    try {
      const response: any = await blockchainApi.getStakeBalance(address as string);
      if (response.success) {
        setStakingStatus(response.data);
      }
    } catch (error) {
      console.error("Error loading staking status:", error);
    }
  };

  const loadProposal = async () => {
    try {
      setLoading(true);

      // Get proposal details with expert context
      const response: any = await proposalsApi.getProposalDetails(
        proposalId,
        expertData?.id
      );
      if (response.success) {
        setProposal(response.data);

        // Get vote history if proposal is finalized
        if (response.data?.finalized) {
          loadVoteHistory();
        }
      } else {
        toast.error(response.error || "Failed to load proposal");
      }
    } catch (error: any) {
      console.error("Error loading proposal:", error);
      toast.error(error.message || "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  };

  const loadVoteHistory = async () => {
    try {
      // This endpoint would return all votes for the proposal
      const response: any = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/proposals/${proposalId}/votes`
      ).then((res) => res.json());

      if (response.success) {
        setVoteHistory(response.data || []);
      }
    } catch (error) {
      console.error("Error loading vote history:", error);
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
      const response: any = await proposalsApi.voteOnProposal(proposalId, {
        expertId: expertData.id,
        score,
        stakeAmount,
        comment,
      });

      if (response.success) {
        toast.success("Score submitted successfully!");
        setShowVoting(false);
        loadProposal(); // Reload to get updated data
      }
    } catch (error: any) {
      console.error("Vote error:", error);
      toast.error(error.message || "Failed to submit score");
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const canVote = (): boolean => {
    if (!proposal || !expertData || !stakingStatus) return false;
    return (
      proposal.is_assigned_reviewer &&
      !proposal.has_voted &&
      !proposal.finalized &&
      stakingStatus.meetsMinimum
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <ExpertNavbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading proposal...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <ExpertNavbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Proposal not found</p>
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <ExpertNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Proposals
          </Button>

          {proposal.is_assigned_reviewer && (
            <Badge variant="default" className="text-base px-4 py-2">
              Assigned Reviewer
            </Badge>
          )}
        </div>

        {/* Staking Warning */}
        {stakingStatus && !stakingStatus.meetsMinimum && proposal.is_assigned_reviewer && (
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Proposal Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">
                      {proposal.candidate_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 text-base">
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {proposal.candidate_email}
                      </span>
                      {proposal.years_of_experience !== undefined &&
                        proposal.years_of_experience > 0 && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {proposal.years_of_experience} years experience
                          </span>
                        )}
                    </CardDescription>
                  </div>

                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {proposal.guild_name}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Structured Proposal Content */}
            <Card>
              <CardHeader>
                <CardTitle>Proposal Details</CardTitle>
              </CardHeader>
              <CardContent>
                <StructuredProposalDisplay proposal={proposal} compact={false} />
              </CardContent>
            </Card>

            {/* Finalization Results */}
            {proposal.finalized && (
              <ProposalFinalizationDisplay
                proposal={proposal}
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
                compact={false}
              />
            )}

            {/* Vote History (if finalized) */}
            {proposal.finalized && voteHistory.length > 0 && (
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
                                {vote.alignment_distance < 10 ? " ✅" : vote.alignment_distance > 20 ? " ❌" : " ⚠️"}
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
                              "{vote.comment}"
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
                    {getTimeRemaining(proposal.voting_deadline)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(proposal.voting_deadline).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Participation</span>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-semibold">
                    {proposal.vote_count} /{" "}
                    {proposal.assigned_reviewer_count || "?"} votes
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {proposal.assigned_reviewer_count
                      ? (
                          (proposal.vote_count / proposal.assigned_reviewer_count) *
                          100
                        ).toFixed(0)
                      : "0"}
                    % participation rate
                  </p>
                </div>

                {proposal.consensus_score !== undefined && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">
                        Current Consensus
                      </span>
                    </div>
                    <p className="text-lg font-semibold">
                      {proposal.consensus_score.toFixed(1)}/100
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Required Stake</p>
                  <p className="text-sm font-medium">
                    {proposal.required_stake} VETD minimum
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Voting Interface */}
            {!proposal.finalized && proposal.is_assigned_reviewer && (
              <Card className={proposal.has_voted ? "border-green-500/50" : ""}>
                <CardHeader>
                  <CardTitle>Your Vote</CardTitle>
                  <CardDescription>
                    {proposal.has_voted
                      ? "You have submitted your score"
                      : "Submit your score for this candidate"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {proposal.has_voted ? (
                    <div className="text-center py-6">
                      <Badge variant="default" className="text-lg px-6 py-2 mb-2">
                        Score: {proposal.my_vote_score}/100
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        Your vote has been recorded. Results will be available after the
                        voting deadline.
                      </p>
                    </div>
                  ) : showVoting ? (
                    <VotingScoreSlider
                      proposalId={proposal.id}
                      requiredStake={proposal.required_stake}
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
                        ? "🔒 Stake Required"
                        : "Cast Your Vote"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Proposal Info */}
            <Card>
              <CardHeader>
                <CardTitle>Proposal Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(proposal.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">{proposal.status}</Badge>
                </div>
                {proposal.finalized && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Finalized</span>
                      <span className="font-medium">
                        {new Date(proposal.finalized_at!).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Outcome</span>
                      <Badge
                        variant={
                          proposal.outcome === "approved" ? "default" : "destructive"
                        }
                      >
                        {proposal.outcome}
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
