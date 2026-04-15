"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { PriorityCandidateRow } from "./PriorityCandidateRow";
import { FastReviewModal } from "./FastReviewModal";
import type { CompanyApplication, ApplicationStatus } from "@/types";

interface PrioritySectionsProps {
  inProgress: CompanyApplication[];
  topPicks: CompanyApplication[];
  newCandidates: CompanyApplication[];
  selectedApplicationId: string | null;
  onSelectApplication: (app: CompanyApplication) => void;
  getEndorsementCount: (app: CompanyApplication) => number;
  getTopEndorserName: (app: CompanyApplication) => string | undefined;
  getMatchScore: (app: CompanyApplication) => number | undefined;
  onStatusChange?: (applicationId: string, newStatus: ApplicationStatus) => Promise<void>;
}

const PER_PAGE = 10;

function capitalizeStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getDaysAgo(dateStr: string): number {
  const now = new Date();
  const then = new Date(dateStr);
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/* ── Reusable section header ──────────────────────────────────────── */

interface SectionHeaderProps {
  label: string;
  count: number;
  badgeClassName: string;
  isCollapsed: boolean;
  onToggle: () => void;
  hint?: string;
  trailing?: React.ReactNode;
}

function SectionHeader({
  label,
  count,
  badgeClassName,
  isCollapsed,
  onToggle,
  hint,
  trailing,
}: SectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-4 pt-3 pb-1.5 flex items-center gap-2"
    >
      <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", badgeClassName)}>
        {count}
      </span>
      {hint && (
        <span className="text-[10px] text-muted-foreground/40">{hint}</span>
      )}
      {trailing}
      <ChevronDown
        className={cn(
          "w-3 h-3 text-muted-foreground/40 transition-transform duration-150",
          !trailing && "ml-auto",
          isCollapsed && "-rotate-90"
        )}
      />
    </button>
  );
}

/* ── Pagination controls ─────────────────────────────────────────── */

function SectionPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-1.5 px-4">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums">
        {currentPage} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
        aria-label="Next page"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────── */

export function PrioritySections({
  inProgress,
  topPicks,
  newCandidates,
  selectedApplicationId,
  onSelectApplication,
  getEndorsementCount,
  getTopEndorserName,
  getMatchScore,
  onStatusChange,
}: PrioritySectionsProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set()
  );
  const [showFastReview, setShowFastReview] = useState(false);

  // Per-section pagination
  const inProgressPagination = useClientPagination(inProgress, PER_PAGE);
  const topPicksPagination = useClientPagination(topPicks, PER_PAGE);
  const newPagination = useClientPagination(newCandidates, PER_PAGE);

  function toggleSection(section: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }

  return (
    <div className="min-h-full">
      {/* ── In Progress ─────────────────────────────────────────── */}
      <div>
        <SectionHeader
          label="In Progress"
          count={inProgress.length}
          badgeClassName="text-info-blue bg-info-blue/10"
          isCollapsed={collapsedSections.has("in-progress")}
          onToggle={() => toggleSection("in-progress")}
        />

        {!collapsedSections.has("in-progress") && (
          <>
            {inProgressPagination.paginatedItems.map((app) => (
              <PriorityCandidateRow
                key={app.id}
                application={app}
                isSelected={selectedApplicationId === app.id}
                onSelect={onSelectApplication}
                endorsementCount={getEndorsementCount(app)}
                endorserName={getTopEndorserName(app)}
                matchScore={getMatchScore(app)}
                subtitle={`${app.job.title} · ${capitalizeStatus(app.status)}`}
                daysAgo={getDaysAgo(app.statusChangedAt ?? app.appliedAt)}
              />
            ))}
            <SectionPagination
              currentPage={inProgressPagination.currentPage}
              totalPages={inProgressPagination.totalPages}
              onPageChange={inProgressPagination.setCurrentPage}
            />
          </>
        )}
      </div>

      {/* ── Top Picks ───────────────────────────────────────────── */}
      {topPicks.length > 0 && (
        <div className="border-t border-border/20 mt-1">
          <SectionHeader
            label="Top Picks"
            count={topPicks.length}
            badgeClassName="text-positive bg-positive/10"
            isCollapsed={collapsedSections.has("top-picks")}
            onToggle={() => toggleSection("top-picks")}
            hint="endorsed by guild experts"
          />

          {!collapsedSections.has("top-picks") && (
            <>
              {topPicksPagination.paginatedItems.map((app) => (
                <PriorityCandidateRow
                  key={app.id}
                  application={app}
                  isSelected={selectedApplicationId === app.id}
                  onSelect={onSelectApplication}
                  endorsementCount={getEndorsementCount(app)}
                  endorserName={getTopEndorserName(app)}
                  matchScore={getMatchScore(app)}
                  subtitle={`${app.job.title} · Pending`}
                />
              ))}
              <SectionPagination
                currentPage={topPicksPagination.currentPage}
                totalPages={topPicksPagination.totalPages}
                onPageChange={topPicksPagination.setCurrentPage}
              />
            </>
          )}
        </div>
      )}

      {/* ── New ─────────────────────────────────────────────────── */}
      <div className="border-t border-border/20 mt-1">
        <SectionHeader
          label="New"
          count={newCandidates.length}
          badgeClassName="text-muted-foreground bg-muted/60"
          isCollapsed={collapsedSections.has("new")}
          onToggle={() => toggleSection("new")}
          hint="pending review"
          trailing={
            newCandidates.length > 0 && onStatusChange ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFastReview(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowFastReview(true);
                  }
                }}
                className="text-[10px] font-medium text-primary hover:text-primary/80 ml-auto mr-6 transition-colors cursor-pointer"
              >
                Fast Review
              </span>
            ) : undefined
          }
        />

        {!collapsedSections.has("new") && (
          <>
            {newPagination.paginatedItems.map((app) => (
              <PriorityCandidateRow
                key={app.id}
                application={app}
                isSelected={selectedApplicationId === app.id}
                onSelect={onSelectApplication}
                endorsementCount={getEndorsementCount(app)}
                endorserName={getTopEndorserName(app)}
                matchScore={getMatchScore(app)}
                subtitle={`${app.job.title} · ${formatShortDate(app.appliedAt)}`}
              />
            ))}
            <SectionPagination
              currentPage={newPagination.currentPage}
              totalPages={newPagination.totalPages}
              onPageChange={newPagination.setCurrentPage}
            />
          </>
        )}
      </div>

      {showFastReview && onStatusChange && (
        <FastReviewModal
          candidates={newCandidates}
          onStatusChange={onStatusChange}
          onClose={() => setShowFastReview(false)}
          getEndorsementCount={getEndorsementCount}
          getMatchScore={getMatchScore}
          endorserName={getTopEndorserName}
        />
      )}
    </div>
  );
}
