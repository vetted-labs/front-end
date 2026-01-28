"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Award,
  AlertCircle,
  Users,
  Target,
} from "lucide-react";

interface ProposalFinalizationDisplayProps {
  proposal: {
    id: string;
    finalized: boolean;
    outcome?: "approved" | "rejected";
    consensus_score?: number;
    vote_count: number;
    assigned_reviewer_count?: number;
  };
  myVote?: {
    score: number;
    alignment_distance?: number;
    reputation_change?: number;
    reward_amount?: number;
  };
  compact?: boolean;
}

export function ProposalFinalizationDisplay({
  proposal,
  myVote,
  compact = false,
}: ProposalFinalizationDisplayProps) {
  if (!proposal.finalized) {
    return null;
  }

  const isApproved = proposal.outcome === "approved";
  const consensusScore = proposal.consensus_score || 0;
  const participationRate =
    proposal.assigned_reviewer_count
      ? (proposal.vote_count / proposal.assigned_reviewer_count) * 100
      : 0;

  if (compact) {
    return (
      <Card className={`border-l-4 ${isApproved ? "border-l-green-500" : "border-l-red-500"}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isApproved ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              <div>
                <Badge
                  variant={isApproved ? "default" : "destructive"}
                  className="text-base px-3 py-1"
                >
                  {isApproved ? "APPROVED" : "REJECTED"}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Consensus: {consensusScore.toFixed(1)}/100
                </p>
              </div>
            </div>

            {myVote && myVote.alignment_distance !== undefined && (
              <div className="text-right">
                <Badge
                  variant={myVote.alignment_distance < 10 ? "default" : "destructive"}
                  className="mb-1"
                >
                  {myVote.alignment_distance < 10 ? "High" : "Low"} Alignment
                </Badge>
                {myVote.reputation_change !== undefined && (
                  <p className="text-sm font-medium">
                    {myVote.reputation_change > 0 ? "+" : ""}
                    {myVote.reputation_change} Rep
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Outcome Banner */}
      <Card
        className={`border-2 ${
          isApproved
            ? "border-green-500 bg-green-500/5"
            : "border-red-500 bg-red-500/5"
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            {isApproved ? (
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            ) : (
              <XCircle className="w-12 h-12 text-red-500" />
            )}
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-1">
                Proposal {isApproved ? "Approved" : "Rejected"}
              </h3>
              <p className="text-muted-foreground">
                Voting has concluded and the outcome has been determined
              </p>
            </div>
            <Badge
              variant={isApproved ? "default" : "destructive"}
              className="text-xl px-6 py-2"
            >
              {isApproved ? "APPROVED" : "REJECTED"}
            </Badge>
          </div>

          {/* Consensus Score */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="w-5 h-5 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                  Consensus Score
                </p>
              </div>
              <p className="text-3xl font-bold">{consensusScore.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">out of 100</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-500" />
                <p className="text-sm font-medium text-muted-foreground">
                  Participation
                </p>
              </div>
              <p className="text-3xl font-bold">{proposal.vote_count}</p>
              <p className="text-xs text-muted-foreground">
                of {proposal.assigned_reviewer_count || "?"} reviewers (
                {participationRate.toFixed(0)}%)
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <p className="text-sm font-medium text-muted-foreground">
                  Threshold
                </p>
              </div>
              <p className="text-3xl font-bold">60</p>
              <p className="text-xs text-muted-foreground">
                {consensusScore >= 60 ? "Met" : "Not met"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Performance (if I voted) */}
      {myVote && (
        <Card className="border-primary/50">
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Your Performance
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Your Score */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Your Score</p>
                <p className="text-2xl font-bold">{myVote.score}/100</p>
              </div>

              {/* Alignment */}
              {myVote.alignment_distance !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Alignment Distance
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {myVote.alignment_distance.toFixed(1)}
                    </p>
                    <Badge
                      variant={
                        myVote.alignment_distance < 10 ? "default" : "destructive"
                      }
                    >
                      {myVote.alignment_distance < 10 ? "High" : "Low"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    |{myVote.score} - {consensusScore.toFixed(1)}|
                  </p>
                </div>
              )}

              {/* Reputation Change */}
              {myVote.reputation_change !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Reputation Change
                  </p>
                  <div className="flex items-center gap-2">
                    {myVote.reputation_change > 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    ) : myVote.reputation_change < 0 ? (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    ) : null}
                    <p
                      className={`text-2xl font-bold ${
                        myVote.reputation_change > 0
                          ? "text-green-500"
                          : myVote.reputation_change < 0
                          ? "text-red-500"
                          : ""
                      }`}
                    >
                      {myVote.reputation_change > 0 ? "+" : ""}
                      {myVote.reputation_change}
                    </p>
                  </div>
                </div>
              )}

              {/* VETD Reward */}
              {myVote.reward_amount !== undefined && myVote.reward_amount > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    VETD Reward
                  </p>
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <p className="text-2xl font-bold text-amber-500">
                      {myVote.reward_amount.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">VETD</p>
                </div>
              )}
            </div>

            {/* Alignment Explanation */}
            {myVote.alignment_distance !== undefined && (
              <Card className="mt-4 bg-muted/30 border-border">
                <CardContent className="p-3">
                  <p className="text-sm text-muted-foreground">
                    {myVote.alignment_distance < 10 ? (
                      <>
                        <strong className="text-green-500">
                          High alignment!
                        </strong>{" "}
                        Your score was close to the consensus. You've earned
                        reputation and VETD rewards for accurate evaluation.
                      </>
                    ) : myVote.alignment_distance > 20 ? (
                      <>
                        <strong className="text-red-500">Low alignment.</strong>{" "}
                        Your score diverged significantly from the consensus. This
                        may result in a reputation penalty.
                      </>
                    ) : (
                      <>
                        <strong className="text-amber-500">
                          Moderate alignment.
                        </strong>{" "}
                        Your score was somewhat close to the consensus. Minor
                        reputation impact.
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {isApproved && (
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">
                  Candidate Approved
                </p>
                <p className="text-muted-foreground">
                  The candidate has been approved and added to the guild. They can
                  now apply to jobs within this guild and access guild benefits.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
