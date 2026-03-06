import { CheckCircle, Clock, ExternalLink, Eye, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAssetUrl } from "@/lib/api";
import type { ExpertMembershipApplication } from "@/types";

interface ExpertReviewCardProps {
  application: ExpertMembershipApplication;
  onReview: (application: ExpertMembershipApplication) => void;
  onViewReview?: (application: ExpertMembershipApplication) => void;
  showGuildBadge?: boolean;
}

export function ExpertReviewCard({ application, onReview, onViewReview, showGuildBadge }: ExpertReviewCardProps) {
  const isReviewed = application.expertHasReviewed;

  return (
    <div className="group rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-5 transition-all hover:border-primary/30 dark:bg-card/40 dark:border-white/[0.06] dark:hover:border-white/[0.12]">
      <div className="flex items-start gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h4 className="text-base font-semibold text-foreground truncate">
              {application.fullName}
            </h4>
            <Badge variant="outline" className="shrink-0 text-xs">
              {application.expertiseLevel}
            </Badge>
            {showGuildBadge && application.guildName && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {application.guildName}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-1">
            {application.currentTitle} at {application.currentCompany}
            {application.yearsOfExperience > 0 && ` · ${application.yearsOfExperience}y exp`}
          </p>

          {/* Metadata row */}
          <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(application.appliedAt).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {application.reviewCount} reviewed
            </span>
            {application.linkedinUrl && (
              <a
                href={application.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary/70 hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                LinkedIn <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {application.resumeUrl && (
              <a
                href={getAssetUrl(application.resumeUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary/70 hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <FileText className="w-3 h-3" />
                Resume <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0 flex items-center gap-2">
          {isReviewed ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5" />
                Reviewed
              </span>
              {onViewReview && (
                <Button variant="outline" size="sm" onClick={() => onViewReview(application)} className="text-xs">
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  View
                </Button>
              )}
            </>
          ) : (
            <Button onClick={() => onReview(application)} size="sm">
              Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
