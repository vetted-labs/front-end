import { ApplicationCard } from './ApplicationCard';
import { Users } from 'lucide-react';
import type { EndorsementApplication } from "@/types";

interface ApplicationsGridProps {
  applications: EndorsementApplication[];
  loading: boolean;
  onSelectApplication: (app: EndorsementApplication) => void;
  onQuickEndorse?: (app: EndorsementApplication) => void;
}

export function ApplicationsGrid({ applications, loading, onSelectApplication, onQuickEndorse }: ApplicationsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-80 bg-card animate-pulse rounded-[20px]" />
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold mb-2">No Applications Available</h3>
        <p className="text-muted-foreground">
          There are currently no applications in this guild that need endorsements.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {applications.map(app => (
        <ApplicationCard
          key={app.application_id}
          application={app}
          onViewDetails={onSelectApplication}
          onQuickEndorse={onQuickEndorse}
        />
      ))}
    </div>
  );
}
