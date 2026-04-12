"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

const INITIAL_NEW_VISIBLE = 15;

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
  sectionId: string;
  label: string;
  count: number;
  badgeClassName: string;
  isCollapsed: boolean;
  onToggle: () => void;
  hint?: string;
  items: CompanyApplication[];
  selectedIds: Set<string>;
  onSelectAll: (apps: CompanyApplication[]) => void;
  onDeselectAll: (apps: CompanyApplication[]) => void;
  trailing?: React.ReactNode;
}

function SectionHeader({
  sectionId,
  label,
  count,
  badgeClassName,
  isCollapsed,
  onToggle,
  hint,
  items,
  selectedIds,
  onSelectAll,
  onDeselectAll,
  trailing,
}: SectionHeaderProps) {
  const allSelected = items.length > 0 && items.every((a) => selectedIds.has(a.id));

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
      {items.length > 0 && (
        <span
          role="presentation"
          onClick={(e) => {
            e.stopPropagation();
            if (allSelected) onDeselectAll(items);
            else onSelectAll(items);
          }}
          className="flex-shrink-0"
        >
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => {
              if (allSelected) onDeselectAll(items);
              else onSelectAll(items);
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select all ${sectionId}`}
            className="w-3.5 h-3.5 rounded border border-border/60 accent-primary cursor-pointer"
          />
        </span>
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
  const [newVisibleCount, setNewVisibleCount] = useState(INITIAL_NEW_VISIBLE);
  const [showFastReview, setShowFastReview] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActioning, setIsBulkActioning] = useState(false);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll(apps: CompanyApplication[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const app of apps) next.add(app.id);
      return next;
    });
  }

  function deselectAll(apps: CompanyApplication[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const app of apps) next.delete(app.id);
      return next;
    });
  }

  async function handleBulkAction(newStatus: ApplicationStatus) {
    if (!onStatusChange) return;
    setIsBulkActioning(true);
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(
      ids.map((id) => onStatusChange(id, newStatus))
    );
    const failCount = results.filter((r) => r.status === "rejected").length;
    if (failCount > 0) {
      toast.error(`${failCount} of ${ids.length} updates failed`);
    }
    setSelectedIds(new Set());
    setIsBulkActioning(false);
  }

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

  const visibleNew = newCandidates.slice(0, newVisibleCount);
  const newRemaining = newCandidates.length - newVisibleCount;

  return (
    <div>
      {/* ── In Progress ─────────────────────────────────────────── */}
      <div>
        <SectionHeader
          sectionId="in-progress"
          label="In Progress"
          count={inProgress.length}
          badgeClassName="text-info-blue bg-info-blue/10"
          isCollapsed={collapsedSections.has("in-progress")}
          onToggle={() => toggleSection("in-progress")}
          items={inProgress}
          selectedIds={selectedIds}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
        />

        {!collapsedSections.has("in-progress") &&
          inProgress.map((app) => (
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
              selectable
              isChecked={selectedIds.has(app.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
      </div>

      {/* ── Top Picks ───────────────────────────────────────────── */}
      {topPicks.length > 0 && (
        <div className="border-t border-border/20 mt-1">
          <SectionHeader
            sectionId="top-picks"
            label="Top Picks"
            count={topPicks.length}
            badgeClassName="text-positive bg-positive/10"
            isCollapsed={collapsedSections.has("top-picks")}
            onToggle={() => toggleSection("top-picks")}
            hint="endorsed by guild experts"
            items={topPicks}
            selectedIds={selectedIds}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
          />

          {!collapsedSections.has("top-picks") &&
            topPicks.map((app) => (
              <PriorityCandidateRow
                key={app.id}
                application={app}
                isSelected={selectedApplicationId === app.id}
                onSelect={onSelectApplication}
                endorsementCount={getEndorsementCount(app)}
                endorserName={getTopEndorserName(app)}
                matchScore={getMatchScore(app)}
                subtitle={`${app.job.title} · Pending`}
                selectable
                isChecked={selectedIds.has(app.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
        </div>
      )}

      {/* ── New ─────────────────────────────────────────────────── */}
      <div className="border-t border-border/20 mt-1">
        <SectionHeader
          sectionId="new"
          label="New"
          count={newCandidates.length}
          badgeClassName="text-muted-foreground bg-muted/60"
          isCollapsed={collapsedSections.has("new")}
          onToggle={() => toggleSection("new")}
          hint="pending review"
          items={visibleNew}
          selectedIds={selectedIds}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
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
            {visibleNew.map((app) => (
              <PriorityCandidateRow
                key={app.id}
                application={app}
                isSelected={selectedApplicationId === app.id}
                onSelect={onSelectApplication}
                endorsementCount={getEndorsementCount(app)}
                endorserName={getTopEndorserName(app)}
                matchScore={getMatchScore(app)}
                subtitle={`${app.job.title} · ${formatShortDate(app.appliedAt)}`}
                selectable
                isChecked={selectedIds.has(app.id)}
                onToggleSelect={toggleSelect}
              />
            ))}

            {newRemaining > 0 && (
              <button
                type="button"
                onClick={() =>
                  setNewVisibleCount((prev) => prev + INITIAL_NEW_VISIBLE)
                }
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors border-b border-border/20"
              >
                Show {newRemaining} more candidate{newRemaining !== 1 ? "s" : ""}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Bulk Action Bar ───────────────────────��──────────── */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 mx-4 mb-2 flex items-center gap-2 p-2.5 rounded-xl bg-background border border-border shadow-lg">
          <span className="text-xs font-medium text-foreground tabular-nums">
            {selectedIds.size} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkAction("reviewing")}
              disabled={isBulkActioning}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-positive/10 text-positive hover:bg-positive/20 border border-positive/20 transition-colors disabled:opacity-50"
            >
              Advance
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction("rejected")}
              disabled={isBulkActioning}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-negative/10 text-negative hover:bg-negative/20 border border-negative/20 transition-colors disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-medium px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

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
