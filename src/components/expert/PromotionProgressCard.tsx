"use client";

import { TrendingUp, CheckCircle2, Circle } from "lucide-react";
import { GUILD_RANK_CRITERIA, GUILD_RANK_ORDER } from "@/config/constants";
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
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-amber-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
    <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
          className={`h-full rounded-full transition-all ${allMet ? "bg-green-500" : "bg-primary"}`}
          style={{ width: `${(metCount / checks.length) * 100}%` }}
        />
      </div>

      {/* Criteria checklist */}
      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2.5">
            {check.met ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
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
        <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-3 pt-3 border-t border-border/40">
          All criteria met! Your promotion will be applied in the next cycle.
        </p>
      )}
    </div>
  );
}
