"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2, MessageSquare, Link2, ShieldCheck, Eye, Lock } from "lucide-react";
import { expertApi, guildsApi, commitRevealApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { logger } from "@/lib/logger";
import { Modal } from "@/components/ui/modal";
import type { ExpertCRPhaseStatus, CommitRevealPhaseStatus } from "@/types";

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

  const shouldFetch = isOpen && !!applicationId && !!walletAddress;

  const { data: review, isLoading: loading, error } = useFetch(
    () => reviewType === "expert"
      ? expertApi.getMyExpertApplicationReview(applicationId!, walletAddress)
      : guildsApi.getMyCandidateApplicationReview(applicationId!, walletAddress),
    { skip: !shouldFetch }
  );

  // Fetch commit-reveal phase status (non-critical — silent on failure)
  useFetch(
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

  if (!isOpen || !applicationId) return null;

  const isCommitPhase = review?.revealed === false && !review?.vote;

  // During commit phase, try to restore scores from localStorage
  const savedLocal = (() => {
    if (!isCommitPhase || !applicationId || !expertId) return null;
    try {
      const raw = localStorage.getItem(`expertCR:${applicationId}:${expertId}`);
      return raw ? JSON.parse(raw) as {
        normalizedScore?: number;
        criteriaScores?: Record<string, unknown>;
        criteriaJustifications?: Record<string, unknown>;
        overallScore?: number;
        redFlagDeductions?: number;
        feedback?: string;
      } : null;
    } catch { return null; }
  })();

  // Use localStorage data during commit phase, backend data otherwise
  const scores = (isCommitPhase ? savedLocal?.criteriaScores : review?.criteriaScores) as Record<string, unknown> | undefined;
  const generalScores = scores?.general as Record<string, unknown> | undefined;
  const domainScores = scores?.domain as Record<string, unknown> | undefined;
  const generalTotal = (generalScores?.total as number) ?? 0;
  const generalMax = (generalScores?.max as number) ?? 0;
  const domainTotal = (domainScores?.total as number) ?? 0;
  const domainMax = (domainScores?.max as number) ?? 0;
  const overallMax = (scores?.overallMax as number) || (generalMax + domainMax) || 0;
  const overallScore = (isCommitPhase ? savedLocal?.overallScore : review?.overallScore) ?? 0;
  const scorePercent = overallMax > 0 ? Math.round((overallScore / overallMax) * 100) : 0;

  const justifications = (isCommitPhase ? savedLocal?.criteriaJustifications : review?.criteriaJustifications) as Record<string, unknown> | undefined;
  const generalJustifications = justifications?.general as Record<string, string> | undefined;
  const domainJustifications = justifications?.domain as Record<string, string> | undefined;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Your Review">
      <p className="text-sm text-muted-foreground -mt-2 mb-4">{applicantName}</p>

      <div className="space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/[0.08] border border-red-500/20">
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {review && (
          <>
            {/* Vote Badge */}
            <div className="flex items-center gap-3">
              {isCommitPhase ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Lock className="w-4 h-4" />
                  Committed (Hidden)
                </div>
              ) : (
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                  review.vote === "approve"
                    ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                }`}>
                  {review.vote === "approve" ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {review.vote === "approve" ? "Approved" : "Rejected"}
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(review.committedAt || review.createdAt).toLocaleDateString()} at{" "}
                {new Date(review.committedAt || review.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

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
            {isCommitPhase && !savedLocal ? (
              <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
                <h4 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                  Score Summary
                </h4>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
                  <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Scores not available</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your saved review data was not found on this device. Scores will be visible after the reveal phase.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                    Score Summary
                  </h4>
                  {isCommitPhase && (
                    <span className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">
                      Only visible to you
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-card border border-border">
                    <p className="text-xs text-muted-foreground mb-1">General</p>
                    <p className="text-lg font-bold text-foreground">
                      {generalTotal}
                      <span className="text-sm text-muted-foreground font-normal">
                        /{generalMax || "?"}
                      </span>
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-card border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Domain</p>
                    <p className="text-lg font-bold text-foreground">
                      {domainTotal}
                      <span className="text-sm text-muted-foreground font-normal">
                        /{domainMax || "?"}
                      </span>
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-card border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Deductions</p>
                    <p className={`text-lg font-bold ${(review.redFlagDeductions ?? 0) > 0 ? "text-red-400" : "text-foreground"}`}>
                      {(review.redFlagDeductions ?? 0) > 0 ? `-${review.redFlagDeductions}` : "0"}
                    </p>
                  </div>
                </div>

                {/* Overall Score */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Overall Score</span>
                    <span className="text-2xl font-bold text-foreground">
                      {overallScore}
                      <span className="text-sm text-muted-foreground font-normal">/{overallMax}</span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        scorePercent >= 70
                          ? "bg-gradient-to-r from-green-500 to-emerald-500"
                          : scorePercent >= 40
                          ? "bg-gradient-to-r from-amber-500 to-orange-500"
                          : "bg-gradient-to-r from-red-500 to-rose-500"
                      }`}
                      style={{ width: `${Math.min(scorePercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-right">{scorePercent}%</p>
                </div>
              </div>
            )}

            {/* Justifications */}
            {((generalJustifications && Object.keys(generalJustifications).length > 0) ||
              (domainJustifications && Object.keys(domainJustifications).length > 0)) && (
              <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
                <h4 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                  Your Justifications
                </h4>

                {generalJustifications && Object.entries(generalJustifications).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">General</p>
                    {Object.entries(generalJustifications).map(([key, value]) => (
                      <div key={key} className="p-3 rounded-lg bg-card border border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-1 capitalize">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {domainJustifications && Object.entries(domainJustifications).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Domain</p>
                    {Object.entries(domainJustifications).map(([key, value]) => (
                      <div key={key} className="p-3 rounded-lg bg-card border border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-1 capitalize">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Feedback */}
            {review.feedback && (
              <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-foreground">Your Feedback</h4>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{review.feedback}</p>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-muted/50 border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
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
  const revealCount = isExpertCR
    ? (crStatus as ExpertCRPhaseStatus).revealedVotes
    : (crStatus as CommitRevealPhaseStatus).revealCount ?? 0;

  const phaseLabel: Record<string, string> = {
    commit: "Commit Phase",
    reveal: "Reveal Phase",
    finalized: "Finalized",
    direct: "Direct Vote",
    none: "No Commit-Reveal",
  };

  const phaseColor: Record<string, string> = {
    commit: "text-amber-400",
    reveal: "text-blue-400",
    finalized: "text-green-400",
    direct: "text-muted-foreground",
    none: "text-muted-foreground",
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground tracking-wide uppercase">
        Verification Status
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {/* Voting Method */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border">
          <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Method</p>
            <p className="text-xs font-semibold text-foreground">
              {isCommitReveal ? "Commit-Reveal" : "Direct Vote"}
            </p>
          </div>
        </div>

        {/* Phase */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border">
          <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Phase</p>
            <p className={`text-xs font-semibold ${phaseColor[phase] ?? "text-foreground"}`}>
              {phaseLabel[phase] ?? phase}
            </p>
          </div>
        </div>

        {/* On-Chain Status */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border">
          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">On-Chain</p>
            <p className={`text-xs font-semibold ${isOnChain ? "text-green-400" : "text-muted-foreground"}`}>
              {isOnChain ? "Recorded" : "Off-chain only"}
            </p>
          </div>
        </div>

        {/* Vote Counts */}
        {isCommitReveal && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border">
            <CheckCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Votes</p>
              <p className="text-xs font-semibold text-foreground">
                {commitCount} committed · {revealCount} revealed
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
              className="text-[10px] text-primary/70 hover:text-primary font-mono truncate transition-colors"
            >
              View on Etherscan &rarr;
            </a>
          ) : blockchainSessionId ? (
            <p className="text-[10px] text-muted-foreground font-mono truncate">
              Session: {blockchainSessionId.slice(0, 10)}...{blockchainSessionId.slice(-8)}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
