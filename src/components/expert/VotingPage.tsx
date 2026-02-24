"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ThumbsUp,
  ThumbsDown,
  Clock,
  Users,
  Loader2,
  Plus,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { StructuredProposalForm, StructuredProposalData } from "@/components/StructuredProposalForm";
import { StructuredProposalDisplay } from "@/components/StructuredProposalDisplay";
import { VotingScoreSlider } from "@/components/VotingScoreSlider";
import { ProposalFinalizationDisplay } from "@/components/ProposalFinalizationDisplay";
import { useGuilds } from "@/lib/hooks/useGuilds";

interface Proposal {
  id: string;
  candidate_name: string;
  candidate_email: string;
  // Legacy field
  proposal_text?: string;
  // New structured fields
  years_of_experience?: number;
  skills_summary?: string;
  experience_summary?: string;
  motivation_statement?: string;
  credibility_evidence?: string;
  achievements?: string[];
  // Voting data
  required_stake: number;
  status: string;
  created_at: string;
  voting_deadline: string;
  total_stake_for: number;
  total_stake_against: number;
  vote_count: number;
  votes_for_count: number;
  votes_against_count: number;
  guild_name: string;
  // Reviewer assignment
  is_assigned_reviewer?: boolean;
  has_voted?: boolean;
  assigned_reviewer_count?: number;
  // Schelling point consensus
  consensus_score?: number;
  my_vote_score?: number;
  alignment_distance?: number;
  // Commit-reveal
  voting_phase?: string;
  // Finalization
  finalized: boolean;
  outcome?: "approved" | "rejected";
  my_reputation_change?: number;
  my_reward_amount?: number;
}

