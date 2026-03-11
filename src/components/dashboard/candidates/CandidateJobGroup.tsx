"use client";

import { Briefcase, Award, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
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
  // Mini status breakdown for collapsed header
  const statusCounts = applications.reduce<Record<string, number>>((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  const remaining = applications.length - visibleCount;

  return (
    <div>
      {/* Clickable Job Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2 bg-muted/30 dark:bg-white/[0.02] border-b border-border/30 dark:border-white/[0.04] hover:bg-muted/50 dark:hover:bg-white/[0.04] transition-colors"
      >
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0",
            !isExpanded && "-rotate-90"
          )}
        />
        <Briefcase className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-medium text-muted-foreground truncate">{job.title}</span>
        <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">{applications.length}</span>

        {/* Mini status breakdown — shown when collapsed */}
        {!isExpanded && Object.keys(statusCounts).length > 0 && (
          <span className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            {Object.entries(statusCounts).map(([status, count]) => (
              <span
                key={status}
                className="text-[10px] font-medium text-muted-foreground"
              >
                {count} {status}
              </span>
            ))}
          </span>
        )}
      </button>

      {/* Candidate Rows — only when expanded */}
      {isExpanded && (
        <>
          {applications.slice(0, visibleCount).map((app) => {
            const config = APPLICATION_STATUS_CONFIG[app.status] || APPLICATION_STATUS_CONFIG.pending;
            const isSelected = selectedApplicationId === app.id;
            const endorsementCount = getEndorsementCount(app);

            return (
              <button
                key={app.id}
                onClick={() => onSelectApplication(app)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/20 dark:border-white/[0.03]",
                  isSelected
                    ? "bg-primary/5 border-l-2 border-l-primary"
                    : "hover:bg-muted/30 dark:hover:bg-white/[0.02] border-l-2 border-l-transparent"
                )}
              >
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-medium text-xs">
                    {app.candidate.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate">{app.candidate.fullName}</p>
                    {endorsementCount > 0 && (
                      <span className="flex items-center gap-0.5 flex-shrink-0">
                        <Award className="w-3 h-3 text-green-600 dark:text-green-400" />
                        <span className="text-[10px] font-medium text-green-600 dark:text-green-400">{endorsementCount}</span>
                      </span>
                    )}
                  </div>
                  {app.candidate.headline ? (
                    <p className="text-xs text-muted-foreground/70 truncate">{app.candidate.headline}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground truncate">
                      {new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.className} flex-shrink-0`}>
                  {config.label}
                </span>
              </button>
            );
          })}

          {/* Show more button */}
          {remaining > 0 && (
            <button
              type="button"
              onClick={onShowMore}
              className="w-full py-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors border-b border-border/20 dark:border-white/[0.03]"
            >
              Show {remaining <= 10 ? `all ${remaining}` : `${10} more`} candidates
            </button>
          )}
        </>
      )}
    </div>
  );
}
