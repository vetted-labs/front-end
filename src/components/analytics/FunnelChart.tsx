"use client";

import type { FunnelStage } from "./mock-data";

// ── Constants ──────────────────────────────────────────────────

const SVG_W = 720;
const SVG_H = 300;
const STAGE_H = 44; // height of each trapezoid
const GAP = 24; // vertical gap between stages (includes conversion label space)
const CENTER_X = SVG_W / 2;

interface FunnelChartProps {
  stages: FunnelStage[];
}

export function FunnelChart({ stages }: FunnelChartProps) {
  const maxCount = stages[0]?.count ?? 1;

  // Each stage narrows based on count relative to max
  const stageGeometry = stages.map((stage, i) => {
    const ratio = stage.count / maxCount;
    // Min width of ~80px for tiny stages, max ~610px for full
    const halfW = Math.max(40, ratio * 305);
    const y = i * (STAGE_H + GAP) + 8;
    return { ...stage, halfW, y, index: i };
  });

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full block"
      style={{ overflow: "visible" }}
      role="img"
    >
      <title>Hiring funnel</title>
      <defs>
        {/* Funnel stage gradients — decreasing opacity */}
        {stageGeometry.map((s, i) => {
          const isHired = s.isHired;
          const baseOpacity = isHired ? 0.3 : 0.3 - i * 0.05;
          const cssVar = isHired ? "--positive" : "--primary";
          return (
            <linearGradient
              key={`fg-${i}`}
              id={`funnel-g-${i}`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop
                offset="0%"
                stopColor={`hsl(var(${cssVar}) / ${baseOpacity})`}
              />
              <stop
                offset="100%"
                stopColor={`hsl(var(${cssVar}) / 0.02)`}
              />
            </linearGradient>
          );
        })}
        {/* Center spine glow */}
        <linearGradient id="funnel-spine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          <stop
            offset="100%"
            stopColor="hsl(var(--positive))"
            stopOpacity="0.15"
          />
        </linearGradient>
      </defs>

      {/* Center spine glow line */}
      <line
        x1={CENTER_X}
        y1="6"
        x2={CENTER_X}
        y2={SVG_H - 6}
        stroke="url(#funnel-spine)"
        strokeWidth="1"
        opacity="0.4"
      />

      {stageGeometry.map((s, i) => {
        const topHalfW = s.halfW;
        // Next stage's width for the narrowing bottom edge
        const nextHalfW =
          i < stageGeometry.length - 1
            ? stageGeometry[i + 1].halfW
            : s.halfW * 0.8;

        const tl = CENTER_X - topHalfW;
        const tr = CENTER_X + topHalfW;
        const bl = CENTER_X - nextHalfW;
        const br = CENTER_X + nextHalfW;

        const isHired = s.isHired;
        const strokeColor = isHired
          ? "hsl(var(--positive) / 0.15)"
          : `hsl(var(--primary) / ${0.1 - i * 0.02})`;

        return (
          <g key={s.label}>
            {/* Trapezoid */}
            <polygon
              points={`${tl},${s.y} ${tr},${s.y} ${br},${s.y + STAGE_H} ${bl},${s.y + STAGE_H}`}
              fill={`url(#funnel-g-${i})`}
              stroke={strokeColor}
              strokeWidth="0.5"
            />

            {/* Count — centered */}
            <text
              x={CENTER_X}
              y={s.y + STAGE_H / 2 + 6}
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fill={isHired ? "hsl(var(--positive))" : "hsl(var(--foreground))"}
              fontFamily="JetBrains Mono, monospace"
              letterSpacing="-0.02em"
            >
              {s.count.toLocaleString()}
            </text>

            {/* Label — left side */}
            <text
              x={22}
              y={s.y + STAGE_H / 2 + 5}
              fontSize="11"
              fontWeight={isHired ? "600" : "500"}
              fill={
                isHired
                  ? "hsl(var(--positive))"
                  : "hsl(var(--muted-foreground))"
              }
              fontFamily="Inter, sans-serif"
            >
              {s.label}
            </text>

            {/* Percentage — right side */}
            <text
              x={SVG_W - 22}
              y={s.y + STAGE_H / 2 + 5}
              textAnchor="end"
              fontSize="10"
              fill={
                isHired
                  ? "hsl(var(--positive))"
                  : "hsl(var(--muted-foreground))"
              }
              fontFamily="JetBrains Mono, monospace"
              fontWeight={isHired ? "600" : "400"}
            >
              {s.pct}
            </text>

            {/* Conversion label between stages */}
            {s.conversionLabel && (
              <text
                x={CENTER_X}
                y={s.y + STAGE_H + 16}
                textAnchor="middle"
                fontSize="9"
                fill={
                  isHired
                    ? "hsl(var(--positive))"
                    : "hsl(var(--primary))"
                }
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
                opacity="0.8"
              >
                {s.conversionLabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