export default function VotingPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { guilds: guildRecords } = useGuilds();
  const [expertData, setExpertData] = useState<any>(null);
  const [stakingStatus, setStakingStatus] = useState<any>(null);
  const [selectedGuild, setSelectedGuild] = useState<{ id: string; name: string } | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterMode, setFilterMode] = useState<"assigned" | "all">("assigned");

  // Remove old simple form state (now handled by StructuredProposalForm)

  // Auto-select first guild once loaded
  useEffect(() => {
    if (guildRecords.length > 0 && !selectedGuild) {
      setSelectedGuild(guildRecords[0]);
    }
  }, [guildRecords, selectedGuild]);

  useEffect(() => {
    if (address) {
      loadExpertData();
      loadStakingStatus();
    }
  }, [address]);

  useEffect(() => {
    if (selectedGuild) loadProposals();
  }, [selectedGuild, filterMode, expertData]);

  const loadExpertData = async () => {
    try {
      const response = await expertApi.getProfile(address as string);
      setExpertData(response);
    } catch (error) {
      console.error("Error loading expert data:", error);
    }
  };

  const loadStakingStatus = async () => {
    try {
      const response = await blockchainApi.getStakeBalance(address as string);
      setStakingStatus(response);
    } catch {
      // Endpoint may not be available yet — staking check is non-blocking
    }
  };

  const loadProposals = async () => {
    if (!selectedGuild) return;
    try {
      setLoading(true);

      // If assigned filter is active and we have expertData, fetch assigned proposals
      if (filterMode === "assigned" && expertData?.id) {
        const response = await proposalsApi.getAssignedProposals(expertData.id, selectedGuild.id);
        setProposals(response);
      } else {
        // Fetch all proposals for the guild
        const response = await proposalsApi.getGuildProposals(selectedGuild.id, "ongoing");
        setProposals(response);
      }
    } catch (error: any) {
      console.error("Error loading proposals:", error);
      toast.error(error.message || "Failed to load proposals");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId: string, score: number, stakeAmount: number, comment: string) => {
    if (!expertData) {
      toast.error("Expert data not loaded");
      return;
    }

    // Check staking requirement
    if (!stakingStatus?.meetsMinimum) {
      toast.error("You must stake the minimum VETD amount to vote");
      return;
    }

    try {
      setIsSubmittingVote(true);
      await proposalsApi.voteOnProposal(proposalId, {
        expertId: expertData.id,
        score, // New: numeric score instead of vote
        stakeAmount,
        comment,
      });

      toast.success("Score submitted successfully!");
      setVoting(null);
      loadProposals();
    } catch (error: any) {
      console.error("Vote error:", error);
      toast.error(error.message || "Failed to submit score");
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const meetsStakingRequirement = (): boolean => {
    return stakingStatus?.meetsMinimum || false;
  };

  const handleCreateProposal = async (data: StructuredProposalData) => {
    if (!selectedGuild) return;
    try {
      await proposalsApi.createProposal({
        guildId: selectedGuild.id,
        candidateName: data.candidateName,
        candidateEmail: data.candidateEmail,
        yearsOfExperience: data.yearsOfExperience,
        skillsSummary: data.skillsSummary,
        experienceSummary: data.experienceSummary,
        motivationStatement: data.motivationStatement,
        credibilityEvidence: data.credibilityEvidence,
        achievements: data.achievements,
        requiredStake: data.requiredStake,
        votingDurationDays: data.votingDurationDays,
      });

      toast.success("Proposal created successfully!");
      setShowCreateForm(false);
      loadProposals();
    } catch (error: any) {
      console.error("Create proposal error:", error);
      toast.error(error.message || "Failed to create proposal");
    }
  };

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return "Expired";
  };

  return (
    <div className="min-h-full">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Candidate Proposals & Voting</h1>
          <p className="text-muted-foreground mb-6">
            Vote on candidate proposals for your guild. Stake VETD tokens to support candidates.
          </p>

          {/* Staking Status Warning */}
          {stakingStatus && !stakingStatus.meetsMinimum && (
            <Card className="mb-4 border-amber-500/50 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1">
                      Staking Required to Vote
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You must stake at least {stakingStatus.minimumRequired || "?"} VETD to participate in voting.
                      Current stake: {stakingStatus.stakedAmount || "0"} VETD.
                    </p>
                  </div>
                  <Button variant="default" size="sm">
                    Stake VETD
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-4 justify-between">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Select Guild:</label>
                <Select
                  value={selectedGuild?.id ?? ""}
                  onValueChange={(value) => {
                    const guild = guildRecords.find((g) => g.id === value);
                    if (guild) setSelectedGuild(guild);
                  }}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select a guild" />
                  </SelectTrigger>
                  <SelectContent>
                    {guildRecords.map((guild) => (
                      <SelectItem key={guild.id} value={guild.id}>
                        {guild.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Proposal
              </Button>
            </div>

            {/* Filter Tabs */}
            {expertData && (
              <div className="flex items-center gap-2">
                <Button
                  variant={filterMode === "assigned" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterMode("assigned")}
                >
                  Assigned to Me
                </Button>
                <Button
                  variant={filterMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterMode("all")}
                >
                  All Proposals
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Create Proposal Form */}
        {showCreateForm && selectedGuild && (
          <div className="mb-8">
            <StructuredProposalForm
              guildId={selectedGuild.id}
              guildName={selectedGuild.name}
              onSubmit={handleCreateProposal}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* Proposals List */}
        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading proposals...</p>
            </CardContent>
          </Card>
        ) : proposals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No active proposals in this guild</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <Card key={proposal.id} className="border-border hover:border-primary/50 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3
                          className="text-lg font-semibold hover:text-primary cursor-pointer"
                          onClick={() => router.push(`/expert/voting/proposals/${proposal.id}`)}
                        >
                          {proposal.candidate_name}
                        </h3>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          <Clock className="w-3 h-3 mr-1" />
                          {getTimeRemaining(proposal.voting_deadline)}
                        </Badge>
                        {proposal.is_assigned_reviewer && (
                          <Badge variant="default" className="bg-primary">
                            Assigned Reviewer
                          </Badge>
                        )}
                        {proposal.has_voted && (
                          <Badge variant="secondary">
                            Already Voted
                          </Badge>
                        )}
                        {proposal.voting_phase && proposal.voting_phase !== "direct" && (
                          <Badge variant="outline" className="border-orange-500/30 text-orange-500">
                            {proposal.voting_phase}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{proposal.candidate_email}</p>

                      <div className="mb-4">
                        <StructuredProposalDisplay proposal={proposal} compact={true} />
                      </div>

                      {/* Finalization Results */}
                      {proposal.finalized && (
                        <div className="mb-4">
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
                            compact={true}
                          />
                        </div>
                      )}

                      {/* Vote Stats */}
                      <div className="flex gap-6 mb-4 flex-wrap">
                        {/* Consensus Score (if available) */}
                        {proposal.consensus_score !== undefined && proposal.consensus_score !== null && (
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-base px-3 py-1">
                              Consensus: {proposal.consensus_score.toFixed(1)}/100
                            </Badge>
                          </div>
                        )}

                        {/* My Vote Score (if I voted) */}
                        {proposal.my_vote_score !== undefined && proposal.my_vote_score !== null && (
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
                          <ThumbsUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium">{proposal.votes_for_count} For</span>
                          <span className="text-xs text-muted-foreground">
                            ({parseFloat(proposal.total_stake_for?.toString() || "0").toFixed(2)} VETD)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <ThumbsDown className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium">{proposal.votes_against_count} Against</span>
                          <span className="text-xs text-muted-foreground">
                            ({parseFloat(proposal.total_stake_against?.toString() || "0").toFixed(2)} VETD)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">{proposal.vote_count} Votes</span>
                          {proposal.assigned_reviewer_count && (
                            <span className="text-xs text-muted-foreground">
                              / {proposal.assigned_reviewer_count} assigned
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Voting Interface */}
                      {voting === proposal.id && (
                        <div className="border-t border-border pt-4 mt-4">
                          <VotingScoreSlider
                            proposalId={proposal.id}
                            requiredStake={proposal.required_stake}
                            onSubmit={(score, stakeAmount, comment) =>
                              handleVote(proposal.id, score, stakeAmount, comment)
                            }
                            onCancel={() => setVoting(null)}
                            isSubmitting={isSubmittingVote}
                          />
                        </div>
                      )}
                    </div>

                    {voting !== proposal.id && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/expert/voting/proposals/${proposal.id}`)}
                        >
                          View Details
                        </Button>
                        {!meetsStakingRequirement() ? (
                          <Button variant="outline" disabled title="Stake minimum VETD to unlock voting">
                            🔒 Stake Required
                          </Button>
                        ) : proposal.is_assigned_reviewer && !proposal.has_voted ? (
                          <Button onClick={() => setVoting(proposal.id)}>
                            Cast Vote
                          </Button>
                        ) : proposal.has_voted ? (
                          <Button variant="outline" disabled>
                            Already Voted
                          </Button>
                        ) : (
                          <Button variant="outline" disabled title="Only assigned reviewers can vote">
                            Not Assigned
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
