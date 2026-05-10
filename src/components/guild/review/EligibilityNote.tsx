"use client";

import { ShieldCheck } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";

export interface EligibilityNoteProps {
  /**
   * Which review variant this is. Drives the secondary copy:
   * - candidate: tells the reviewer that per-candidate staking (endorsement)
   *   is a separate optional flow.
   * - expert: tells the reviewer their existing guild stake backs this vote.
   */
  variant: "candidate" | "expert";
  /**
   * Reviewer's rank in the guild ("Senior", "Master", etc.). Falls back to
   * "Member" when unknown.
   */
  rank?: string;
  /**
   * Amount of VETD the reviewer has staked to the guild (one-time guild
   * stake, NOT per-review). Optional — when omitted, only rank is shown.
   */
  guildStakeVetd?: number;
  /**
   * Guild display name. Used in the leading clause "Senior member of <name>".
   */
  guildName?: string;
}

/**
 * Eligibility note displayed in the review form pane. Replaces the legacy
 * per-review stake input. Reinforces that:
 *   - Review eligibility comes from a one-time guild stake, not per-review staking
 *   - Outcome is rubric-driven (IQR consensus), not a per-reviewer verdict
 *   - Per-candidate endorsement staking is a separate optional flow (candidate variant only)
 */
export function EligibilityNote({
  variant,
  rank,
  guildStakeVetd,
  guildName,
}: EligibilityNoteProps) {
  const headline = variant === "candidate"
    ? "Eligible to review"
    : "Eligible to vote on memberships";

  const rankLabel = rank ? rank : "Member";
  const guildClause = guildName ? ` of ${guildName}` : "";
  const stakeClause = typeof guildStakeVetd === "number"
    ? ` · ${guildStakeVetd} VETD staked to guild`
    : "";

  const secondary = variant === "candidate"
    ? "Per-candidate stake (endorsement) is a separate optional flow if you want to back this hire post-consensus."
    : "Your existing guild stake is what backs this vote. No additional stake required.";

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border ${STATUS_COLORS.positive.border} bg-muted/30 px-3.5 py-3`}
      role="note"
      aria-label="Review eligibility"
    >
      <ShieldCheck
        className={`h-4 w-4 shrink-0 mt-0.5 ${STATUS_COLORS.positive.icon}`}
        aria-hidden="true"
      />
      <div className="text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">{headline}</span>
        <span> &mdash; {rankLabel} member{guildClause}{stakeClause}.</span>
        <p className="mt-1 text-[11px] text-muted-foreground/80">{secondary}</p>
      </div>
    </div>
  );
}
