"use client";

import type { CSSProperties } from "react";

import type { AnalyticsEndorsementCorrelation } from "@/types";
import { cssHsl, cssHslAlpha, cssMotionStyle } from "@/lib/chartTokens";

interface TraitEndorsementCorrelationProps {
  correlation: AnalyticsEndorsementCorrelation;
}

type CorrelationItem = AnalyticsEndorsementCorrelation["items"][number];

/** Plain-language gloss for a tooltip — keeps reading-comprehension fast. */
function describeCorrelation(value: number): string {
  const magnitude = Math.abs(value);
  const direction = value >= 0 ? "tracks endorsement" : "reverse signal";
  if (magnitude >= 0.7) return `strongly ${direction}`;
  if (magnitude >= 0.4) return `${direction}`;
  if (magnitude >= 0.2) return `mild ${direction}`;
  return "weak / noisy signal";
}

/** Format `+0.72`, `-0.18`, `0.00`. */
function formatCorrelation(value: number): string {
  const fixed = value.toFixed(2);
  if (value > 0) return `+${fixed}`;
  return fixed;
}

/**
 * VET-91: trait↔endorsement correlation visualization.
 *
 * Two stacked sub-views over the same 1-D vector of `{ label, correlation }`:
 *   1. Heat strip — one square cell per trait, tinted by sign + magnitude.
 *   2. Divergent bar chart — sorted by |correlation| desc, axis at 0,
 *      positive bars right (positive token), negative bars left (negative).
 *
 * Why a strip + a divergent bar (not a matrix heatmap):
 *   The data is one-dimensional (trait → scalar). A 2-D heatmap would imply
 *   a matrix that doesn't exist. The strip gives at-a-glance scanning of
 *   sign/intensity; the divergent bar gives precise, sortable comparison.
 *
 * Color tokens come exclusively from `chartTokens.ts` (`cssHsl`,
 * `cssHslAlpha`) — no raw Tailwind color names. Animation uses the shared
 * `cssMotionStyle` for stagger; keyframes are scoped inline so we don't
 * touch globals.css.
 *
 * Tooltips: native `title` attribute. Cheap, screen-reader-friendly, and
 * avoids pulling in a tooltip primitive for 4–6 cells.
 */
