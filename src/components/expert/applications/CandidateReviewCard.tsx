"use client";

import { ChevronRight, Clock, Briefcase, Users } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import type { CandidateGuildApplication } from "@/types";

interface CandidateReviewCardProps {
  application: CandidateGuildApplication;
  onReview: (application: CandidateGuildApplication) => void;
  onViewReview?: (application: CandidateGuildApplication) => void;
  showGuildBadge?: boolean;
}

/** Derives 1-2 uppercase initials from a full name */
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function CandidateReviewCard({ application, onReview, onViewReview, showGuildBadge }: CandidateReviewCardProps) {
  const isReviewed = application.expertHasReviewed;

  const avatarGradient = isReviewed
    ? "from-positive/80 to-positive/60"
    : "from-primary/80 to-primary/60";

  const initials = getInitials(application.candidateName);

  return (
    <div className="group rounded-2xl bg-card/40 backdrop-blur-md border border-border/60 dark:border-white/[0.06] transition-all hover:border-primary/30 dark:hover:border-white/[0.12]">

      <div className="flex items-center gap-4 p-5">
        {/* Avatar */}
        <div
          className={`shrink-0 w-[46px] h-[46px] rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center`}
          aria-hidden="true"
        >
          <span className="text-sm font-bold text-white leading-none">{initials}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Name + level badge + guild pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-bold text-foreground truncate">
              {application.candidateName}
            </h4>
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[10px] uppercase tracking-wider text-muted-foreground font-medium border border-border/50">
              {application.expertiseLevel}
            </span>
            {showGuildBadge && application.guildName && (
              <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full ${STATUS_COLORS.info.bgSubtle} border ${STATUS_COLORS.info.border} text-[11px] ${STATUS_COLORS.info.text} font-medium`}>
                {application.guildName}
              </span>
            )}
          </div>

          {/* Row 2: Email */}
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {application.candidateEmail}
          </p>

          {/* Row 3: Date + review count + job title */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(application.submittedAt).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {application.reviewCount} reviewed
            </span>
            {application.jobTitle && (
              <span className="inline-flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {application.jobTitle}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 font-medium ${
              isReviewed ? STATUS_COLORS.positive.text : "text-primary"
            }`}>
              <span className={`w-[5px] h-[5px] rounded-full ${
                isReviewed ? STATUS_COLORS.positive.dot : "bg-primary"
              }`} />
              {isReviewed ? "Reviewed" : "Pending"}
            </span>
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0 flex items-center">
          {isReviewed ? (
            onViewReview && (
              <button
                onClick={() => onViewReview(application)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                View
                <ChevronRight className="w-4 h-4" />
              </button>
            )
          ) : (
            <button
              onClick={() => onReview(application)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Review
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
