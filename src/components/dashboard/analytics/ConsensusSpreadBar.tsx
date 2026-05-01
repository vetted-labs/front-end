"use client";

import type { CSSProperties } from "react";
import type { AnalyticsCandidate } from "@/types/analytics";
import { cssHsl, cssHslAlpha } from "@/lib/chartTokens";
import { calculateScoreSpread } from "./job-detail-helpers";

interface ConsensusSpreadBarProps {
  candidate: AnalyticsCandidate;
}

// Reviewer scores in the analytics contract live on the 0–100 scale.
// Anchoring the track to that range keeps spreads visually comparable across
// candidates (a width of 14 always paints the same fraction of the bar).
const SCORE_MIN = 0;
const SCORE_MAX = 100;
const SCORE_RANGE = SCORE_MAX - SCORE_MIN;

const TIGHT_THRESHOLD = 10;
const MEDIUM_THRESHOLD = 20;

/** Pick a chart token whose semantic meaning matches the team's tightness. */
function spreadToneToken(width: number): "positive" | "warning" | "negative" {
  if (width < TIGHT_THRESHOLD) return "positive";
  if (width < MEDIUM_THRESHOLD) return "warning";
  return "negative";
}

function clampPercent(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

/**
 * VET-85: per-candidate consensus-spread bar — tighter = stronger team
 * agreement, wider = team is split. Rendered inline under the score in the
 * candidate ranking table.
 */
export function ConsensusSpreadBar({ candidate }: ConsensusSpreadBarProps) {
  const spread = calculateScoreSpread(candidate);
  if (!spread) return null;

  const tone = spreadToneToken(spread.width);
  const fillColor = cssHsl(tone);
  const trackColor = cssHslAlpha("muted-foreground", 0.18);
  const tickColor = cssHsl("foreground");

  const leftPct = clampPercent(((spread.min - SCORE_MIN) / SCORE_RANGE) * 100);
  const widthPct = clampPercent((spread.width / SCORE_RANGE) * 100);
  // Spreads of 0 still need a visible nub so a unanimous team isn't invisible.
  const renderedWidthPct = Math.max(widthPct, 1.5);

  const consensusPct =
    spread.consensus != null
      ? clampPercent(((spread.consensus - SCORE_MIN) / SCORE_RANGE) * 100)
      : null;

  const trackStyle: CSSProperties = {
    backgroundColor: trackColor,
  };
  const fillStyle: CSSProperties = {
    left: `${leftPct}%`,
    width: `${renderedWidthPct}%`,
    backgroundColor: fillColor,
  };
  const tickStyle: CSSProperties | null =
    consensusPct != null
      ? {
          left: `calc(${consensusPct}% - 1px)`,
          backgroundColor: tickColor,
        }
      : null;

  const ariaLabel =
    spread.consensus != null
      ? `Reviewer scores from ${spread.min} to ${spread.max}, consensus ${Math.round(spread.consensus)} across ${spread.reviewCount} reviews`
      : `Reviewer scores from ${spread.min} to ${spread.max} across ${spread.reviewCount} reviews`;

  return (
    <span
      className="relative block h-1.5 w-full overflow-hidden rounded-full"
      style={trackStyle}
      role="img"
      aria-label={ariaLabel}
    >
      <span
        className="absolute top-0 bottom-0 rounded-full"
        style={fillStyle}
      />
      {tickStyle ? (
        <span
          className="absolute top-0 bottom-0 w-[2px] rounded-full"
          style={tickStyle}
        />
      ) : null}
    </span>
  );
}
