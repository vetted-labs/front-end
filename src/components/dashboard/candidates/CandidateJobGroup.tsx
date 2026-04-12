"use client";

import { useState, useMemo } from "react";
import { Briefcase, ChevronDown, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCandidateStatusDot } from "@/config/colors";
import { getPersonAvatar } from "@/lib/avatars";
import { MatchScoreBadge } from "@/components/ui/match-score-badge";
import type { CompanyApplication } from "@/types";

interface CandidateJobGroupProps {
  job: CompanyApplication["job"];
  applications: CompanyApplication[];
  selectedApplicationId: string | null;
  onSelectApplication: (app: CompanyApplication) => void;
  getEndorsementCount: (app: CompanyApplication) => number;
  getMatchScore: (app: CompanyApplication) => number | undefined;
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
  getMatchScore,
  isExpanded,
  onToggle,
  visibleCount,
  onShowMore,
}: CandidateJobGroupProps) {
  type GroupSortOption = "endorsements" | "match" | "newest" | "name";
  const [localSort, setLocalSort] = useState<GroupSortOption>("endorsements");

  const sortedApplications = useMemo(() => {
    const sorted = [...applications];
    sorted.sort((a, b) => {
      switch (localSort) {
        case "endorsements": {
          const aCount = getEndorsementCount(a);
          const bCount = getEndorsementCount(b);
          return bCount - aCount;
        }
        case "match": {
          const aScore = getMatchScore(a) ?? -1;
          const bScore = getMatchScore(b) ?? -1;
          return bScore - aScore;
        }
        case "newest":
          return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
        case "name":
          return a.candidate.fullName.localeCompare(b.candidate.fullName);
      }
    });
    return sorted;
  }, [applications, localSort, getEndorsementCount, getMatchScore]);

  const remaining = sortedApplications.length - visibleCount;

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
        {isExpanded && (
          <select
            value={localSort}
            onChange={(e) => {
              e.stopPropagation();
              setLocalSort(e.target.value as GroupSortOption);
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] font-medium text-muted-foreground/60 bg-transparent border-none focus:outline-none cursor-pointer appearance-none pl-1 pr-3"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='7' height='4' viewBox='0 0 7 4' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l2.5 2.5L6 1' stroke='%236b7280' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0 center",
            }}
          >
            <option value="endorsements">By endorsements</option>
            <option value="match">By match score</option>
            <option value="newest">By newest</option>
            <option value="name">By name</option>
          </select>
        )}
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
          {sortedApplications.slice(0, visibleCount).map((app) => {
            const isSelected = selectedApplicationId === app.id;
            const endorsements = getEndorsementCount(app);
            const matchScore = getMatchScore(app);

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
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-positive bg-positive/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        <Award className="w-3 h-3" />
                        {endorsements}
                      </span>
                    )}
                    {matchScore !== undefined && (
                      <MatchScoreBadge score={matchScore} compact />
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
