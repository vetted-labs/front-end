"use client";

import { cn } from "@/lib/utils";
import { VettedIcon } from "@/components/ui/vetted-icon";
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
}

export function PriorityCandidateRow({
  application,
  isSelected,
  onSelect,
  endorsementCount,
  matchScore,
  subtitle,
  daysAgo,
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

      {/* Endorsements + Aging label + Status dot */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {endorsementCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-positive bg-positive/15 border border-positive/30 px-2 py-1 rounded-md flex-shrink-0">
            <VettedIcon name="endorsement" className="w-3.5 h-3.5 flex-shrink-0" />
            {endorsementCount}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/40 bg-muted/20 px-2 py-1 rounded-md flex-shrink-0">
            <VettedIcon name="vet-talent" className="w-3.5 h-3.5" />
            0
          </span>
        )}
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
