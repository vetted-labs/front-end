"use client";

import { CheckCircle, Clock, Briefcase, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const accentBar = isReviewed
    ? "from-green-500 to-green-500/30"
    : "from-orange-500 to-orange-500/30";

  const avatarGradient = isReviewed
    ? "from-green-500/80 to-green-600/60"
    : "from-orange-500/80 to-orange-600/60";

  const initials = getInitials(application.candidateName);

  return (
    <div className="group rounded-2xl overflow-hidden bg-card/40 backdrop-blur-md border border-border/60 dark:border-white/[0.06] transition-all hover:border-primary/30 dark:hover:border-white/[0.12]">
      {/* Accent bar */}
      <div className={`h-[3px] w-full bg-gradient-to-r ${accentBar}`} />

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
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-500/8 border border-indigo-500/15 text-[11px] text-indigo-400 font-medium">
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
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {/* Status badge */}
          {isReviewed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5" />
              Reviewed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
              Pending
            </span>
          )}

          {/* Action buttons */}
          {isReviewed ? (
            onViewReview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewReview(application)}
                className="text-xs border border-border/60 hover:border-border"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                View
              </Button>
            )
          ) : (
            <Button
              onClick={() => onReview(application)}
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground"
            >
              Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
