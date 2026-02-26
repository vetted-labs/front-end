"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { endorsementAccountabilityApi } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { truncateAddress } from "@/lib/utils";
import type { DisputeDetail } from "@/types";

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
  AlertCircle,
  Clock,
  Users,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { DisputeVoteForm } from "@/components/endorsements/DisputeVoteForm";

function getTimeRemaining(deadline: string) {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

export function EndorsementDisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();

  const disputeId = params.disputeId as string;

  const fetchDispute = useCallback(
    () => endorsementAccountabilityApi.getHireOutcome(disputeId),
    [disputeId]
  );

  const {
    data: dispute,
    isLoading,
    refetch,
  } = useFetch<DisputeDetail>(fetchDispute, {
    onError: (errorMessage) => {
      toast.error(errorMessage || "Failed to load dispute details");
    },
  });

  const { execute: submitVote } = useApi();

  const handleArbitrationVote = async (
    decision: "uphold" | "dismiss",
    reasoning: string
  ) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    await submitVote(
      () =>
        endorsementAccountabilityApi.submitArbitrationVote(disputeId, {
          decision,
          reasoning,
          wallet: address,
        }),
      {
        onSuccess: () => {
          toast.success("Arbitration vote submitted!");
          refetch();
        },
        onError: (errorMessage) => {
          toast.error(errorMessage || "Failed to submit vote");
        },
      }
    );
  };

  if (isLoading) {
    return null;
  }

  if (!dispute) {
    return (
      <div className="min-h-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Dispute not found</p>
              <Button onClick={() => router.back()} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const canVote =
    dispute.isOnPanel && !dispute.hasVoted && dispute.status === "open";

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Resolution Banner */}
        {dispute.resolution && (
          <Card
            className={`mb-6 border-2 ${
              dispute.resolution === "upheld"
                ? "border-red-500 bg-red-500/5"
                : "border-green-500 bg-green-500/5"
            }`}
          >
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-bold mb-1">
                Dispute{" "}
                {dispute.resolution === "upheld" ? "Upheld" : "Dismissed"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {dispute.resolution === "upheld"
                  ? "The arbitration panel upheld this dispute. Endorsement rewards will be forfeited."
                  : "The arbitration panel dismissed this dispute. Endorsement rewards remain intact."}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dispute Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Dispute Details</CardTitle>
                  <Badge
                    variant={
                      dispute.status === "open"
                        ? "default"
                        : dispute.status === "resolved"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {dispute.status}
                  </Badge>
                </div>
                <CardDescription>
                  Filed on {new Date(dispute.filed_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Reason
                  </p>
                  <p className="text-foreground">{dispute.reason}</p>
                </div>

                {dispute.evidence && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Evidence
                    </p>
                    <Card className="bg-muted/30">
                      <CardContent className="p-4">
                        <p className="text-sm">{dispute.evidence}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hire Outcome Context */}
            {(dispute.candidateName || dispute.jobTitle) && (
              <Card>
                <CardHeader>
                  <CardTitle>Hire Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {dispute.candidateName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Candidate</span>
                      <span className="font-medium">
                        {dispute.candidateName}
                      </span>
                    </div>
                  )}
                  {dispute.jobTitle && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Job</span>
                      <span className="font-medium">{dispute.jobTitle}</span>
                    </div>
                  )}
                  {dispute.guildName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Guild</span>
                      <span className="font-medium">{dispute.guildName}</span>
                    </div>
                  )}
                  {dispute.hireDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hire Date</span>
                      <span className="font-medium">
                        {new Date(dispute.hireDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Panel Members */}
            <Card>
              <CardHeader>
                <CardTitle>Arbitration Panel</CardTitle>
                <CardDescription>
                  {dispute.votesSubmitted} of {dispute.totalPanelSize} votes
                  submitted
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dispute.panelMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {member.expertName ||
                            truncateAddress(member.expertWallet)}
                        </span>
                      </div>
                      {member.hasVoted ? (
                        <Badge
                          variant={
                            member.vote === "uphold"
                              ? "destructive"
                              : "default"
                          }
                        >
                          {member.vote}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Panel Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Deadline
                  </span>
                  <span className="text-sm font-medium">
                    {getTimeRemaining(dispute.deadline)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Votes
                  </span>
                  <span className="text-sm font-medium">
                    {dispute.votesSubmitted} / {dispute.totalPanelSize}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uphold</span>
                  <span className="text-sm font-medium text-red-500">
                    {dispute.upholdCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Dismiss
                  </span>
                  <span className="text-sm font-medium text-green-500">
                    {dispute.dismissCount}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Vote Form */}
            {canVote && (
              <DisputeVoteForm onSubmit={handleArbitrationVote} />
            )}

            {/* Already Voted */}
            {dispute.hasVoted && (
              <Card className="border-green-500/50">
                <CardContent className="p-6 text-center">
                  <Badge variant="default" className="text-lg px-6 py-2 mb-2">
                    Voted: {dispute.myVote}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Your arbitration vote has been recorded.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
