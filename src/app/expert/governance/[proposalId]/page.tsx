"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { governanceApi, blockchainApi } from "@/lib/api";
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
  User,
  Settings,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { ExpertNavbar } from "@/components/ExpertNavbar";
import { GovernanceVoteForm } from "@/components/governance/GovernanceVoteForm";
import { GovernanceResultsBanner } from "@/components/governance/GovernanceResultsBanner";
import { VotingPowerBar } from "@/components/governance/VotingPowerBar";

interface GovernanceProposalDetail {
  id: string;
  title: string;
  description: string;
  proposal_type: string;
  status: string;
  proposer_wallet: string;
  proposer_name?: string;
  guild_id?: string;
  guild_name?: string;
  stake_amount: number;
  voting_deadline: string;
  created_at: string;
  // Parameter change
  parameter_name?: string;
  current_value?: string;
  proposed_value?: string;
  // Election
  nominee_wallet?: string;
  nominee_name?: string;
  // Voting data
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  total_voting_power: number;
  quorum_required: number;
  voter_count: number;
  // Results
  finalized: boolean;
  outcome?: "passed" | "rejected";
  approval_percent?: number;
  quorum_reached?: boolean;
  // User state
  has_voted?: boolean;
  my_vote?: string;
  // Vote history
  votes?: Array<{
    id: string;
    voter_wallet: string;
    voter_name?: string;
    vote: "for" | "against" | "abstain";
    voting_power: number;
    reason?: string;
    created_at: string;
  }>;
}

function getTimeRemaining(deadline: string) {
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
}

const typeLabels: Record<string, string> = {
  parameter_change: "Parameter Change",
  guild_master_election: "Guild Master Election",
  guild_creation: "Guild Creation",
  general: "General Proposal",
};

