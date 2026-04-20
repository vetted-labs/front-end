"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { GUILD_RANK_CRITERIA, GUILD_RANK_ORDER } from "@/config/constants";
import { STATUS_COLORS } from "@/config/colors";
import type { ExpertRole } from "@/types";

interface PromotionProgressCardProps {
  currentRole: ExpertRole;
  reviewCount: number;
  /** Consensus alignment percentage (0-100). */
  consensusRate: number | null;
  endorsementCount: number;
}

const RANK_LABELS: Record<string, string> = {
  recruit: "Recruit",
  apprentice: "Apprentice",
  craftsman: "Craftsman",
  officer: "Officer",
  master: "Guild Master",
};

/**
 * Compact card showing progress toward the next guild rank.
 * Whitepaper §5: Guild Hierarchy Promotion criteria.
 */
export function PromotionProgressCard({
  currentRole,
  reviewCount,
  consensusRate,
  endorsementCount,
}: PromotionProgressCardProps) {
  const currentIndex = GUILD_RANK_ORDER.indexOf(currentRole);

  // Already at max rank
  if (currentIndex >= GUILD_RANK_ORDER.length - 1) {
    return (
      <div className={`rounded-xl border ${STATUS_COLORS.warning.border} ${STATUS_COLORS.warning.bgSubtle} p-6`}>
        <div className="flex items-center gap-2 mb-1">
          <VettedIcon name="reputation" className={`w-4 h-4 ${STATUS_COLORS.warning.icon}`} />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Rank: Guild Master
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          You hold the highest rank in this guild.
        </p>
      </div>
    );
  }

  const nextRank = GUILD_RANK_ORDER[currentIndex + 1];
  const criteria = GUILD_RANK_CRITERIA[nextRank];
  if (!criteria) return null;

  const checks = [
    {
      label: "Reviews completed",
      current: reviewCount,
      required: criteria.minReviews,
      met: reviewCount >= criteria.minReviews,
      format: (v: number) => `${v}`,
    },
    {
      label: "Consensus alignment",
      current: consensusRate ?? 0,
      required: criteria.minConsensus,
      met: (consensusRate ?? 0) >= criteria.minConsensus,
      format: (v: number) => `${v}%`,
    },
    ...(criteria.minEndorsements > 0
      ? [{
          label: "Endorsements given",
          current: endorsementCount,
          required: criteria.minEndorsements,
          met: endorsementCount >= criteria.minEndorsements,
          format: (v: number) => `${v}`,
        }]
      : []),
  ];

  if (criteria.requiresElection) {
    checks.push({
      label: "Guild governance election",
      current: 0,
      required: 1,
      met: false,
      format: () => "Required",
    });
  }

  const metCount = checks.filter((c) => c.met).length;
  const allMet = metCount === checks.length;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <VettedIcon name="reputation" className="w-4 h-4 text-primary" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Next Rank: {RANK_LABELS[nextRank] ?? nextRank}
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {metCount}/{checks.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted mb-3">
        <div
          className={`h-full rounded-full transition-all ${allMet ? STATUS_COLORS.positive.bg : "bg-primary"}`}
          style={{ width: `${(metCount / checks.length) * 100}%` }}
        />
      </div>

      {/* Criteria checklist */}
      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-3">
            {check.met ? (
              <CheckCircle2 className={`w-4 h-4 ${STATUS_COLORS.positive.icon} shrink-0`} />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            )}
            <span className={`text-sm flex-1 ${check.met ? "text-foreground" : "text-muted-foreground"}`}>
              {check.label}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {check.format(check.current)} / {check.format(check.required)}
            </span>
          </div>
        ))}
      </div>

      {allMet && !criteria.requiresElection && (
        <p className={`text-xs ${STATUS_COLORS.positive.text} font-medium mt-3 pt-3 border-t border-border`}>
          All criteria met! Your promotion will be applied in the next cycle.
        </p>
      )}
    </div>
  );
}