export function TraitEndorsementCorrelation({
  correlation,
}: TraitEndorsementCorrelationProps) {
  if (
    correlation.status === "insufficient_data" ||
    correlation.items.length === 0
  ) {
    return (
      <div
        className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground"
        role="status"
      >
        {correlation.message ??
          "Need more endorsed candidates to compute correlation."}
      </div>
    );
  }

  const items = correlation.items;
  // Bottom view: divergent bars sorted by absolute strength so the
  // most-load-bearing traits anchor the top of the list.
  const sortedByMagnitude: CorrelationItem[] = [...items].sort(
    (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation),
  );
  const remountKey = items.map((i) => i.criterionId).join("|");

  return (
    <div className="grid gap-6">
      {/*
        Scoped keyframes for both sub-views:
          - vet-corr-cell-in: heat-strip cells fade + lift in.
          - vet-corr-bar-grow: divergent bars grow from the center axis to
            their target width via a CSS variable.
      */}
      <style>{`
        @keyframes vet-corr-cell-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes vet-corr-bar-grow {
          from { width: 0%; }
          to   { width: var(--bar-width, 0%); }
        }
      `}</style>

      {/* ── Heat strip ────────────────────────────────────────────── */}
      <div>
        <div
          key={`strip-${remountKey}`}
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          }}
          aria-label="Trait correlation heat strip"
          role="list"
        >
          {items.map((item, index) => {
            const magnitude = Math.min(1, Math.abs(item.correlation));
            const isPositive = item.correlation >= 0;
            const token = isPositive ? "positive" : "negative";
            // Floor the alpha so very weak correlations still render with
            // visible (but clearly muted) tint rather than washing to white.
            const alpha = Math.max(0.12, magnitude);
            const cellStyle: CSSProperties = {
              ...cssMotionStyle(index, "heatmap"),
              animationName: "vet-corr-cell-in",
              backgroundColor: cssHslAlpha(token, alpha),
              borderColor: cssHslAlpha(token, Math.min(1, alpha + 0.15)),
            };
            // High-opacity cells need a light text color for contrast;
            // weaker tints can keep the foreground token.
            const textColor =
              magnitude >= 0.55 ? cssHsl("card") : cssHsl("foreground");
            const tooltip = `${item.label}: ${formatCorrelation(item.correlation)} → ${describeCorrelation(item.correlation)}`;

            return (
              <div
                key={item.criterionId}
                role="listitem"
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="flex aspect-square w-full items-center justify-center rounded-md border text-base font-semibold tabular-nums shadow-sm transition-transform duration-150 hover:-translate-y-0.5"
                  style={{ ...cellStyle, color: textColor }}
                  title={tooltip}
                  aria-label={tooltip}
                >
                  {formatCorrelation(item.correlation)}
                </div>
                <span
                  className="line-clamp-2 text-center text-xs leading-tight text-muted-foreground"
                  title={item.label}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend strip — orients the reader on the sign convention. */}
        <div
          className="mt-4 flex items-center justify-between gap-3 text-[11px] uppercase tracking-wide text-muted-foreground"
          aria-hidden
        >
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-6 rounded-sm"
              style={{ backgroundColor: cssHslAlpha("negative", 0.85) }}
            />
            Reverse signal
          </span>
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-px"
              style={{ backgroundColor: cssHsl("border") }}
            />
            <span className="font-mono text-muted-foreground">0</span>
            <span
              className="inline-block h-2 w-px"
              style={{ backgroundColor: cssHsl("border") }}
            />
          </span>
          <span className="flex items-center gap-2">
            Endorsement signal
            <span
              className="inline-block h-2 w-6 rounded-sm"
              style={{ backgroundColor: cssHslAlpha("positive", 0.85) }}
            />
          </span>
        </div>
      </div>

      {/* ── Divergent bar chart ──────────────────────────────────── */}
      <ul
        key={`bars-${remountKey}`}
        className="grid gap-2"
        aria-label="Trait correlation, sorted by magnitude"
      >
        {sortedByMagnitude.map((item, index) => {
          const isPositive = item.correlation >= 0;
          const magnitude = Math.min(1, Math.abs(item.correlation));
          // Each bar can fill up to half the track (50%). |corr|=1.0 fills
          // exactly 50%. The bar lives in a full-width track so the label
          // can be anchored relative to the same coordinate system.
          const widthPct = magnitude * 50;
          const token = isPositive ? "positive" : "negative";
          const barStyle: CSSProperties = {
            ...cssMotionStyle(index, "bar"),
            animationName: "vet-corr-bar-grow",
            ["--bar-width" as string]: `${widthPct}%`,
            width: `${widthPct}%`,
            backgroundColor: cssHslAlpha(token, 0.85),
            // Anchor the bar to the center axis: positive grows right,
            // negative grows left (offset = 50% - barWidth).
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            ...(isPositive
              ? { left: "50%" }
              : { left: `calc(50% - ${widthPct}%)` }),
          };

          return (
            <li
              key={item.criterionId}
              className="grid grid-cols-[minmax(120px,1fr)_minmax(160px,3fr)] items-center gap-3 text-sm"
            >
              <span
                className="truncate text-muted-foreground"
                title={item.label}
              >
                {item.label}
              </span>

              {/*
                Full-width track with a center axis. The bar is absolutely
                positioned and anchored to the axis so the value label can
                be placed at `calc(50% ± widthPct%)` reliably.
              */}
              <div
                className="relative flex h-6 w-full items-center"
                role="img"
                aria-label={`${item.label} ${formatCorrelation(item.correlation)} (${describeCorrelation(item.correlation)})`}
              >
                {/* Background track */}
                <div
                  className="absolute inset-0 rounded-sm"
                  style={{ backgroundColor: cssHslAlpha("muted", 0.6) }}
                  aria-hidden
                />
                {/* Center axis */}
                <div
                  className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2"
                  style={{ backgroundColor: cssHsl("border") }}
                  aria-hidden
                />
                {/* Bar */}
                <div
                  className="h-3 rounded-sm"
                  style={barStyle}
                  title={`${formatCorrelation(item.correlation)} → ${describeCorrelation(item.correlation)}`}
                />
                {/* Value label, anchored to the bar's outer edge */}
                <span
                  className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-xs font-semibold tabular-nums"
                  style={{
                    color: cssHsl(isPositive ? "positive" : "negative"),
                    ...(isPositive
                      ? { left: `calc(50% + ${widthPct}% + 6px)` }
                      : { right: `calc(50% + ${widthPct}% + 6px)` }),
                  }}
                >
                  {formatCorrelation(item.correlation)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
