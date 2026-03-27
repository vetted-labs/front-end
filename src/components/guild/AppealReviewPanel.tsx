"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Gavel,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  FileText,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/utils";
import { guildAppealApi } from "@/lib/api";
import { useApi } from "@/lib/hooks/useFetch";
import { APPEAL_STATUS_CONFIG } from "@/config/constants";
import { STATUS_COLORS } from "@/config/colors";
import type { GuildApplicationAppeal } from "@/types";

interface AppealReviewPanelProps {
  appeal: GuildApplicationAppeal;
  /** Wallet address of the reviewing expert */
  wallet: string;
  /** Expert ID for checking voted status */
  expertId: string;
  onVoteSubmitted?: () => void;
}

const APPEAL_STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  reviewing: Users,
  upheld: XCircle,
  overturned: CheckCircle2,
};

export function AppealReviewPanel({
  appeal,
  wallet,
  expertId,
  onVoteSubmitted,
}: AppealReviewPanelProps) {
  const [decision, setDecision] = useState<"uphold" | "overturn" | null>(null);
  const [reasoning, setReasoning] = useState("");
  const { execute: submitVote, isLoading: isSubmitting } = useApi();

  const hasVoted = appeal.votes.some((v) => v.expertId === expertId);
  const isResolved = appeal.status === "upheld" || appeal.status === "overturned";
  const status = APPEAL_STATUS_CONFIG[appeal.status] || APPEAL_STATUS_CONFIG.pending;
  const StatusIcon = APPEAL_STATUS_ICONS[appeal.status] || Clock;

  const handleSubmit = async () => {
    if (!decision) {
      toast.error("Please select a decision");
      return;
    }
    if (reasoning.length < 50) {
      toast.error("Reasoning must be at least 50 characters");
      return;
    }

    await submitVote(
      () => guildAppealApi.voteOnAppeal(appeal.id, {
        wallet,
        decision,
        reasoning,
      }),
      {
        onSuccess: () => {
          toast.success("Vote submitted");
          onVoteSubmitted?.();
        },
        onError: () => toast.error("Failed to submit vote"),
      }
    );
  };

  return (
    <Card className={STATUS_COLORS.warning.border}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gavel className={`w-5 h-5 ${STATUS_COLORS.warning.icon}`} />
            <h4 className="text-sm font-bold">Appeal Review</h4>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
            <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
          </div>
        </div>

        {/* Appeal Info */}
        <div className="rounded-lg bg-muted/30 p-3 mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Candidate</span>
            <span className="font-medium">{appeal.applicationName ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Guild</span>
            <span className="font-medium">{appeal.guildName ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Filed by</span>
            <span className="font-medium">{appeal.appealerName ?? "Anonymous Expert"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Stake</span>
            <span className="font-medium tabular-nums">{appeal.stakeAmount} VETD</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Filed</span>
            <span className="font-medium">{formatTimeAgo(appeal.createdAt)}</span>
          </div>
        </div>

        {/* Justification */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Appeal Justification
            </span>
          </div>
          <div className="rounded-lg bg-muted/30 border border-border p-3">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {appeal.justification}
            </p>
          </div>
        </div>

        {/* Vote Progress */}
        <div className="flex items-center justify-between mb-4 rounded-lg bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Panel Progress</span>
          </div>
          <div className="flex items-center gap-3 text-xs tabular-nums">
            <span>
              <span className={`font-medium ${STATUS_COLORS.negative.text}`}>{appeal.votesUphold}</span>{" "}
              <span className="text-muted-foreground/60">uphold</span>
            </span>
            <span>
              <span className={`font-medium ${STATUS_COLORS.positive.text}`}>{appeal.votesOverturn}</span>{" "}
              <span className="text-muted-foreground/60">overturn</span>
            </span>
            <span className="text-muted-foreground/40">
              {appeal.votes.length}/{appeal.panelSize} voted
            </span>
          </div>
        </div>

        {/* Existing votes (visible after resolution) */}
        {isResolved && appeal.votes.length > 0 && (
          <div className="mb-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Panel Votes
            </span>
            <div className="space-y-2 mt-2">
              {appeal.votes.map((vote) => (
                <div
                  key={vote.id}
                  className="flex items-start gap-2.5 rounded-lg bg-muted/20 border border-border/30 px-3 py-2"
                >
                  <Shield className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{vote.expertName ?? "Panel Member"}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          vote.decision === "overturn"
                            ? `${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.text}`
                            : `${STATUS_COLORS.negative.border} ${STATUS_COLORS.negative.text}`
                        }`}
                      >
                        {vote.decision}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{vote.reasoning}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outcome */}
        {appeal.outcome && (
          <div
            className={`rounded-lg border p-3 mb-4 ${
              appeal.outcome.decision === "overturned"
                ? `${STATUS_COLORS.positive.bgSubtle} ${STATUS_COLORS.positive.border}`
                : `${STATUS_COLORS.negative.bgSubtle} ${STATUS_COLORS.negative.border}`
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {appeal.outcome.decision === "overturned" ? (
                <CheckCircle2 className={`w-4 h-4 ${STATUS_COLORS.positive.icon}`} />
              ) : (
                <XCircle className={`w-4 h-4 ${STATUS_COLORS.negative.icon}`} />
              )}
              <span className="text-sm font-medium">
                {appeal.outcome.decision === "overturned"
                  ? "Appeal Successful — Candidate Admitted"
                  : "Appeal Rejected — Rejection Upheld"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 ml-6">
              <p>
                Appealer reputation: {appeal.outcome.appealerReputationChange > 0 ? "+" : ""}
                {appeal.outcome.appealerReputationChange}
              </p>
              <p>Stake {appeal.outcome.appealerStakeReturned ? "returned" : "forfeited"}</p>
            </div>
          </div>
        )}

        {/* Vote Form (if not voted and not resolved) */}
        {!hasVoted && !isResolved && (
          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Your Decision
            </p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setDecision("uphold")}
                className={`rounded-lg border p-3 text-left transition-all ${
                  decision === "uphold"
                    ? `${STATUS_COLORS.negative.border} ${STATUS_COLORS.negative.bgSubtle} ring-1 ring-negative/20`
                    : "border-border hover:border-negative/20"
                }`}
              >
                <XCircle className={`w-4 h-4 mb-1 ${decision === "uphold" ? STATUS_COLORS.negative.icon : "text-muted-foreground"}`} />
                <p className="text-xs font-medium">Uphold Rejection</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Original decision was correct
                </p>
              </button>

              <button
                onClick={() => setDecision("overturn")}
                className={`rounded-lg border p-3 text-left transition-all ${
                  decision === "overturn"
                    ? `${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.bgSubtle} ring-1 ring-positive/20`
                    : "border-border hover:border-positive/20"
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 mb-1 ${decision === "overturn" ? STATUS_COLORS.positive.icon : "text-muted-foreground"}`} />
                <p className="text-xs font-medium">Overturn — Admit Candidate</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Candidate was incorrectly rejected
                </p>
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Reasoning <span className="text-destructive">*</span>
              </label>
              <textarea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Explain your decision. This will be recorded and visible to the appealing expert..."
                className="w-full h-20 px-3 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none"
              />
              <p className="text-xs text-muted-foreground/60 mt-1">
                {reasoning.length}/50 minimum characters
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !decision || reasoning.length < 50}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Gavel className="w-4 h-4 mr-2" />
                  Submit Decision
                </>
              )}
            </Button>
          </div>
        )}

        {hasVoted && !isResolved && (
          <div className="border-t border-border pt-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-sm text-muted-foreground">
              You have voted. Waiting for remaining panel members.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
