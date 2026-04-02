import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useChartTooltip } from "@/components/analytics/ChartTooltip";
import type { EarningsEntry } from "@/types";

interface EarningsChartProps {
  items: EarningsEntry[];
}

/** Group earnings by day and return cumulative totals for the chart. */
function buildChartData(items: EarningsEntry[]): { label: string; value: number }[] {
  if (items.length === 0) return [];

  // Group by day
  const byDay = new Map<string, number>();
  for (const item of items) {
    const day = new Date(item.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    byDay.set(day, (byDay.get(day) ?? 0) + Number(item.amount));
  }

  // Convert to array, already in chronological order from items (newest first), so reverse
  const entries = Array.from(byDay.entries()).reverse();
  return entries.map(([label, value]) => ({ label, value }));
}

export function EarningsChart({ items }: EarningsChartProps) {
  const data = useMemo(() => buildChartData(items), [items]);
  const { show, hide, Tooltip } = useChartTooltip();

  if (data.length < 2) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 0.01);
  const svgWidth = 1000;
  const svgHeight = 220;
  const padLeft = 0;
  const padRight = 0;
  const padTop = 20;
  const padBot = 10;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBot;

  // Build polyline points
  const points = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * plotW;
    const y = padTop + plotH - (d.value / maxValue) * plotH;
    return { x, y };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  // Area fill closes down to bottom
  const areaPath = `M${points[0].x},${svgHeight} L${points.map((p) => `${p.x},${p.y}`).join(" L")} L${points[points.length - 1].x},${svgHeight} Z`;

  // Horizontal grid lines
  const gridLines = [0.25, 0.5, 0.75, 1].map((pct) => padTop + plotH - pct * plotH);

  // X-axis labels -- show at most 6 evenly spaced
  const maxLabels = Math.min(6, data.length);
  const labelIndices: number[] = [];
  for (let i = 0; i < maxLabels; i++) {
    labelIndices.push(Math.round((i / (maxLabels - 1)) * (data.length - 1)));
  }

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Chart header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-bold">Earnings Over Time</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Earned</span>
          </div>
        </div>
      </div>

      {/* SVG chart */}
      <div className="px-5 pb-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          className="w-full h-40 sm:h-52"
        >
          <defs>
            <linearGradient id="earnings-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="earnings-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
              <stop offset="50%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.map((y, i) => (
            <line
              key={i}
              x1={padLeft}
              y1={y}
              x2={svgWidth - padRight}
              y2={y}
              stroke="currentColor"
              className="text-border/30 dark:text-white/[0.04]"
              strokeWidth="1"
            />
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#earnings-fill)" />

          {/* Line glow */}
          <polyline
            points={linePoints}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.12"
          />

          {/* Line */}
          <polyline
            points={linePoints}
            fill="none"
            stroke="url(#earnings-line)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="6"
              fill="hsl(var(--background))"
              stroke="hsl(var(--primary))"
              strokeWidth="1.5"
              style={{ cursor: "crosshair" }}
              onMouseEnter={e => show(e, data[i].label, `${data[i].value.toFixed(2)} VETD`)}
              onMouseLeave={hide}
            />
          ))}

          {/* Highlighted last point */}
          {points.length > 0 && (
            <>
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="7"
                fill="hsl(var(--primary))"
                opacity="0.15"
              />
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="4"
                fill="hsl(var(--background))"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
              />
            </>
          )}

          <Tooltip />
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between px-5 pb-4">
        {labelIndices.map((idx) => (
          <span key={idx} className="text-xs text-muted-foreground/50 font-medium">
            {data[idx].label}
          </span>
        ))}
      </div>
    </Card>
  );
}
