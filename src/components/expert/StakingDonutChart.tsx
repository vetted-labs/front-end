"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface DonutSegment {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

interface StakingDonutChartProps {
  segments: DonutSegment[];
  totalLabel: string;
  totalValue: string;
  size?: number;
}

/* ─── SVG arc math ─── */

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
) {
  const os = polarToCartesian(cx, cy, outerR, startDeg);
  const oe = polarToCartesian(cx, cy, outerR, endDeg);
  const is_ = polarToCartesian(cx, cy, innerR, endDeg);
  const ie = polarToCartesian(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${is_.x} ${is_.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${ie.x} ${ie.y}`,
    "Z",
  ].join(" ");
}

/* ─── Component ─── */

export function StakingDonutChart({
  segments,
  totalLabel,
  totalValue,
  size = 220,
}: StakingDonutChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const viewBox = 200;
  const cx = viewBox / 2;
  const cy = viewBox / 2;
  const outerR = 88;
  const innerR = 58;
  const gapDeg = 1.5;
  const totalGap = gapDeg * segments.length;
  const available = 360 - totalGap;

  const paths: { d: string; color: string; index: number }[] = [];
  let startAngle = -90;

  for (let i = 0; i < segments.length; i++) {
    const sweep = (segments[i].percentage / 100) * available;
    const endAngle = startAngle + sweep;
    paths.push({
      d: arcPath(cx, cy, outerR, innerR, startAngle, endAngle),
      color: segments[i].color,
      index: i,
    });
    startAngle = endAngle + gapDeg;
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, index: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setHovered(index);
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: size, height: size }}
      onMouseLeave={() => setHovered(null)}
    >
      <svg viewBox={`0 0 ${viewBox} ${viewBox}`} className="w-full h-full">
        {paths.map((p) => (
          <path
            key={p.index}
            d={p.d}
            fill={p.color}
            className={cn(
              "transition-opacity duration-200",
              hovered !== null && hovered !== p.index && "opacity-30",
            )}
            style={{ cursor: "pointer" }}
            onMouseMove={(e) => handleMouseMove(e, p.index)}
          />
        ))}
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold tracking-tight">{totalValue}</span>
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mt-0.5">
          {totalLabel}
        </span>
      </div>

      {/* Tooltip */}
      {hovered !== null && (
        <div
          className="absolute z-20 pointer-events-none rounded-lg border border-border bg-popover px-3 py-2 shadow-lg"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: "translate(-50%, calc(-100% - 12px))",
          }}
        >
          <div className="text-sm font-semibold" style={{ color: segments[hovered].color }}>
            {segments[hovered].label}
          </div>
          <div className="text-xs text-muted-foreground font-mono tabular-nums">
            {segments[hovered].value.toFixed(2)} VETD &middot; {segments[hovered].percentage.toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
}
