"use client";
import { useState, useCallback } from "react";

interface TooltipState {
  x: number;
  y: number;
  label: string;
  value: string;
  visible: boolean;
}

export function useChartTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState>({
    x: 0, y: 0, label: "", value: "", visible: false
  });

  const show = useCallback((e: React.MouseEvent<SVGElement>, label: string, value: string) => {
    const svg = e.currentTarget.closest("svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 44,
      label,
      value,
      visible: true,
    });
  }, []);

  const hide = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }));
  }, []);

  function Tooltip() {
    if (!tooltip.visible) return null;
    return (
      <g>
        <foreignObject
          x={Math.max(0, tooltip.x - 55)}
          y={Math.max(0, tooltip.y)}
          width={110}
          height={40}
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <div style={{
            background: "var(--foreground)",
            color: "var(--background)",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 6,
            padding: "4px 8px",
            textAlign: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            whiteSpace: "nowrap",
          }}>
            <div>{tooltip.value}</div>
            <div style={{ opacity: 0.6, fontSize: 10, fontWeight: 400 }}>{tooltip.label}</div>
          </div>
        </foreignObject>
      </g>
    );
  }

  return { show, hide, Tooltip };
}
