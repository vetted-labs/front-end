"use client";

import { cn } from "@/lib/utils";
import type { CompanyKPI } from "./mock-data";

// ── Sparkline builder ──────────────────────────────────────────

const VB_W = 200;
const VB_H = 48;

/** Generate a smooth cubic bezier SVG path through data points. */
function buildSparkline(data: number[]): { linePath: string; areaPath: string } {
  if (data.length < 2) return { linePath: "", areaPath: "" };

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * VB_W,
    y: VB_H - 6 - ((v - min) / range) * (VB_H - 12), // 6px pad top/bottom
  }));

  // Build cubic bezier segments
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const cp1x = curr.x + (next.x - curr.x) / 3;
    const cp2x = curr.x + ((next.x - curr.x) * 2) / 3;
    d += `C${cp1x},${curr.y} ${cp2x},${next.y} ${next.x},${next.y}`;
  }

  const last = pts[pts.length - 1];
  const areaPath = `${d}L${last.x},${VB_H}L${pts[0].x},${VB_H}Z`;

  return { linePath: d, areaPath };
}

// ── Accent colour mapping ──────────────────────────────────────

const ACCENT_MAP = {
  primary: {
    barGradient: "from-primary to-transparent",
    barOpacity: "",
    strokeColor: "hsl(var(--primary))",
    fillId: "kpi-fill-primary",
  },
  positive: {
    barGradient: "from-positive to-transparent",
    barOpacity: "",
    strokeColor: "hsl(var(--positive))",
    fillId: "kpi-fill-positive",
  },
  muted: {
    barGradient: "from-muted-foreground to-transparent",
    barOpacity: "opacity-40",
    strokeColor: "hsl(var(--muted-foreground))",
    fillId: "kpi-fill-muted",
  },
} as const;

// ── Component ──────────────────────────────────────────────────

interface AnalyticsKPIProps {
  kpi: CompanyKPI;
}

export function AnalyticsKPI({ kpi }: AnalyticsKPIProps) {
  const accent = ACCENT_MAP[kpi.accentColor];
  const hasSparkline = kpi.sparklineData.length >= 2;
  const { linePath, areaPath } = hasSparkline
    ? buildSparkline(kpi.sparklineData)
    : { linePath: "", areaPath: "" };

  // Last point coordinates for the glow dot
  const lastPt = hasSparkline
    ? (() => {
        const data = kpi.sparklineData;
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        const x = VB_W;
        const y =
          VB_H - 6 - ((data[data.length - 1] - min) / range) * (VB_H - 12);
        return { x, y };
      })()
    : null;

  // Unique gradient ID per instance
  const gradientId = `kpi-grad-${kpi.label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[14px] border border-border",
        "bg-gradient-to-br from-white/[0.025] to-white/[0.01]",
        "backdrop-blur-sm px-[22px] pt-5 pb-3.5",
        "transition-all duration-200",
        "hover:border-white/10 hover:shadow-[0_0_30px_rgba(255,106,0,0.03)]"
      )}
    >
      {/* Top accent bar */}
      <div
        className={cn(
          "absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r",
          accent.barGradient,
          accent.barOpacity
        )}
      />

      {/* Label */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">
        {kpi.label}
      </p>

      {/* Value row */}
      <div className="flex items-end justify-between">
        <div className="font-display text-[34px] font-bold leading-none tracking-tight">
          {kpi.value}
          {kpi.unit && (
            <span className="text-sm font-medium text-foreground/50 ml-1">
              {kpi.unit}
            </span>
          )}
        </div>

        {kpi.change && (
          <span
            className={cn(
              "inline-flex items-center gap-[3px] text-[10px] font-semibold",
              "px-[7px] py-0.5 rounded-full font-mono",
              kpi.changeDirection === "up" &&
                "text-positive bg-positive/10",
              kpi.changeDirection === "down" &&
                "text-negative bg-negative/10",
              kpi.changeDirection === "neutral" &&
                "text-muted-foreground bg-muted"
            )}
          >
            {kpi.changeDirection === "up" && (
              <svg width="8" height="8" viewBox="0 0 8 8">
                <path d="M4 1L7 5H1Z" fill="currentColor" />
              </svg>
            )}
            {kpi.changeDirection === "down" && (
              <svg width="8" height="8" viewBox="0 0 8 8">
                <path d="M4 7L7 3H1Z" fill="currentColor" />
              </svg>
            )}
            {kpi.change}
          </span>
        )}
      </div>

      {/* Sparkline */}
      {hasSparkline && (
        <div className="mt-3.5 h-12">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={accent.strokeColor}
                  stopOpacity={kpi.accentColor === "muted" ? "0.1" : "0.2"}
                />
                <stop
                  offset="100%"
                  stopColor={accent.strokeColor}
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path d={areaPath} fill={`url(#${gradientId})`} />

            {/* Curve line */}
            <path
              d={linePath}
              fill="none"
              stroke={accent.strokeColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={kpi.accentColor === "muted" ? 0.5 : 1}
            />

            {/* Glowing endpoint dot */}
            {lastPt && kpi.accentColor !== "muted" && (
              <>
                <circle
                  cx={lastPt.x}
                  cy={lastPt.y}
                  r="5"
                  fill={accent.strokeColor}
                  opacity="0.12"
                  className="animate-[dotGlow_3s_ease-in-out_infinite]"
                />
                <circle
                  cx={lastPt.x}
                  cy={lastPt.y}
                  r="2"
                  fill={accent.strokeColor}
                />
              </>
            )}
          </svg>
        </div>
      )}
    </div>
  );
}
