"use client";

import type {
  AnalyticsCandidate,
  AnalyticsDisagreement,
  AnalyticsReview,
} from "@/types/analytics";
import { STATUS_COLORS } from "@/config/colors";
import { calculateScoreSpread } from "./job-detail-helpers";

interface OutlierPanelProps {
  candidates: AnalyticsCandidate[];
  disagreement: AnalyticsDisagreement;
}

type FlagSeverity = AnalyticsDisagreement["flags"][number]["severity"];

const SEVERITY_RANK: Record<FlagSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Severity drives both sort order and the chip color so the panel reads
 *  at a glance — high disagreement is the loudest signal. */
function severityChipClass(severity: FlagSeverity): string {
  switch (severity) {
    case "high":
      return STATUS_COLORS.negative.badge;
    case "medium":
      return STATUS_COLORS.warning.badge;
    case "low":
    default:
      return STATUS_COLORS.info.badge;
  }
}

/** Reviewers that pulled away from consensus or forced a tiebreaker — the
 *  exact set the company most needs to read up on before deciding. */
function getDissentingReviews(candidate: AnalyticsCandidate | undefined): AnalyticsReview[] {
  if (!candidate) return [];
  return candidate.reviews.filter(
    (review) =>
      review.alignmentState === "dissenting" ||
      review.alignmentState === "tiebreaker_required",
  );
}

function formatScore(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return String(Math.round(value));
}

/**
 * VET-85: lists candidates with dissenting reviewers or tiebreaker flags.
 * Ranked by severity so high-disagreement candidates surface first.
 */
export function OutlierPanel({ candidates, disagreement }: OutlierPanelProps) {
  if (disagreement.status !== "available") {
    const message =
      disagreement.status === "alignment_unavailable"
        ? "Reviewer alignment isn't tracked for this role yet, so disagreement can't be analyzed."
        : "Not enough reviewer overlap yet to flag dissent. Once more experts review the same candidates, disagreements will appear here.";
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        {message}
      </div>
    );
  }

  if (disagreement.flags.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        No team disagreement detected on this role yet — every candidate has aligned reviews.
      </div>
    );
  }

  const sortedFlags = [...disagreement.flags].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );

  return (
    <ul className="grid gap-3">
      {sortedFlags.map((flag) => {
        const candidate = candidates.find((c) => c.id === flag.candidateRowId);
        const dissenters = getDissentingReviews(candidate);
        const consensusScore = candidate?.vettingScore ?? null;
        const spread = candidate ? calculateScoreSpread(candidate) : null;

        return (
          <li
            key={flag.candidateRowId}
            className="rounded-md border border-border bg-background p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {flag.candidateName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{flag.message}</p>
              </div>
              <span
                className={`inline-flex h-6 flex-none items-center rounded-full px-2 text-[11px] font-semibold uppercase tracking-wide ${severityChipClass(flag.severity)}`}
              >
                {flag.severity}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                Consensus{" "}
                <span className="font-semibold text-foreground">{formatScore(consensusScore)}</span>
              </span>
              {spread ? (
                <span>
                  Spread{" "}
                  <span className="font-semibold text-foreground">
                    {spread.min}–{spread.max}
                  </span>{" "}
                  ({spread.reviewCount} reviews)
                </span>
              ) : null}
            </div>

            {dissenters.length > 0 ? (
              <div className="mt-3 border-t border-border/60 pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Dissenting reviewers
                </p>
                <ul className="mt-1 grid gap-1">
                  {dissenters.map((review) => (
                    <li
                      key={review.reviewId}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="truncate text-foreground">{review.publicName}</span>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span>
                          score{" "}
                          <span className="font-semibold text-foreground">
                            {formatScore(review.score)}
                          </span>
                        </span>
                        {review.alignmentState === "tiebreaker_required" ? (
                          <span
                            className={`inline-flex h-5 items-center rounded-full px-1.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_COLORS.warning.badge}`}
                          >
                            tiebreaker
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
