"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, Users, ChevronsUpDown } from "lucide-react";
import { CandidateJobGroup } from "./CandidateJobGroup";
import { EmptyState } from "@/components/ui/empty-state";
import type { CompanyApplication, CandidateSortOption, GroupedJob } from "@/types";

const GROUPS_PER_PAGE = 5;
const INITIAL_CANDIDATES_PER_GROUP = 5;
const SHOW_MORE_INCREMENT = 10;

interface CandidateListPanelProps {
  groupedJobs: GroupedJob[];
  selectedApplicationId: string | null;
  onSelectApplication: (app: CompanyApplication) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatus: string;
  onFilterChange: (status: string) => void;
  isLoading: boolean;
  getEndorsementCount: (app: CompanyApplication) => number;
  uniqueGuilds: string[];
  filterGuild: string;
  onGuildFilterChange: (guild: string) => void;
  sortBy: CandidateSortOption;
  onSortChange: (sort: CandidateSortOption) => void;
  expandedJobIds: Set<string>;
  onToggleJob: (jobId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
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
  getEndorsementCount,
  uniqueGuilds,
  filterGuild,
  onGuildFilterChange,
  sortBy,
  onSortChange,
  expandedJobIds,
  onToggleJob,
  onExpandAll,
  onCollapseAll,
}: CandidateListPanelProps) {
  const totalApplications = groupedJobs.reduce((sum, g) => sum + g.applications.length, 0);

  // Progressive rendering — show first N groups, load more on scroll
  const [visibleCount, setVisibleCount] = useState(GROUPS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Per-group visible candidate counts
  const [groupVisibleCounts, setGroupVisibleCounts] = useState<Record<string, number>>({});

  // Reset visible counts when filters change
  // eslint-disable-next-line no-restricted-syntax -- resets pagination when filtered dataset changes
  useEffect(() => {
    setVisibleCount(GROUPS_PER_PAGE);
    setGroupVisibleCounts({});
  }, [groupedJobs]);

  const hasMore = visibleCount < groupedJobs.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + GROUPS_PER_PAGE, groupedJobs.length));
  }, [groupedJobs.length]);

  // IntersectionObserver to trigger loading more groups
  // eslint-disable-next-line no-restricted-syntax -- DOM subscription with changing dependency
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const visibleGroups = groupedJobs.slice(0, visibleCount);

  const getVisibleCount = (jobId: string) =>
    groupVisibleCounts[jobId] ?? INITIAL_CANDIDATES_PER_GROUP;

  const handleShowMore = (jobId: string, totalInGroup: number) => {
    setGroupVisibleCounts((prev) => {
      const current = prev[jobId] ?? INITIAL_CANDIDATES_PER_GROUP;
      const remaining = totalInGroup - current;
      const increment = remaining <= SHOW_MORE_INCREMENT ? remaining : SHOW_MORE_INCREMENT;
      return { ...prev, [jobId]: current + increment };
    });
  };

  const selectClasses =
    "flex-1 min-w-0 px-2.5 py-1.5 text-xs font-medium rounded-md bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-primary/40 text-muted-foreground appearance-none cursor-pointer";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header controls */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        {/* Search */}
        <div className="relative mb-2.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30 text-foreground placeholder:text-muted-foreground/40 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-2">
          <select
            value={filterGuild}
            onChange={(e) => onGuildFilterChange(e.target.value)}
            className={selectClasses}
          >
            <option value="all">All Guilds</option>
            {uniqueGuilds.map((guild) => (
              <option key={guild} value={guild}>
                {guild}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => onFilterChange(e.target.value)}
            className={selectClasses}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="interviewed">Interviewed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Sort + expand/collapse */}
        <div className="flex items-center gap-2 pb-2.5 border-b border-border/20 dark:border-border">
          <span className="text-xs font-medium text-muted-foreground/40">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as CandidateSortOption)}
            className="bg-transparent border-none text-xs font-medium text-muted-foreground focus:outline-none cursor-pointer appearance-none pr-3"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='7' height='4' viewBox='0 0 7 4' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l2.5 2.5L6 1' stroke='%236b7280' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0 center",
            }}
          >
            <option value="endorsements">Endorsements</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A-Z</option>
          </select>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground/40 tabular-nums">{totalApplications}</span>
            <button
              type="button"
              onClick={expandedJobIds.size === groupedJobs.length ? onCollapseAll : onExpandAll}
              className="flex items-center justify-center w-6 h-6 text-muted-foreground/40 hover:text-foreground rounded transition-colors"
              title={expandedJobIds.size === groupedJobs.length ? "Collapse all" : "Expand all"}
              aria-label={expandedJobIds.size === groupedJobs.length ? "Collapse all groups" : "Expand all groups"}
            >
              <ChevronsUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/40" />
          </div>
        ) : groupedJobs.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No candidates found"
            description="Try adjusting your search or filters"
          />
        ) : (
          <>
            {visibleGroups.map((group) => (
              <CandidateJobGroup
                key={group.job.id}
                job={group.job}
                applications={group.applications}
                selectedApplicationId={selectedApplicationId}
                onSelectApplication={onSelectApplication}
                getEndorsementCount={getEndorsementCount}
                isExpanded={expandedJobIds.has(group.job.id)}
                onToggle={() => onToggleJob(group.job.id)}
                visibleCount={getVisibleCount(group.job.id)}
                onShowMore={() => handleShowMore(group.job.id, group.applications.length)}
              />
            ))}
            {hasMore && (
              <div ref={sentinelRef} className="flex items-center justify-center py-4">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground/30" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
