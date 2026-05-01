/**
 * Chart tokens — color, motion, and animation primitives shared across
 * all analytics charts. Adapted from saladin-web's chart-tokens.ts but
 * keyed to Vetted's globals.css HSL tokens.
 */

import type { CSSProperties } from "react";

/** CSS variable token names defined in globals.css. */
export type ChartToken =
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "primary"
  | "muted"
  | "muted-foreground"
  | "border"
  | "card"
  | "foreground"
  | "positive"
  | "negative"
  | "warning"
  | "info-blue"
  | "neutral"
  | "destructive";

/** Returns `hsl(var(--token))` for inline style usage. */
export function cssHsl(token: ChartToken): string {
  return `hsl(var(--${token}))`;
}

/** Returns `hsl(var(--token) / alpha)` for transparent fills. */
export function cssHslAlpha(token: ChartToken, alpha: number): string {
  return `hsl(var(--${token}) / ${alpha})`;
}

/**
 * Categorical chart palette. Use for series, sectors, alignment buckets.
 * Maps to globals.css `--chart-1` through `--chart-5`.
 */
export const CHART_PALETTE: readonly ChartToken[] = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const;

/** Returns the n-th palette color, wrapping. */
export function paletteColor(index: number): string {
  return cssHsl(CHART_PALETTE[index % CHART_PALETTE.length]);
}

/** Animation durations in ms, tuned for the dashboard feel. */
export const CHART_MOTION = {
  line: 900,
  area: 820,
  bar: 650,
  pie: 850,
  scatter: 620,
  heatmap: 520,
} as const;

export type ChartMotionKind = keyof typeof CHART_MOTION;

/** Per-series stagger delay in ms. */
const STAGGER_MS = 60;

/**
 * Returns Recharts animation props for a series at the given index.
 * Spread onto `<Line>`, `<Bar>`, `<Area>`, etc.
 */
export function rechartsMotion(kind: ChartMotionKind, index: number = 0) {
  return {
    isAnimationActive: true,
    animationBegin: index * STAGGER_MS,
    animationDuration: CHART_MOTION[kind],
    animationEasing: "ease-out" as const,
  };
}

/**
 * Returns CSS animationDelay/Duration/TimingFunction for non-Recharts
 * elements (custom CSS bars, heatmap cells, etc.). Pair with a CSS
 * class that defines the actual @keyframes.
 */
export function cssMotionStyle(
  index: number = 0,
  kind: ChartMotionKind = "bar",
): CSSProperties {
  return {
    animationDelay: `${index * STAGGER_MS}ms`,
    animationDuration: `${CHART_MOTION[kind]}ms`,
    animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    animationFillMode: "both",
  };
}

/**
 * Categorical color for an analytics alignment state.
 * Used by both ranking-row spread bar and outlier panel.
 */
export function alignmentColor(
  state: "included" | "dissenting" | "neutral" | "tiebreaker_required" | "unknown",
): string {
  switch (state) {
    case "included":
      return cssHsl("positive");
    case "dissenting":
      return cssHsl("negative");
    case "tiebreaker_required":
      return cssHsl("warning");
    case "neutral":
      return cssHsl("neutral");
    default:
      return cssHsl("muted-foreground");
  }
}

/**
 * Standard tooltip style for Recharts `<Tooltip contentStyle={...}>`.
 * Inherits Vetted card surface so dark mode comes for free.
 */
export const RECHARTS_TOOLTIP_STYLE: CSSProperties = {
  background: cssHsl("card"),
  border: `1px solid ${cssHsl("border")}`,
  borderRadius: "0.5rem",
  fontSize: "0.75rem",
  color: cssHsl("foreground"),
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
};

export const RECHARTS_TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: cssHsl("muted-foreground"),
  fontSize: "0.6875rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

export const RECHARTS_AXIS_TICK_STYLE = {
  fill: cssHsl("muted-foreground"),
  fontSize: 11,
} as const;
