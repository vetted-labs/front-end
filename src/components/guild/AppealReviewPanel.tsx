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
import type { GuildApplicationAppeal } from "@/types";

interface AppealReviewPanelProps {
  appeal: GuildApplicationAppeal;
  /** Wallet address of the reviewing expert */
  wallet: string;
  /** Expert ID for checking voted status */
  expertId: string;
  onVoteSubmitted?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending Review", color: "text-amber-500", icon: Clock },
  reviewing: { label: "Under Review", color: "text-blue-500", icon: Users },
  upheld: { label: "Rejection Upheld", color: "text-red-500", icon: XCircle },
  overturned: { label: "Overturned — Candidate Admitted", color: "text-emerald-500", icon: CheckCircle2 },
};

export function AppealReviewPanel({
  appeal,
  wallet,
  expertId,
  onVoteSubmitted,
}: AppealReviewPanelProps) {
  const [decision, setDecision] = useState<"uphold" | "overturn" | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasVoted = appeal.votes.some((v) => v.expertId === expertId);
  const isResolved = appeal.status === "upheld" || appeal.status === "overturned";
  const status = statusConfig[appeal.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const handleSubmit = async () => {
    if (!decision) {
      toast.error("Please select a decision");
      return;
    }
    if (reasoning.length < 50) {
      toast.error("Reasoning must be at least 50 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      await guildAppealApi.voteOnAppeal(appeal.id, {
        wallet,
        decision,
        reasoning,
      });
      toast.success("Vote submitted");
      onVoteSubmitted?.();
    } catch {
      toast.error("Failed to submit vote");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-amber-500/20">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-amber-500" />
            <h4 className="text-sm font-semibold">Appeal Review</h4>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
            <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
          </div>
        </div>

        {/* Appeal Info */}
        <div className="rounded-lg bg-muted/30 dark:bg-white/[0.02] p-3 mb-4 space-y-2">
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
          <div className="rounded-lg bg-muted/30 dark:bg-white/[0.02] border border-border/40 p-3">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {appeal.justification}
            </p>
          </div>
        </div>

        {/* Vote Progress */}
        <div className="flex items-center justify-between mb-4 rounded-lg bg-muted/30 dark:bg-white/[0.02] px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Panel Progress</span>
          </div>
          <div className="flex items-center gap-3 text-xs tabular-nums">
            <span>
              <span className="font-medium text-red-500">{appeal.votesUphold}</span>{" "}
              <span className="text-muted-foreground/60">uphold</span>
            </span>
            <span>
              <span className="font-medium text-emerald-500">{appeal.votesOverturn}</span>{" "}
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
                  className="flex items-start gap-2.5 rounded-lg bg-muted/20 dark:bg-white/[0.01] border border-border/30 px-3 py-2"
                >
                  <Shield className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{vote.expertName ?? "Panel Member"}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          vote.decision === "overturn"
                            ? "border-emerald-500/30 text-emerald-500"
                            : "border-red-500/30 text-red-500"
                        }`}
                      >
                        {vote.decision}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{vote.reasoning}</p>
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
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-red-500/5 border-red-500/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {appeal.outcome.decision === "overturned" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm font-semibold">
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
          <div className="border-t border-border/40 pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Your Decision
            </p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setDecision("uphold")}
                className={`rounded-lg border p-3 text-left transition-all ${
                  decision === "uphold"
                    ? "border-red-500/40 bg-red-500/5 ring-1 ring-red-500/20"
                    : "border-border hover:border-red-500/20"
                }`}
              >
                <XCircle className={`w-4 h-4 mb-1 ${decision === "uphold" ? "text-red-500" : "text-muted-foreground"}`} />
                <p className="text-xs font-semibold">Uphold Rejection</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Original decision was correct
                </p>
              </button>

              <button
                onClick={() => setDecision("overturn")}
                className={`rounded-lg border p-3 text-left transition-all ${
                  decision === "overturn"
                    ? "border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                    : "border-border hover:border-emerald-500/20"
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 mb-1 ${decision === "overturn" ? "text-emerald-500" : "text-muted-foreground"}`} />
                <p className="text-xs font-semibold">Overturn — Admit Candidate</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Candidate was incorrectly rejected
                </p>
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Reasoning <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Explain your decision. This will be recorded and visible to the appealing expert..."
                className="w-full h-20 px-3 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1">
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
          <div className="border-t border-border/40 pt-4 text-center">
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
