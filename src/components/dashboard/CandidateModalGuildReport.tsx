import {
  Shield,
  CheckCircle,
  XCircle,
  Star,
} from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import type { CandidateGuildReport } from "@/types";

interface CandidateModalGuildReportProps {
  guildReport: CandidateGuildReport | null | undefined;
}

export function CandidateModalGuildReport({ guildReport }: CandidateModalGuildReportProps) {
  if (!guildReport?.guildApplication) {
    return (
      <div className="text-center py-10">
        <Shield className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">No Guild Review</p>
        <p className="text-xs text-muted-foreground">
          This candidate has not been reviewed by a guild for this position
        </p>
      </div>
    );
  }

  const { guildApplication, reviews } = guildReport;

  return (
    <>
      {/* Score Card */}
      <div className="rounded-lg border border-border/40 dark:border-white/[0.06] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Guild Review Summary
          </p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
            guildApplication.guildApproved
              ? STATUS_COLORS.positive.badge
              : guildApplication.status === "rejected"
                ? STATUS_COLORS.negative.badge
                : STATUS_COLORS.warning.badge
          }`}>
            {guildApplication.guildApproved ? "Approved" : guildApplication.status}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/30 dark:bg-white/[0.02]">
            <p className="text-lg font-semibold text-foreground">{guildApplication.reviewCount}</p>
            <p className="text-[11px] text-muted-foreground">Reviews</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${STATUS_COLORS.positive.bgSubtle}`}>
            <p className={`text-lg font-semibold ${STATUS_COLORS.positive.text}`}>{guildApplication.approvalCount}</p>
            <p className="text-[11px] text-muted-foreground">Approvals</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${STATUS_COLORS.negative.bgSubtle}`}>
            <p className={`text-lg font-semibold ${STATUS_COLORS.negative.text}`}>{guildApplication.rejectionCount}</p>
            <p className="text-[11px] text-muted-foreground">Rejections</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span>Guild: <span className="text-foreground font-medium">{guildApplication.guildName}</span></span>
          <span className="text-border dark:text-white/10">&middot;</span>
          <span className="capitalize">Expertise: {guildApplication.expertiseLevel}</span>
        </div>
      </div>

      {/* Expert Reviews */}
      {reviews.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
            Expert Reviews
          </p>
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-border/40 dark:border-white/[0.06] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{review.reviewerName}</span>
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
                      review.vote === "approve" ? STATUS_COLORS.positive.text : STATUS_COLORS.negative.text
                    }`}>
                      {review.vote === "approve" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {review.vote === "approve" ? "Approved" : "Rejected"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className={`w-3 h-3 ${STATUS_COLORS.warning.icon}`} />
                    <span className="text-xs font-medium text-foreground">{review.overallScore}</span>
                  </div>
                </div>
                {review.feedback && (
                  <p className="text-sm text-foreground/80 leading-relaxed">{review.feedback}</p>
                )}
                {review.confidenceLevel && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Confidence: {review.confidenceLevel}/5
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
