import { CheckCircle, Clock, Briefcase, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CandidateGuildApplication } from "@/types";

interface CandidateReviewCardProps {
  application: CandidateGuildApplication;
  onReview: (application: CandidateGuildApplication) => void;
  showGuildBadge?: boolean;
}

export function CandidateReviewCard({ application, onReview, showGuildBadge }: CandidateReviewCardProps) {
  return (
    <div className="border border-border bg-card p-5 transition-colors hover:border-foreground/20">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <h4 className="font-semibold text-foreground text-base truncate">
              {application.candidateName}
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

          <p className="text-sm text-muted-foreground mb-2">
            {application.candidateEmail}
          </p>

          <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs">
            <span className="flex items-center text-muted-foreground">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Submitted {new Date(application.submittedAt).toLocaleDateString()}
            </span>
            {application.jobTitle && (
              <span className="flex items-center text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5 mr-1" />
                {application.jobTitle}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold">{application.reviewCount}</span>
            <span>reviewed</span>
          </div>

          {application.expertHasReviewed ? (
            <div className="flex items-center px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg border border-green-500/20">
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              <span className="text-sm font-medium">Reviewed</span>
            </div>
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
