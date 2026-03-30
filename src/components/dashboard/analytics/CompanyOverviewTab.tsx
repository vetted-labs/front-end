"use client";

import { AnalyticsKPI } from "@/components/analytics/AnalyticsKPI";
import { AreaChart } from "@/components/analytics/AreaChart";
import {
  COMPANY_KPIS,
  APPLICATIONS_OVER_TIME,
} from "@/components/analytics/mock-data";

export function CompanyOverviewTab() {
  const chartData = APPLICATIONS_OVER_TIME.map((d) => ({
    label: d.day,
    value: d.apps,
    secondary: d.hires,
  }));

  return (
    <div className="space-y-5 pt-4">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {COMPANY_KPIS.map((kpi) => (
          <AnalyticsKPI key={kpi.label} kpi={kpi} />
        ))}
      </div>

      {/* Area Chart — Featured Card */}
      <div className="relative rounded-[14px] border border-primary/12 bg-card/60 backdrop-blur-sm p-7 overflow-hidden">
        {/* Gradient top line */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />

        {/* Card Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Applications Over Time
            </h3>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              Daily volume and hires
            </p>
          </div>
          <button
            type="button"
            className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Export
          </button>
        </div>

        {/* Chart */}
        <div className="mt-4">
          <AreaChart data={chartData} />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-0.5 rounded-full bg-primary" />
            <span className="text-[10px] text-muted-foreground">
              Applications
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0 border-t border-dashed border-muted-foreground opacity-40" />
            <span className="text-[10px] text-muted-foreground">Hires</span>
          </div>
        </div>
      </div>
    </div>
  );
}
