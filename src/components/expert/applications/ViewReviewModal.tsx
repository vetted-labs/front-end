"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2, MessageSquare } from "lucide-react";
import { expertApi, guildsApi } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import type { MyReviewData } from "@/types";

interface ViewReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string | null;
  applicantName: string;
  reviewType: "expert" | "candidate";
  walletAddress: string;
}

export function ViewReviewModal({
  isOpen,
  onClose,
  applicationId,
  applicantName,
  reviewType,
  walletAddress,
}: ViewReviewModalProps) {
  const [review, setReview] = useState<MyReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !applicationId || !walletAddress) return;

    setLoading(true);
    setError(null);
    setReview(null);

    const fetchReview = reviewType === "expert"
      ? expertApi.getMyExpertApplicationReview(applicationId, walletAddress)
      : guildsApi.getMyCandidateApplicationReview(applicationId, walletAddress);

    fetchReview
      .then((data) => setReview(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load review"))
      .finally(() => setLoading(false));
  }, [isOpen, applicationId, walletAddress, reviewType]);

  if (!isOpen || !applicationId) return null;

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
              <span className="text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString()} at{" "}
                {new Date(review.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {/* Score Summary */}
            <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
              <h4 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                Score Summary
              </h4>

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
