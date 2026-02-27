"use client";

import { Search, Loader2, Users } from "lucide-react";
import { CandidateJobGroup } from "./CandidateJobGroup";
import { EmptyState } from "@/components/ui/empty-state";
import type { CompanyApplication } from "@/types";

interface GroupedJob {
  job: CompanyApplication["job"];
  applications: CompanyApplication[];
}

interface CandidateListPanelProps {
  groupedJobs: GroupedJob[];
  selectedApplicationId: string | null;
  onSelectApplication: (app: CompanyApplication) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatus: string;
  onFilterChange: (status: string) => void;
  isLoading: boolean;
  isEndorsed: (app: CompanyApplication) => boolean;
}

export function CandidateListPanel({
  groupedJobs,
  selectedApplicationId,
  onSelectApplication,
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterChange,
  isLoading,
  isEndorsed,
}: CandidateListPanelProps) {
  const totalApplications = groupedJobs.reduce((sum, g) => sum + g.applications.length, 0);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border/40">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Candidates
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">{totalApplications}</span>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-background/60 dark:bg-white/[0.04] border border-border/60 dark:border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => onFilterChange(e.target.value)}
          className="w-full px-3 py-1.5 text-sm rounded-lg bg-background/60 dark:bg-white/[0.04] border border-border/60 dark:border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="reviewing">Reviewing</option>
          <option value="interviewed">Interviewed</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : groupedJobs.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No candidates found"
            description="Try adjusting your search or filters"
          />
        ) : (
          groupedJobs.map((group) => (
            <CandidateJobGroup
              key={group.job.id}
              job={group.job}
              applications={group.applications}
              selectedApplicationId={selectedApplicationId}
              onSelectApplication={onSelectApplication}
              isEndorsed={isEndorsed}
            />
          ))
        )}
      </div>
    </div>
  );
}
