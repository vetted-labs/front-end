import { Clock, ExternalLink, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAssetUrl } from "@/lib/api";
import type { ExpertMembershipApplication } from "@/types";

interface ExpertReviewCardProps {
  application: ExpertMembershipApplication;
  onReview: (application: ExpertMembershipApplication) => void;
  showGuildBadge?: boolean;
}

export function ExpertReviewCard({ application, onReview, showGuildBadge }: ExpertReviewCardProps) {
  return (
    <div className="border border-border bg-card p-5 transition-colors hover:border-foreground/20">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <h4 className="font-semibold text-foreground text-base truncate">
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

          <p className="text-sm text-muted-foreground mb-2">
            {application.currentTitle} at {application.currentCompany}
            {application.yearsOfExperience > 0 && ` · ${application.yearsOfExperience}y`}
          </p>

          <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs">
            <span className="flex items-center text-muted-foreground">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Applied {new Date(application.appliedAt).toLocaleDateString()}
            </span>

            {application.linkedinUrl && (
              <a
                href={application.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-primary/80 hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                LinkedIn
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}

            {application.resumeUrl && (
              <a
                href={getAssetUrl(application.resumeUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-primary/80 hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <FileText className="w-3 h-3 mr-1" />
                Resume
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold">{application.reviewCount}</span>
            <span>reviewed</span>
          </div>

          <Button onClick={() => onReview(application)} size="sm">
            Review
          </Button>
        </div>
      </div>
    </div>
  );
}
