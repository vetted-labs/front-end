"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AnalyticsCriteriaDistribution } from "@/types";
import {
  RECHARTS_AXIS_TICK_STYLE,
  RECHARTS_TOOLTIP_LABEL_STYLE,
  RECHARTS_TOOLTIP_STYLE,
  cssHsl,
  cssHslAlpha,
  paletteColor,
  rechartsMotion,
} from "@/lib/chartTokens";

interface TraitDistributionChartProps {
  distributions: AnalyticsCriteriaDistribution[];
}

interface BucketDatum {
  label: string;
  count: number;
  pct: number;
}

interface TraitTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: BucketDatum }>;
}

function TraitTooltip({ active, payload }: TraitTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload;
  const pctLabel = `${datum.pct.toFixed(0)}% of pool`;
  return (
    <div style={RECHARTS_TOOLTIP_STYLE} className="px-2.5 py-2">
      <div style={RECHARTS_TOOLTIP_LABEL_STYLE}>Score {datum.label}</div>
      <div className="mt-1 text-xs font-medium text-foreground">
        {datum.count} {datum.count === 1 ? "candidate" : "candidates"}
      </div>
      <div className="text-[11px] text-muted-foreground">{pctLabel}</div>
    </div>
  );
}

/**
 * VET-90: small-multiples histograms of score distribution per trait.
 * Renders one mini Recharts BarChart per rubric trait. Tokens-only colors,
 * subtle gridlines, hidden Y ticks, custom card-styled tooltip.
 */
export function TraitDistributionChart({ distributions }: TraitDistributionChartProps) {
  if (distributions.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
      {distributions.map((distribution, index) => {
        const total = distribution.buckets.reduce((sum, b) => sum + b.count, 0);
        const accent = paletteColor(index);
        const barFill = cssHsl("chart-1");

        if (total === 0) {
          return (
            <div
              key={distribution.criterionId}
              className="flex h-full flex-col rounded-md border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">
                  {distribution.label}
                </div>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
              </div>
              <div className="mt-3 flex flex-1 items-center justify-center rounded-md border border-dashed border-border py-8 text-xs text-muted-foreground">
                No scored reviews yet
              </div>
            </div>
          );
        }

        const data: BucketDatum[] = distribution.buckets.map((bucket) => ({
          label: bucket.label,
          count: bucket.count,
          pct: (bucket.count / total) * 100,
        }));

        const median = data.reduce(
          (top, current) => (current.count > top.count ? current : top),
          data[0],
        );

        return (
          <div
            key={distribution.criterionId}
            className="flex h-full flex-col rounded-md border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">
                {distribution.label}
              </div>
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
            </div>
            <div className="mt-3" style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                  barCategoryGap="22%"
                >
                  <CartesianGrid
                    vertical={false}
                    stroke={cssHslAlpha("border", 0.6)}
                    strokeDasharray="2 4"
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={RECHARTS_AXIS_TICK_STYLE}
                    interval={0}
                  />
                  <YAxis
                    tick={false}
                    tickLine={false}
                    axisLine={false}
                    width={0}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: cssHslAlpha("muted", 0.4) }}
                    content={<TraitTooltip />}
                  />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    {...rechartsMotion("bar", index)}
                  >
                    {data.map((datum) => (
                      <Cell
                        key={datum.label}
                        fill={datum.label === median.label ? accent : barFill}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Median: <span className="font-medium text-foreground">{median.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
