"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  ThumbsUp,
  ThumbsDown,
  Coins,
  AlertCircle,
  Loader2,
  FileText,
  Calendar,
  Mail,
  User,
} from "lucide-react";
import { guildApplicationsApi, expertApi } from "@/lib/api";
import { formatDeadline } from "@/lib/utils";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/loadingstate";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  GuildApplicationDetail,
  GuildApplicationVote,
  ExpertProfile,
} from "@/types";

interface ApplicationDetailPageProps {
  guildId: string;
  applicationId: string;
}

export default function ApplicationDetailPage({ guildId, applicationId }: ApplicationDetailPageProps) {
  const router = useRouter();
  const { address } = useAccount();
  const [application, setApplication] = useState<GuildApplicationDetail | null>(null);
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [voteType, setVoteType] = useState<"for" | "against" | "abstain">("for");
  const [stakeAmount, setStakeAmount] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (applicationId && address) {
      fetchApplicationDetails();
      fetchExpertProfile();
    }
  }, [applicationId, address]);

  const fetchApplicationDetails = async () => {
    if (!applicationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await guildApplicationsApi.getDetails(applicationId);

      setApplication(result as unknown as GuildApplicationDetail);
    } catch (err) {
      console.error("Error fetching application details:", err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExpertProfile = async () => {
    if (!address) return;

    try {
      const result = await expertApi.getProfile(address);
      setExpertProfile(result as ExpertProfile);
    } catch (err) {
      console.error("Error fetching expert profile:", err);
    }
  };

  const handleVoteSubmit = async () => {
    if (!address || !expertProfile || !application) return;

    setIsSubmitting(true);

    try {
      await guildApplicationsApi.vote(application.id, {
        expertId: expertProfile.id,
        vote: voteType,
        stakeAmount: parseFloat(stakeAmount),
        comment: comment || undefined,
      });

      // Refresh application details
      await fetchApplicationDetails();

      setShowVoteModal(false);
      setStakeAmount("");
      setComment("");
      toast.success("Vote submitted successfully!");
    } catch (err) {
      console.error("Error submitting vote:", err);
      toast.error("Failed to submit vote. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ongoing":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-full">
            <Clock className="w-4 h-4" />
            Ongoing
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300 text-sm font-semibold rounded-full">
            <CheckCircle className="w-4 h-4" />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-sm font-semibold rounded-full">
            <XCircle className="w-4 h-4" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-500/10 border border-gray-500/20 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-full">
            <Clock className="w-4 h-4" />
            Pending
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full">
        <LoadingState message="Loading application details..." />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <Alert variant="error">{error || "Application not found"}</Alert>
        </div>
      </div>
    );
  }

  const votesFor = application.votes.filter((v) => v.vote === "for").length;
  const votesAgainst = application.votes.filter((v) => v.vote === "against").length;
  const totalVotes = application.votes.length;
  const expertHasVoted = application.votes.some((v) => v.expertWallet.toLowerCase() === address?.toLowerCase());
  const expertVote = application.votes.find((v) => v.expertWallet.toLowerCase() === address?.toLowerCase());

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/expert/guild/${guildId}`)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Guild
        </button>

        {/* Application Header */}
        <div className="bg-card rounded-2xl p-8 border border-border shadow-lg mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Guild Application: {application.candidateName}
              </h1>
              <p className="text-muted-foreground">{application.guildName}</p>
            </div>
            {getStatusBadge(application.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatDeadline(application.votingDeadline, "Voting ended")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Votes</p>
                <p className="text-sm font-semibold text-foreground">{totalVotes}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Coins className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Required Stake</p>
                <p className="text-sm font-semibold text-foreground">{application.requiredStake} VTD</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Application Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Candidate Info */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Candidate Information
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="text-sm font-medium text-foreground">{application.candidateName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="text-sm font-medium text-foreground">{application.candidateEmail}</span>
                </div>
              </div>
            </div>

            {/* Application Text */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Application Details
              </h2>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {application.proposalText}
              </p>
            </div>

            {/* Votes List */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h2 className="text-xl font-bold text-foreground mb-4">Vote History</h2>
              {application.votes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No votes yet</p>
              ) : (
                <div className="space-y-3">
                  {application.votes.map((vote: GuildApplicationVote) => (
                    <div
                      key={vote.id}
                      className="flex items-start gap-4 p-4 bg-muted rounded-lg"
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          vote.vote === "for"
                            ? "bg-green-500/10 text-green-600"
                            : vote.vote === "against"
                            ? "bg-red-500/10 text-red-600"
                            : "bg-gray-500/10 text-gray-600"
                        }`}
                      >
                        {vote.vote === "for" ? (
                          <ThumbsUp className="w-5 h-5" />
                        ) : vote.vote === "against" ? (
                          <ThumbsDown className="w-5 h-5" />
                        ) : (
                          <AlertCircle className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-foreground">{vote.expertName}</p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(vote.votedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Staked: {vote.stakeAmount} VTD
                        </p>
                        {vote.comment && (
                          <p className="text-sm text-foreground mt-2">{vote.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Voting Stats & Actions */}
          <div className="space-y-6">
            {/* Vote Distribution */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h3 className="text-lg font-bold text-foreground mb-4">Vote Distribution</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4 text-green-600" />
                      For
                    </span>
                    <span className="text-sm font-bold text-foreground">{votesFor}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: totalVotes > 0 ? `${(votesFor / totalVotes) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <ThumbsDown className="w-4 h-4 text-red-600" />
                      Against
                    </span>
                    <span className="text-sm font-bold text-foreground">{votesAgainst}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: totalVotes > 0 ? `${(votesAgainst / totalVotes) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Voting Actions */}
            {application.status === "ongoing" && (
              <div className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4">Cast Your Vote</h3>
                {expertHasVoted ? (
                  <div className="text-center py-4">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-foreground mb-2">You have voted</p>
                    <p className="text-xs text-muted-foreground">
                      Your vote: <span className="font-semibold">{expertVote?.vote}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stake: {expertVote?.stakeAmount} VTD
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      onClick={() => {
                        setVoteType("for");
                        setShowVoteModal(true);
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Vote For
                    </Button>
                    <Button
                      onClick={() => {
                        setVoteType("against");
                        setShowVoteModal(true);
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      Vote Against
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vote Modal */}
      <Modal
        isOpen={showVoteModal}
        onClose={() => setShowVoteModal(false)}
        title={`Vote ${voteType === "for" ? "For" : "Against"} Application`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Stake Amount (VTD) *
            </label>
            <Input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder={`Minimum: ${application.requiredStake} VTD`}
              min={application.requiredStake}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Required: {application.requiredStake} VTD minimum
            </p>
          </div>
          <div>
            <Textarea
              label="Comment (Optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Share your reasoning..."
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowVoteModal(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVoteSubmit}
              disabled={isSubmitting || !stakeAmount || parseFloat(stakeAmount) < application.requiredStake}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Vote"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
