"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import type { ReputationTimelineEntry } from "@/types";

interface ReputationScoreChartProps {
  timeline: ReputationTimelineEntry[];
  reputation: number;
}

/** Build monthly score data by replaying timeline backwards from current reputation */
function buildMonthlyScores(
  timeline: ReputationTimelineEntry[],
  currentReputation: number,
): { month: string; score: number }[] {
  // Sort timeline newest first
  const sorted = [...timeline].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Group changes by month, walking back from current score
  const now = new Date();
  const months: { month: string; score: number }[] = [];
  let runningScore = currentReputation;

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short" });

    months.unshift({ month: label, score: runningScore });

    // Subtract changes from this month to get previous month's score
    const monthChanges = sorted.filter((e) => {
      const eDate = new Date(e.created_at);
      return (
        eDate.getFullYear() === d.getFullYear() &&
        eDate.getMonth() === d.getMonth()
      );
    });

    const totalChange = monthChanges.reduce((sum, e) => sum + e.change_amount, 0);
    runningScore -= totalChange;
  }

  return months;
}

/** Generate smooth SVG path using Catmull-Rom spline */
function catmullRomPath(
  points: { x: number; y: number }[],
  tension = 0.3,
): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function ReputationScoreChart({ timeline, reputation }: ReputationScoreChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const monthlyScores = useMemo(
    () => buildMonthlyScores(timeline, reputation),
    [timeline, reputation],
  );

  // Chart dimensions
  const chartLeft = 60;
  const chartRight = 940;
  const chartTop = 20;
  const chartBottom = 200;
  const viewW = 1000;
  const viewH = 240;

  // Compute Y scale from actual data
  const scores = monthlyScores.map((m) => m.score);
  const minScore = Math.max(0, Math.floor((Math.min(...scores) - 50) / 50) * 50);
  const maxScore = Math.ceil((Math.max(...scores) + 50) / 50) * 50;
  const scoreRange = maxScore - minScore || 100;

  function scoreToY(score: number) {
    return chartBottom - ((score - minScore) / scoreRange) * (chartBottom - chartTop);
  }

  function indexToX(i: number) {
    return chartLeft + (i / Math.max(scores.length - 1, 1)) * (chartRight - chartLeft);
  }

  const points = scores.map((s, i) => ({ x: indexToX(i), y: scoreToY(s) }));
  const linePath = catmullRomPath(points);
  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1].x},${chartBottom} L ${points[0].x},${chartBottom} Z`
    : "";

  // Grid lines
  const gridSteps = 4;
  const gridScores = Array.from({ length: gridSteps }, (_, i) => {
    return Math.round(minScore + (scoreRange / (gridSteps - 1)) * i);
  });

  // Average score for dashed line
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const avgY = scoreToY(avg);

  if (monthlyScores.length < 2) return null;

  return (
    <section>
      <p className="text-xs font-bold tracking-[4px] uppercase text-muted-foreground mb-8 pl-1">
        Score History
      </p>
      <Card padding="none" className="relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-border" />

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-7">
            <p className="font-display text-xl font-bold">6-Month Trend</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Score
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                Avg
              </span>
            </div>
          </div>

          {/* SVG chart */}
          <div className="relative">
            <svg
              className="w-full h-60"
              viewBox={`0 0 ${viewW} ${viewH}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="repAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary) / 0.25)" />
                  <stop offset="100%" stopColor="hsl(var(--primary) / 0)" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {gridScores.map((gs) => {
                const y = scoreToY(gs);
                return (
                  <g key={gs}>
                    <line
                      x1={chartLeft}
                      y1={y}
                      x2={chartRight}
                      y2={y}
                      className="stroke-border/40 dark:stroke-white/[0.04]"
                      strokeWidth="1"
                    />
                    <text
                      x={chartLeft - 12}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-muted-foreground/40 text-xs"
                    >
                      {gs}
                    </text>
                  </g>
                );
              })}

              {/* Average dashed line */}
              <line
                x1={chartLeft}
                y1={avgY}
                x2={chartRight}
                y2={avgY}
                className="stroke-muted-foreground/10"
                strokeWidth="1"
                strokeDasharray="6 4"
              />

              {/* Area fill */}
              {areaPath && (
                <path
                  d={areaPath}
                  fill="url(#repAreaGrad)"
                  className="opacity-0"
                  style={{ animation: "rep-chart-area-fade 1.5s ease-out 0.5s forwards" }}
                />
              )}

              {/* Line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  className="stroke-primary"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="1000"
                  strokeDashoffset="1000"
                  style={{ animation: "rep-chart-draw-line 2s ease-out 0.3s forwards" }}
                />
              )}

              {/* Data points */}
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={hoveredIdx === i ? 6 : 0}
                  className={`fill-background stroke-primary transition-all duration-200 cursor-pointer ${
                    hoveredIdx === i ? "fill-primary drop-" : ""
                  }`}
                  strokeWidth="2.5"
                  style={
                    hoveredIdx !== i
                      ? { animation: `rep-chart-point-appear 0.3s ease-out ${1.5 + i * 0.15}s forwards` }
                      : undefined
                  }
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              ))}
            </svg>

            {/* Tooltip */}
            {hoveredIdx !== null && (
              <div
                className="absolute bg-card dark:bg-surface-2/95 border border-primary/20 rounded-xl px-3.5 py-2.5 pointer-events-none z-10 shadow-lg"
                style={{
                  left: `${(points[hoveredIdx].x / viewW) * 100}%`,
                  top: `${(points[hoveredIdx].y / viewH) * 100 - 18}%`,
                  transform: "translateX(-50%)",
                }}
              >
                <p className="font-display text-xl font-bold text-primary tabular-nums">
                  {scores[hoveredIdx]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {monthlyScores[hoveredIdx].month}
                </p>
              </div>
            )}
          </div>

          {/* Month labels */}
          <div className="flex justify-between pt-3">
            {monthlyScores.map((m) => (
              <span key={m.month} className="text-xs text-muted-foreground text-center flex-1">
                {m.month}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}