export default function GovernanceProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();

  const [proposal, setProposal] = useState<GovernanceProposalDetail | null>(null);
  const [votingPower, setVotingPower] = useState(0);
  const [loading, setLoading] = useState(true);

  const proposalId = params.proposalId as string;

  useEffect(() => {
    loadProposal();
    if (address) loadVotingPower();
  }, [proposalId, address]);

  const loadProposal = async () => {
    try {
      setLoading(true);
      const response: any = await governanceApi.getProposal(proposalId);
      if (response.success) {
        setProposal(response.data);
      } else {
        toast.error("Failed to load proposal");
      }
    } catch (error: any) {
      console.error("Error loading proposal:", error);
      toast.error("Failed to load proposal");
    } finally {
      setLoading(false);
    }
  };

  const loadVotingPower = async () => {
    try {
      const response: any = await blockchainApi.getStakeBalance(address as string);
      if (response.success) {
        setVotingPower(parseFloat(response.data?.stakedAmount || "0"));
      }
    } catch (error) {
      console.error("Error loading voting power:", error);
    }
  };

  const handleVote = async (vote: "for" | "against" | "abstain", reason: string) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }
    try {
      const response: any = await governanceApi.vote(
        proposalId,
        { vote, reason },
        address
      );
      if (response.success) {
        toast.success("Vote submitted successfully!");
        loadProposal();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit vote");
    }
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

  const totalVotes = proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
  const forPercent = totalVotes > 0 ? (proposal.votes_for / totalVotes) * 100 : 0;
  const againstPercent = totalVotes > 0 ? (proposal.votes_against / totalVotes) * 100 : 0;
  const abstainPercent = totalVotes > 0 ? (proposal.votes_abstain / totalVotes) * 100 : 0;
  const quorumPercent = proposal.quorum_required > 0
    ? (proposal.total_voting_power / proposal.quorum_required) * 100
    : 0;
  const canVote = proposal.status === "active" && !proposal.has_voted && !!address;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <ExpertNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Governance
        </Button>

        {/* Finalized Results */}
        {proposal.finalized && proposal.outcome && (
          <div className="mb-6">
            <GovernanceResultsBanner
              outcome={proposal.outcome}
              approvalPercent={proposal.approval_percent || forPercent}
              quorumReached={proposal.quorum_reached ?? quorumPercent >= 100}
              voterCount={proposal.voter_count}
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
                      {proposal.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">
                        {typeLabels[proposal.proposal_type] || proposal.proposal_type}
                      </Badge>
                      <Badge variant={proposal.status === "active" ? "default" : "secondary"}>
                        {proposal.status}
                      </Badge>
                      {proposal.guild_name && (
                        <Badge variant="secondary">{proposal.guild_name}</Badge>
                      )}
                    </div>
                    <CardDescription className="text-base">
                      {proposal.description}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3 border-t border-border">
                  <User className="w-4 h-4" />
                  <span>
                    Proposed by {proposal.proposer_name || `${proposal.proposer_wallet?.slice(0, 6)}...${proposal.proposer_wallet?.slice(-4)}`}
                  </span>
                  <span className="mx-2">|</span>
                  <span>Stake: {proposal.stake_amount} VETD</span>
                </div>
              </CardHeader>
            </Card>

            {/* Type-specific details */}
            {proposal.proposal_type === "parameter_change" && proposal.parameter_name && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Parameter Change
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Parameter</p>
                      <p className="font-medium">{proposal.parameter_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Value</p>
                      <p className="font-medium text-red-500">{proposal.current_value}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Proposed Value</p>
                      <p className="font-medium text-green-500">{proposal.proposed_value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {proposal.proposal_type === "guild_master_election" && proposal.nominee_wallet && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    Nominee
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                      <Crown className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {proposal.nominee_name || "Nominee"}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {proposal.nominee_wallet}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vote History */}
            {proposal.votes && proposal.votes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Vote History</CardTitle>
                  <CardDescription>
                    {proposal.votes.length} vote{proposal.votes.length !== 1 ? "s" : ""} cast
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {proposal.votes.map((v) => (
                      <Card key={v.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {v.voter_name || `${v.voter_wallet.slice(0, 6)}...${v.voter_wallet.slice(-4)}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  v.vote === "for"
                                    ? "default"
                                    : v.vote === "against"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {v.vote}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {v.voting_power.toLocaleString()} VETD
                              </span>
                            </div>
                          </div>
                          {v.reason && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              &quot;{v.reason}&quot;
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
            {/* Voting Status */}
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
                  <span className="text-sm text-muted-foreground">Quorum Progress</span>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{proposal.total_voting_power.toLocaleString()} VETD</span>
                      <span>{proposal.quorum_required.toLocaleString()} VETD required</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full transition-all ${quorumPercent >= 100 ? "bg-green-500" : "bg-primary"}`}
                        style={{ width: `${Math.min(quorumPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground mb-2 block">
                    Vote Breakdown
                  </span>
                  <VotingPowerBar
                    forPercent={forPercent}
                    againstPercent={againstPercent}
                    abstainPercent={abstainPercent}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    <Users className="w-4 h-4 inline mr-1" />
                    Voters
                  </span>
                  <span className="text-sm font-medium">{proposal.voter_count}</span>
                </div>
              </CardContent>
            </Card>

            {/* Vote Form */}
            {canVote && (
              <GovernanceVoteForm
                votingPower={votingPower}
                onSubmit={handleVote}
              />
            )}

            {/* Already Voted */}
            {proposal.has_voted && (
              <Card className="border-green-500/50">
                <CardContent className="p-6 text-center">
                  <Badge variant="default" className="text-lg px-6 py-2 mb-2">
                    Voted: {proposal.my_vote}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Your vote has been recorded.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Proposal Info */}
            <Card>
              <CardHeader>
                <CardTitle>Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(proposal.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">
                    {typeLabels[proposal.proposal_type] || proposal.proposal_type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min Stake</span>
                  <span className="font-medium">{proposal.stake_amount} VETD</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
