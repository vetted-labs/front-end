import { ApplicationCard } from './ApplicationCard';
import { Users } from 'lucide-react';
import type { EndorsementApplication } from "@/types";

interface ApplicationsGridProps {
  applications: EndorsementApplication[];
  loading: boolean;
  onSelectApplication: (app: EndorsementApplication) => void;
  onViewExistingBid?: (app: EndorsementApplication) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /**
   * If provided, the card whose `application_id` matches will receive
   * `markedCardProps` on its outer element. Used by story-lab/onboarding
   * to anchor a tour marker on a specific card. When the id is not found
   * (or omitted), the first card in the grid receives `markedCardProps`.
   */
  markedApplicationId?: string;
  markedCardProps?: Record<string, string>;
  markedCtaProps?: Record<string, string>;
}

export function ApplicationsGrid({ applications, loading, onSelectApplication, onViewExistingBid, emptyTitle, emptyDescription, markedApplicationId, markedCardProps, markedCtaProps }: ApplicationsGridProps) {
  if (loading) {
    return null;
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold mb-2">{emptyTitle ?? "No Applications Available"}</h3>
        <p className="text-muted-foreground">
          {emptyDescription ?? "There are currently no applications in this guild that need endorsements."}
        </p>
      </div>
    );
  }

  const markedIdx = markedCardProps
    ? (() => {
        if (markedApplicationId) {
          const idx = applications.findIndex(a => a.application_id === markedApplicationId);
          if (idx >= 0) return idx;
        }
        return 0;
      })()
    : -1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {applications.map((app, idx) => (
        <ApplicationCard
          key={app.application_id}
          application={app}
          onViewDetails={onSelectApplication}
          onViewExistingBid={onViewExistingBid}
          rootProps={idx === markedIdx ? markedCardProps : undefined}
          ctaProps={idx === markedIdx ? markedCtaProps : undefined}
        />
      ))}
    </div>
  );
}
