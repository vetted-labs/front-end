"use client";

import { Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCandidateStatusDot, getMatchScoreColors } from "@/config/colors";
import { getPersonAvatar } from "@/lib/avatars";
import type { CompanyApplication } from "@/types";

function getAgingLabel(days: number): { text: string; className: string } | null {
  if (days < 3) return null;
  if (days < 7) return { text: `${days}d`, className: "text-muted-foreground/60 bg-muted/40" };
  if (days < 14) return { text: `${Math.floor(days / 7)}w`, className: "text-warning bg-warning/10" };
  return { text: `${Math.floor(days / 7)}w`, className: "text-negative bg-negative/10" };
}

interface PriorityCandidateRowProps {
  application: CompanyApplication;
  isSelected: boolean;
  onSelect: (app: CompanyApplication) => void;
  endorsementCount: number;
  endorserName?: string;
  matchScore?: number;
  subtitle: string;
  daysAgo?: number;
  selectable?: boolean;
  isChecked?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function PriorityCandidateRow({
  application,
  isSelected,
  onSelect,
  endorsementCount,
  endorserName,
  matchScore,
  subtitle,
  daysAgo,
  selectable,
  isChecked,
  onToggleSelect,
}: PriorityCandidateRowProps) {
  return (
    <button
      onClick={() => onSelect(application)}
      className={cn(
        "w-full flex items-center gap-3 px-4 h-[60px] text-left transition-colors border-l-2",
        isSelected
          ? "bg-primary/[0.04] border-l-primary"
          : "hover:bg-muted/20 dark:hover:bg-muted/20 border-l-transparent"
      )}
    >
      {/* Bulk-select checkbox */}
      {selectable && (
        <span
          role="presentation"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(application.id);
          }}
          className="flex-shrink-0"
        >
          <input
            type="checkbox"
            checked={!!isChecked}
            onChange={() => onToggleSelect?.(application.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${application.candidate.fullName}`}
            className="w-4 h-4 rounded border border-border accent-primary cursor-pointer"
          />
        </span>
      )}

      {/* Avatar */}
      <img
        src={getPersonAvatar(application.candidate.fullName)}
        alt={application.candidate.fullName}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0 bg-muted"
      />

      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-sm font-medium truncate",
              isSelected ? "text-foreground" : "text-foreground/90"
            )}
          >
            {application.candidate.fullName}
          </p>
          {endorsementCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-positive bg-positive/10 px-1.5 py-0.5 rounded-full flex-shrink-0 max-w-[180px]">
              <Award className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {endorserName
                  ? `${endorsementCount} · ${endorserName}`
                  : endorsementCount}
              </span>
            </span>
          )}
          {matchScore != null && (
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0",
                getMatchScoreColors(matchScore).badge
              )}
            >
              {matchScore}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground/50 truncate leading-tight">
          {subtitle}
        </p>
      </div>

      {/* Aging label + Status dot */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {daysAgo != null && (() => {
          const aging = getAgingLabel(daysAgo);
          if (!aging) return null;
          return (
            <span className={cn("text-[10px] font-medium px-1 py-0.5 rounded", aging.className)}>
              {aging.text}
            </span>
          );
        })()}
        <div className={cn("w-2 h-2 rounded-full", getCandidateStatusDot(application.status))} />
      </div>
    </button>
  );
}
