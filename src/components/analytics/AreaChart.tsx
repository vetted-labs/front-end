"use client";

// ── Constants ──────────────────────────────────────────────────

const VB_W = 640;
const VB_H = 280;
const PAD_L = 38;
const PAD_R = 20;
const PAD_T = 26;
const PAD_B = 56; // room for X labels
const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;

// ── Helpers ────────────────────────────────────────────────────

/** Round up to a "nice" number for axis ceiling. */
function niceMax(v: number): number {
  if (v <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const residual = v / mag;
  if (residual <= 1) return mag;
  if (residual <= 2) return 2 * mag;
  if (residual <= 5) return 5 * mag;
  return 10 * mag;
}

/** Build a smooth cubic bezier path through points. */
function bezierPath(
  pts: { x: number; y: number }[]
): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const cp1x = curr.x + (next.x - curr.x) / 3;
    const cp2x = curr.x + ((next.x - curr.x) * 2) / 3;
    d += `C${cp1x},${curr.y} ${cp2x},${next.y} ${next.x},${next.y}`;
  }
  return d;
}

// ── Component ──────────────────────────────────────────────────

interface DataPoint {
  label: string;
  value: number;
  secondary?: number;
}

interface AreaChartProps {
  data: DataPoint[];
  primaryColor?: string;
  secondaryColor?: string;
}

export function AreaChart({
  data,
  primaryColor = "hsl(var(--primary))",
  secondaryColor = "hsl(var(--muted-foreground))",
}: AreaChartProps) {
  if (data.length < 2) return null;

  const maxPrimary = Math.max(...data.map((d) => d.value));
  const maxSecondary = data.some((d) => d.secondary != null)
    ? Math.max(...data.map((d) => d.secondary ?? 0))
    : 0;
  const ceiling = niceMax(Math.max(maxPrimary, maxSecondary));

  // Y axis: 5 grid lines evenly spaced from 0 to ceiling
  const gridCount = 5;
  const gridLines = Array.from({ length: gridCount }, (_, i) => {
    const frac = i / (gridCount - 1);
    return {
      value: Math.round(ceiling * (1 - frac)),
      y: PAD_T + frac * PLOT_H,
    };
  });
  // Baseline
  const baselineY = PAD_T + PLOT_H;

  // Data points → SVG coordinates
  const primaryPts = data.map((d, i) => ({
    x: PAD_L + (i / (data.length - 1)) * PLOT_W,
    y: PAD_T + PLOT_H - (d.value / ceiling) * PLOT_H,
  }));

  const hasSecondary = data.some((d) => d.secondary != null);
  const secondaryPts = hasSecondary
    ? data.map((d, i) => ({
        x: PAD_L + (i / (data.length - 1)) * PLOT_W,
        y: PAD_T + PLOT_H - ((d.secondary ?? 0) / ceiling) * PLOT_H,
      }))
    : [];

  // Paths
  const primaryLine = bezierPath(primaryPts);
  const primaryArea = `${primaryLine}L${primaryPts[primaryPts.length - 1].x},${baselineY}L${primaryPts[0].x},${baselineY}Z`;

  const secondaryLine = hasSecondary ? bezierPath(secondaryPts) : "";
  const secondaryArea = hasSecondary
    ? `${secondaryLine}L${secondaryPts[secondaryPts.length - 1].x},${baselineY}L${secondaryPts[0].x},${baselineY}Z`
    : "";

  // X-axis labels — show ~5-6 evenly spaced
  const maxLabels = Math.min(6, data.length);
  const labelIndices: number[] = [];
  for (let i = 0; i < maxLabels; i++) {
    labelIndices.push(Math.round((i / (maxLabels - 1)) * (data.length - 1)));
  }

  const lastPt = primaryPts[primaryPts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full block"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="area-primary-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primaryColor} stopOpacity="0.14" />
          <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
        </linearGradient>
        {hasSecondary && (
          <linearGradient
            id="area-secondary-fill"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.06" />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity="0" />
          </linearGradient>
        )}
      </defs>

      {/* Y-axis labels + grid lines */}
      {gridLines.map((gl, i) => (
        <g key={`grid-${i}`}>
          <text
            x={PAD_L - 10}
            y={gl.y + 4}
            textAnchor="end"
            fontSize="9"
            fill="hsl(var(--muted-foreground))"
            opacity="0.35"
            fontFamily="JetBrains Mono, monospace"
          >
            {gl.value}
          </text>
          <line
            x1={PAD_L}
            y1={gl.y}
            x2={VB_W - PAD_R}
            y2={gl.y}
            stroke="currentColor"
            className={
              i === gridCount - 1
                ? "text-foreground/[0.06]"
                : "text-foreground/[0.03]"
            }
            strokeWidth="0.5"
          />
        </g>
      ))}

      {/* Secondary series (dashed) */}
      {hasSecondary && (
        <>
          <path d={secondaryArea} fill="url(#area-secondary-fill)" />
          <path
            d={secondaryLine}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="5 3"
            opacity="0.4"
          />
        </>
      )}

      {/* Primary series */}
      <path d={primaryArea} fill="url(#area-primary-fill)" />
      <path
        d={primaryLine}
        fill="none"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Glow dot at last primary point */}
      <circle
        cx={lastPt.x}
        cy={lastPt.y}
        r="6"
        fill={primaryColor}
        opacity="0.1"
        className="animate-[dotGlow_3s_ease-in-out_infinite]"
      />
      <circle
        cx={lastPt.x}
        cy={lastPt.y}
        r="2.5"
        fill={primaryColor}
        stroke="hsl(var(--background))"
        strokeWidth="1.5"
      />

      {/* X-axis labels */}
      {labelIndices.map((idx) => {
        const x = PAD_L + (idx / (data.length - 1)) * PLOT_W;
        const isLast = idx === data.length - 1;
        return (
          <text
            key={`xlabel-${idx}`}
            x={x}
            y={baselineY + 22}
            textAnchor={idx === 0 ? "start" : isLast ? "end" : "middle"}
            fontSize="9"
            fill="hsl(var(--muted-foreground))"
            opacity={isLast ? 0.7 : 0.35}
            fontFamily="JetBrains Mono, monospace"
            fontWeight={isLast ? "500" : "400"}
          >
            {data[idx].label}
          </text>
        );
      })}
    </svg>
  );
}
