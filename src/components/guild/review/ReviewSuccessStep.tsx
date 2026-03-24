"use client";

import { CheckCircle, CheckCircle2, Sparkles } from "lucide-react";
import type { ReviewSubmitResponse } from "@/types";

export interface ReviewSuccessStepProps {
  isCommitPhase: boolean;
  apiResponse: ReviewSubmitResponse | null;
  generalTotal: number;
  generalMax: number;
  topicTotal: number;
  topicMax: number;
  redFlagDeductions: number;
  overallScore: number;
  commitTxHash: string | null;
}

export function ReviewSuccessStep({
  isCommitPhase,
  apiResponse,
  generalTotal,
  generalMax,
  topicTotal,
  topicMax,
  redFlagDeductions,
  overallScore,
  commitTxHash,
}: ReviewSuccessStepProps) {
  const overallMax = (generalMax || 0) + (topicMax || 0);
  const scorePercent = overallMax > 0 ? Math.round((overallScore / overallMax) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-1">
          {isCommitPhase ? "Commitment Submitted" : "Review Submitted"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {apiResponse?.message || "Your review has been recorded. Thanks for voting!"}
        </p>
      </div>

      {/* Vote Locked Confirmation (commit-reveal only) */}
      {isCommitPhase && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-center">
          <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-foreground">Vote committed!</p>
          <p className="text-sm text-muted-foreground mt-1">
            You&apos;ll need to reveal it during the reveal phase.
          </p>
        </div>
      )}

      {/* Score Summary */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
        <h4 className="text-sm font-semibold text-foreground tracking-wide uppercase">
          Your Review Summary
        </h4>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-card border border-border">
            <p className="text-xs text-muted-foreground mb-1">General</p>
            <p className="text-lg font-bold text-foreground">
              {generalTotal}<span className="text-sm text-muted-foreground font-normal">/{generalMax || "?"}</span>
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-card border border-border">
            <p className="text-xs text-muted-foreground mb-1">Domain</p>
            <p className="text-lg font-bold text-foreground">
              {topicTotal}<span className="text-sm text-muted-foreground font-normal">/{topicMax || "?"}</span>
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-card border border-border">
            <p className="text-xs text-muted-foreground mb-1">Deductions</p>
            <p className={`text-lg font-bold ${redFlagDeductions > 0 ? "text-red-400" : "text-foreground"}`}>
              {redFlagDeductions > 0 ? `-${redFlagDeductions}` : "0"}
            </p>
          </div>
        </div>

        {/* Overall Score */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Overall Score</span>
            <span className="text-2xl font-bold text-foreground">
              {overallScore}<span className="text-sm text-muted-foreground font-normal">/{overallMax}</span>
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

      {/* On-chain transaction */}
      {commitTxHash && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/[0.04] p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            <div className="text-sm flex-1 min-w-0">
              <p className="font-medium text-foreground mb-1">On-Chain Transaction Confirmed</p>
              <p className="text-muted-foreground mb-2">
                Your vote commitment has been recorded on the Ethereum blockchain.
              </p>
              <a
                href={`https://sepolia.etherscan.io/tx/${commitTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View on Etherscan
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <p className="text-[10px] text-muted-foreground font-mono mt-1.5 truncate">
                {commitTxHash}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* What happens next */}
      <div className="rounded-xl border border-border bg-blue-500/[0.04] p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">What happens next?</p>
            <p>
              {isCommitPhase
                ? "Your vote is hidden until all assigned reviewers have submitted theirs. Once everyone votes (or the deadline passes), all scores are revealed simultaneously and the application is finalized using IQR-based consensus."
                : "Once all assigned reviewers submit their scores, the application will be finalized immediately using IQR-based consensus. If not all reviewers submit before the deadline, finalization runs automatically. Your alignment with the consensus will affect your reputation and rewards."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
