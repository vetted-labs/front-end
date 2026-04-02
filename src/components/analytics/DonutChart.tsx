"use client";

export interface GuildDistribution {
  name: string;
  count: number;
  pct: string;
}

const SEGMENT_COLORS = [
  "hsl(var(--primary) / 0.65)",
  "hsl(var(--primary) / 0.42)",
  "hsl(var(--primary) / 0.28)",
  "hsl(var(--primary) / 0.18)",
  "hsl(var(--muted-foreground) / 0.12)",
];

const SVG_SIZE = 180;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;
const RADIUS = 66;
const STROKE_W = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER_R = 50;

interface DonutChartProps {
  segments: GuildDistribution[];
  total: number;
}

export function DonutChart({ segments, total }: DonutChartProps) {
  // Calculate stroke-dasharray values for each segment
  const totalCount = segments.reduce((sum, s) => sum + s.count, 0) || 1;
  let cumulativeOffset = 0;

  const segmentArcs = segments.map((seg, i) => {
    const fraction = seg.count / totalCount;
    const arcLength = fraction * CIRCUMFERENCE;
    const gapLength = CIRCUMFERENCE - arcLength;
    const offset = -cumulativeOffset;
    cumulativeOffset += arcLength;

    return {
      ...seg,
      arcLength,
      gapLength,
      dashOffset: offset,
      color: SEGMENT_COLORS[i] ?? SEGMENT_COLORS[SEGMENT_COLORS.length - 1],
    };
  });

  return (
    <div className="flex items-center gap-12 py-2">
      {/* Donut SVG */}
      <div className="relative shrink-0" style={{ width: SVG_SIZE, height: SVG_SIZE }}>
        <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} role="img">
          <title>Guild distribution donut chart</title>
          {/* Track ring */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={STROKE_W}
          />

          {/* Segments — drawn with stroke-dasharray, rotated -90deg so they start at top */}
          <g style={{ transform: "rotate(-90deg)", transformOrigin: `${CX}px ${CY}px` }}>
            {segmentArcs.map((seg) => (
              <circle
                key={seg.name}
                cx={CX}
                cy={CY}
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE_W}
                strokeDasharray={`${seg.arcLength} ${seg.gapLength}`}
                strokeDashoffset={seg.dashOffset}
              />
            ))}
          </g>

          {/* Center hole filled with bg color */}
          <circle cx={CX} cy={CY} r={CENTER_R} fill="hsl(var(--background))" />
        </svg>

        {/* Center text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="font-display text-[26px] font-bold">
            {total.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground">Total</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3.5 flex-1">
        {segmentArcs.map((seg) => (
          <div key={seg.name} className="flex items-center gap-2.5">
            <div
              className="w-2.5 h-2.5 rounded-[3px] shrink-0"
              style={{ background: seg.color }}
            />
            <span className="text-[13px] text-muted-foreground flex-1">
              {seg.name}
            </span>
            <span className="text-[11px] text-muted-foreground/70 font-mono w-9">
              {seg.pct}
            </span>
            <span className="text-[13px] font-mono font-semibold">
              {seg.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
