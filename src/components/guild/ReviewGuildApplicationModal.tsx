"use client";

import { Loader2, ThumbsUp, ThumbsDown, CheckCircle, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface GuildApplication {
  id: string;
  fullName: string;
  email: string;
}

interface ReviewGuildApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: GuildApplication | null;
  reviewVote: "approve" | "reject";
  onVoteChange: (vote: "approve" | "reject") => void;
  reviewConfidence: string;
  onConfidenceChange: (confidence: string) => void;
  reviewFeedback: string;
  onFeedbackChange: (feedback: string) => void;
  onSubmitReview: () => void;
  isReviewing: boolean;
}

export function ReviewGuildApplicationModal({
  isOpen,
  onClose,
  application,
  reviewVote,
  onVoteChange,
  reviewConfidence,
  onConfidenceChange,
  reviewFeedback,
  onFeedbackChange,
  onSubmitReview,
  isReviewing,
}: ReviewGuildApplicationModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Expert Application"
    >
      {application && (
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">Applicant</p>
            <p className="font-semibold text-foreground">{application.fullName}</p>
            <p className="text-xs text-muted-foreground">{application.email}</p>
          </div>

          {/* Vote Selection */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Your Vote
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onVoteChange("approve")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  reviewVote === "approve"
                    ? "border-green-500 bg-green-50"
                    : "border-border hover:border-green-300"
                }`}
              >
                <ThumbsUp
                  className={`w-6 h-6 mx-auto mb-2 ${
                    reviewVote === "approve"
                      ? "text-green-600"
                      : "text-muted-foreground"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    reviewVote === "approve"
                      ? "text-green-700"
                      : "text-muted-foreground"
                  }`}
                >
                  Approve
                </p>
              </button>
              <button
                onClick={() => onVoteChange("reject")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  reviewVote === "reject"
                    ? "border-red-500 bg-destructive/10"
                    : "border-border hover:border-red-300"
                }`}
              >
                <ThumbsDown
                  className={`w-6 h-6 mx-auto mb-2 ${
                    reviewVote === "reject"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    reviewVote === "reject"
                      ? "text-red-700"
                      : "text-muted-foreground"
                  }`}
                >
                  Reject
                </p>
              </button>
            </div>
          </div>

          {/* Confidence Level */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Confidence Level (1-5)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => onConfidenceChange(level.toString())}
                  className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                    reviewConfidence === level.toString()
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              1 = Low confidence, 5 = Very high confidence
            </p>
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Feedback (Optional)
            </label>
            <textarea
              value={reviewFeedback}
              onChange={(e) => onFeedbackChange(e.target.value)}
              placeholder="Share your thoughts on this application..."
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reviewFeedback.length}/1000 characters
            </p>
          </div>

          <Alert variant="info">
            Your review helps maintain guild quality. Applications with 2+
            approvals are automatically accepted as &quot;recruit&quot; members.
          </Alert>

          <div className="flex gap-3">
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={onSubmitReview}
              disabled={isReviewing}
              className="flex-1"
            >
              {isReviewing ? (
                <>
                  <Loader2 className="animate-spin mr-2 w-4 h-4" />
                  Submitting...
                </>
              ) : (
                <>
                  {reviewVote === "approve" ? (
                    <CheckCircle className="mr-2 w-4 h-4" />
                  ) : (
                    <XCircle className="mr-2 w-4 h-4" />
                  )}
                  Submit Review
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
