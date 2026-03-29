"use client";

import { Briefcase, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCandidateStatusDot } from "@/config/colors";
import { getPersonAvatar } from "@/lib/avatars";
import type { CompanyApplication } from "@/types";

interface CandidateJobGroupProps {
  job: CompanyApplication["job"];
  applications: CompanyApplication[];
  selectedApplicationId: string | null;
  onSelectApplication: (app: CompanyApplication) => void;
  getEndorsementCount: (app: CompanyApplication) => number;
  isExpanded: boolean;
  onToggle: () => void;
  visibleCount: number;
  onShowMore: () => void;
}

/** Deterministic muted avatar background based on name */
function getAvatarColor(name: string): string {
  const colors = [
    "bg-primary/15 text-primary",
    "bg-info-blue/15 text-info-blue",
    "bg-positive/15 text-positive",
    "bg-rank-officer/15 text-rank-officer",
    "bg-rank-craftsman/15 text-rank-craftsman",
    "bg-warning/15 text-warning",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function CandidateJobGroup({
  job,
  applications,
  selectedApplicationId,
  onSelectApplication,
  getEndorsementCount,
  isExpanded,
  onToggle,
  visibleCount,
  onShowMore,
}: CandidateJobGroupProps) {
  const remaining = applications.length - visibleCount;

  return (
    <div>
      {/* Job Group Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/30 dark:hover:bg-muted/20 transition-colors border-b border-border/20 dark:border-border"
      >
        <Briefcase className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
          {job.title}
        </span>
        <span className="text-xs font-medium text-muted-foreground/40 bg-muted/40 dark:bg-muted/30 px-1.5 py-0.5 rounded flex-shrink-0">
          {applications.length}
        </span>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-muted-foreground/40 ml-auto transition-transform duration-150 flex-shrink-0",
            !isExpanded && "-rotate-90"
          )}
        />
      </button>

      {/* Candidate Rows */}
      {isExpanded && (
        <>
          {applications.slice(0, visibleCount).map((app) => {
            const isSelected = selectedApplicationId === app.id;
            const avatarColor = getAvatarColor(app.candidate.fullName);
            const endorsements = getEndorsementCount(app);

            return (
              <button
                key={app.id}
                onClick={() => onSelectApplication(app)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 h-[52px] text-left transition-colors border-l-2",
                  isSelected
                    ? "bg-primary/[0.04] border-l-primary"
                    : "hover:bg-muted/20 dark:hover:bg-muted/20 border-l-transparent"
                )}
              >
                {/* Avatar */}
                <img
                  src={getPersonAvatar(app.candidate.fullName)}
                  alt={app.candidate.fullName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-muted"
                />

                {/* Name + subtitle */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isSelected ? "text-foreground" : "text-foreground/90"
                    )}>
                      {app.candidate.fullName}
                    </p>
                    {endorsements > 0 && (
                      <span className="text-xs font-medium text-muted-foreground/60 flex-shrink-0">
                        {endorsements}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/50 truncate leading-tight">
                    {app.candidate.headline || new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>

                {/* Status dot (8px) */}
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getCandidateStatusDot(app.status))} />
              </button>
            );
          })}

          {/* Show more */}
          {remaining > 0 && (
            <button
              type="button"
              onClick={onShowMore}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors border-b border-border/20"
            >
              Show {remaining <= 10 ? `all ${remaining}` : "10 more"} candidates
            </button>
          )}
        </>
      )}
    </div>
  );
}
