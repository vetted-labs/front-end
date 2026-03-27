"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2, MessageSquare, Link2, ShieldCheck, Eye, Lock, TrendingUp, TrendingDown, Minus, X } from "lucide-react";
import { expertApi, guildsApi, commitRevealApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { logger } from "@/lib/logger";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { STATUS_COLORS } from "@/config/colors";
import { Divider } from "@/components/ui/divider";
import type { ExpertCRPhaseStatus, CommitRevealPhaseStatus, ExpertApplicationFinalization } from "@/types";

interface ViewReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string | null;
  applicantName: string;
  reviewType: "expert" | "candidate";
  walletAddress: string;
  expertId?: string;
}

export function ViewReviewModal({
  isOpen,
  onClose,
  applicationId,
  applicantName,
  reviewType,
  walletAddress,
  expertId,
}: ViewReviewModalProps) {
  const [crStatus, setCrStatus] = useState<ExpertCRPhaseStatus | CommitRevealPhaseStatus | null>(null);
  const [finalization, setFinalization] = useState<ExpertApplicationFinalization | null>(null);

  const shouldFetch = isOpen && !!applicationId && !!walletAddress;

  const { data: review, isLoading: loading, error } = useFetch(
    () => reviewType === "expert"
      ? expertApi.getMyExpertApplicationReview(applicationId!, walletAddress)
      : guildsApi.getMyCandidateApplicationReview(applicationId!, walletAddress),
    { skip: !shouldFetch }
  );

  // Fetch commit-reveal phase status (non-critical — silent on failure)
  useFetch<ExpertCRPhaseStatus | CommitRevealPhaseStatus>(
    () => {
      const fetch = reviewType === "expert"
        ? expertApi.expertCommitReveal.getPhaseStatus(applicationId!)
        : commitRevealApi.getPhaseStatus(applicationId!);
      return fetch;
    },
    {
      skip: !shouldFetch,
      onSuccess: (data) => setCrStatus(data),
      onError: (msg) => {
        logger.warn("Phase status not available — direct vote or no CR enabled", msg);
        setCrStatus(null);
      },
    }
  );

  // Fetch finalization data for consensus results (non-critical — silent on failure)
  useFetch<ExpertApplicationFinalization>(
    () => expertApi.getExpertApplicationFinalization(applicationId!),
    {
      skip: !shouldFetch || reviewType !== "expert",
      onSuccess: (data) => setFinalization(data),
      onError: () => setFinalization(null),
    }
  );

  if (!isOpen || !applicationId) return null;

  const isCommitPhase = review?.revealed === false && !review?.vote;

  // Derive the phase from crStatus
  const crPhase = crStatus
    ? ("votingPhase" in crStatus ? (crStatus as ExpertCRPhaseStatus).votingPhase : (crStatus as CommitRevealPhaseStatus).phase)
    : null;

  // Missed reveal: application is finalized but the expert never revealed
  const missedReveal = crPhase === "finalized" && review?.revealed === false;

  // Consensus result data for finalized applications
  const isFinalized = crPhase === "finalized" && !!finalization;
  const expertVote = finalization?.votes?.find(
    (v) => expertId && v.reviewerId === expertId
  );

  // Score data comes from the review (stored server-side during commit)
  const scores = review?.criteriaScores as Record<string, unknown> | undefined;
  const generalScores = scores?.general as Record<string, unknown> | undefined;
  const domainScores = scores?.domain as Record<string, unknown> | undefined;
  const generalTotal = (generalScores?.total as number) ?? 0;
  const generalMax = (generalScores?.max as number) ?? 0;
  const domainTotal = (domainScores?.total as number) ?? 0;
  const domainMax = (domainScores?.max as number) ?? 0;
  const overallMax = (scores?.overallMax as number) || (generalMax + domainMax) || 0;
  const overallScore = review?.overallScore ?? 0;
  const scorePercent = overallMax > 0 ? Math.round((overallScore / overallMax) * 100) : 0;

  const justifications = review?.criteriaJustifications as Record<string, unknown> | undefined;
  const generalJustifications = justifications?.general as Record<string, string> | undefined;
  const domainJustifications = justifications?.domain as Record<string, string> | undefined;

  // Status badge config
  const statusBadge = isCommitPhase
    ? { label: "Vote Submitted (Pending Reveal)", className: STATUS_COLORS.warning.badge, icon: <Lock className="w-3.5 h-3.5" /> }
    : review?.vote === "approve"
    ? { label: "Approved", className: STATUS_COLORS.positive.badge, icon: <CheckCircle className="w-3.5 h-3.5" /> }
    : review?.vote === "reject"
    ? { label: "Rejected", className: STATUS_COLORS.negative.badge, icon: <XCircle className="w-3.5 h-3.5" /> }
    : { label: "Pending", className: STATUS_COLORS.pending.badge, icon: null };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">{applicantName}</h2>
              {review && (
                <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}>
                  {statusBadge.icon}
                  {statusBadge.label}
                </span>
              )}
            </div>
            {review && (
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(review.committedAt || review.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                at{" "}
                {new Date(review.committedAt || review.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12" role="status" aria-label="Loading review">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className={`flex items-center gap-3 p-4 rounded-xl ${STATUS_COLORS.negative.bgSubtle} border ${STATUS_COLORS.negative.border}`}>
            <XCircle className={`w-4 h-4 ${STATUS_COLORS.negative.icon} shrink-0`} />
            <p className={`text-sm ${STATUS_COLORS.negative.text}`}>{error}</p>
          </div>
        )}

        {review && (
          <>
            {/* Missed Reveal Warning */}
            {missedReveal && (
              <Alert variant="error">
                You missed the reveal window. Your vote will not count toward consensus.
                This may affect your reputation score.
              </Alert>
            )}

            {/* Commit TX Link */}
            {isCommitPhase && review.onChainCommitTxHash && (
              <div className="flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <a
                  href={`https://sepolia.etherscan.io/tx/${review.onChainCommitTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary/70 hover:text-primary font-mono truncate transition-colors"
                >
                  View commit tx on Etherscan &rarr;
                </a>
              </div>
            )}

            {/* Commit-Reveal & On-Chain Status */}
            {crStatus && (
              <CRStatusSection crStatus={crStatus} reviewType={reviewType} />
            )}

            {/* Score Summary */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Score Summary
                </p>
                {isCommitPhase && (
                  <span className={`text-xs ${STATUS_COLORS.warning.text} font-medium uppercase tracking-wider`}>
                    Hidden until all votes are in
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-3">
                {/* General */}
                <div className="border border-border rounded-xl bg-muted/20 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5">General</p>
                  <p className="text-2xl font-bold text-foreground">{generalTotal}</p>
                  <p className="text-sm text-muted-foreground">/{generalMax || "?"}</p>
                </div>

                {/* Domain */}
                <div className="border border-border rounded-xl bg-muted/20 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Domain</p>
                  <p className="text-2xl font-bold text-foreground">{domainTotal}</p>
                  <p className="text-sm text-muted-foreground">/{domainMax || "?"}</p>
                </div>

                {/* Deductions */}
                <div className="border border-border rounded-xl bg-muted/20 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Deductions</p>
                  <p className={`text-2xl font-bold ${(review.redFlagDeductions ?? 0) > 0 ? STATUS_COLORS.negative.text : "text-foreground"}`}>
                    {(review.redFlagDeductions ?? 0) > 0 ? `-${review.redFlagDeductions}` : "0"}
                  </p>
                  <p className="text-sm text-muted-foreground">pts</p>
                </div>

                {/* Overall */}
                <div className={`border ${STATUS_COLORS.positive.border} rounded-xl ${STATUS_COLORS.positive.bgSubtle} p-4 text-center`}>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Overall</p>
                  <p className={`text-2xl font-bold ${STATUS_COLORS.positive.text}`}>{scorePercent}%</p>
                  <p className="text-sm text-muted-foreground">{overallScore}/{overallMax}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden mt-4 mb-6">
                <div
                  className={`h-full rounded-full ${STATUS_COLORS.positive.bg} transition-all duration-500`}
                  style={{ width: `${Math.min(scorePercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Consensus Result (shown when finalized) */}
            {isFinalized && finalization && (
              <div className="border border-border rounded-xl bg-muted/20 p-4">
                <div className="flex items-stretch gap-0">
                  {/* Consensus score */}
                  <div className="flex-1 flex flex-col items-center justify-center px-3 py-1">
                    <p className="text-xs text-muted-foreground mb-1">Consensus score</p>
                    <p className="text-xl font-bold text-foreground">{finalization.consensusScore}%</p>
                  </div>

                  <Divider orientation="vertical" className="h-8 self-center" />

                  {/* Your score */}
                  <div className="flex-1 flex flex-col items-center justify-center px-3 py-1">
                    <p className="text-xs text-muted-foreground mb-1">Your score</p>
                    <p className="text-xl font-bold text-foreground">{scorePercent}%</p>
                  </div>

                  {expertVote && (
                    <>
                      <Divider orientation="vertical" className="h-8 self-center" />

                      {/* Reputation change */}
                      <div className="flex-1 flex flex-col items-center justify-center px-3 py-1">
                        <p className="text-xs text-muted-foreground mb-1">Reputation change</p>
                        <p className={`text-xl font-bold ${
                          expertVote.reputationChange > 0
                            ? STATUS_COLORS.positive.text
                            : expertVote.reputationChange < 0
                            ? STATUS_COLORS.negative.text
                            : "text-muted-foreground"
                        }`}>
                          {expertVote.reputationChange > 0 ? "+" : ""}{expertVote.reputationChange}
                        </p>
                      </div>

                      <Divider orientation="vertical" className="h-8 self-center" />

                      {/* VETD reward */}
                      <div className="flex-1 flex flex-col items-center justify-center px-3 py-1">
                        <p className="text-xs text-muted-foreground mb-1">VETD reward</p>
                        <p className="text-xl font-bold text-primary">
                          {(expertVote as typeof expertVote & { vetdReward?: number }).vetdReward != null
                            ? `+${(expertVote as typeof expertVote & { vetdReward?: number }).vetdReward}`
                            : "—"}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Justifications */}
            {((generalJustifications && Object.keys(generalJustifications).length > 0) ||
              (domainJustifications && Object.keys(domainJustifications).length > 0)) && (
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Your Justifications
                </p>

                {generalJustifications && Object.entries(generalJustifications).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 pb-1.5 border-b border-border">
                      General
                    </p>
                    {Object.entries(generalJustifications).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs font-medium text-muted-foreground mb-1 capitalize">
                          {key.replace(/_/g, " ")}
                        </p>
                        <div className="rounded-lg bg-muted/20 border border-border p-3">
                          <p className="text-sm text-muted-foreground leading-relaxed">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {domainJustifications && Object.entries(domainJustifications).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 pb-1.5 border-b border-border">
                      Domain
                    </p>
                    {Object.entries(domainJustifications).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs font-medium text-muted-foreground mb-1 capitalize">
                          {key.replace(/_/g, " ")}
                        </p>
                        <div className="rounded-lg bg-muted/20 border border-border p-3">
                          <p className="text-sm text-muted-foreground leading-relaxed">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Feedback */}
            {review.feedback && (
              <div className="rounded-xl border border-border bg-muted/20 p-6 space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-bold text-foreground">Your Feedback</h4>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{review.feedback}</p>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            >
              Close
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ── Commit-Reveal & On-Chain Status Section ── */

function CRStatusSection({
  crStatus,
  reviewType,
}: {
  crStatus: ExpertCRPhaseStatus | CommitRevealPhaseStatus;
  reviewType: "expert" | "candidate";
}) {
  const isExpertCR = reviewType === "expert" && "votingPhase" in crStatus;
  const phase = isExpertCR
    ? (crStatus as ExpertCRPhaseStatus).votingPhase
    : (crStatus as CommitRevealPhaseStatus).phase;

  const isCommitReveal = phase !== "direct" && phase !== "none";
  const blockchainSessionId = crStatus.blockchainSessionId;
  const isOnChain = !!crStatus.blockchainSessionCreated && !!blockchainSessionId;
  const txHash = "blockchainSessionTxHash" in crStatus ? (crStatus as ExpertCRPhaseStatus & { blockchainSessionTxHash?: string }).blockchainSessionTxHash : undefined;

  const commitCount = isExpertCR
    ? (crStatus as ExpertCRPhaseStatus).totalCommitments
    : (crStatus as CommitRevealPhaseStatus).commitCount ?? 0;

  const phaseLabel: Record<string, string> = {
    commit: "Voting In Progress",
    finalized: "Finalized",
    direct: "Direct Vote",
    none: "No Commit-Reveal",
  };

  const phaseColor: Record<string, string> = {
    commit: STATUS_COLORS.warning.text,
    finalized: STATUS_COLORS.positive.text,
    direct: "text-muted-foreground",
    none: "text-muted-foreground",
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <h4 className="text-sm font-bold text-foreground tracking-wide uppercase">
        Verification Status
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {/* Voting Method */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border">
          <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Method</p>
            <p className="text-xs font-medium text-foreground">
              {isCommitReveal ? "Commit-Reveal" : "Direct Vote"}
            </p>
          </div>
        </div>

        {/* Phase */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border">
          <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Phase</p>
            <p className={`text-xs font-medium ${phaseColor[phase] ?? "text-foreground"}`}>
              {phaseLabel[phase] ?? phase}
            </p>
          </div>
        </div>

        {/* On-Chain Status */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border">
          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">On-Chain</p>
            <p className={`text-xs font-medium ${isOnChain ? STATUS_COLORS.positive.text : "text-muted-foreground"}`}>
              {isOnChain ? "Recorded" : "Off-chain only"}
            </p>
          </div>
        </div>

        {/* Vote Counts */}
        {isCommitReveal && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border">
            <CheckCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Votes</p>
              <p className="text-xs font-medium text-foreground">
                {commitCount} voted
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Blockchain Session / Etherscan Link */}
      {isOnChain && (
        <div className="flex items-center gap-2 pt-1">
          <Link2 className="w-3 h-3 text-muted-foreground shrink-0" />
          {txHash ? (
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary/70 hover:text-primary font-mono truncate transition-colors"
            >
              View on Etherscan &rarr;
            </a>
          ) : blockchainSessionId ? (
            <p className="text-xs text-muted-foreground font-mono truncate">
              Session: {blockchainSessionId.slice(0, 10)}...{blockchainSessionId.slice(-8)}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
