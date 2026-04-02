"use client";

import { useMemo } from "react";
import { AnalyticsKPI, type KPIData } from "@/components/analytics/AnalyticsKPI";
import { AreaChart } from "@/components/analytics/AreaChart";
import { useFetch } from "@/lib/hooks/useFetch";
import { analyticsApi } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";
import type { TimePeriod } from "@/components/analytics/TimeFilter";

// ── Types ─────────────────────────────────────────────────────

interface OverviewData {
  kpis?: KPIData[];
  applicationsOverTime?: { label: string; apps: number; hires: number }[];
}

// ── Component ─────────────────────────────────────────────────

interface Props {
  period: TimePeriod;
}

export function CompanyOverviewTab({ period }: Props) {
  const { data: rawData, isLoading, error } = useFetch(
    () => analyticsApi.getCompanyOverview(period),
    {}
  );

  const data = rawData as OverviewData | null;

  const chartData = useMemo(() => {
    if (!data?.applicationsOverTime) return [];
    return data.applicationsOverTime.map((d) => ({
      label: d.label,
      value: d.apps,
      secondary: d.hires,
    }));
  }, [data]);

  const kpis = data?.kpis ?? [];

  if (isLoading) {
    return (
      <div className="space-y-5 pt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-[14px] border border-border bg-card/60 h-28 animate-pulse"
            />
          ))}
        </div>
        <div className="rounded-[14px] border border-border bg-card/60 h-64 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Analytics coming soon"
        description="Real-time analytics will be available once the backend API is deployed."
      />
    );
  }

  return (
    <div className="space-y-5 pt-4">
      {/* KPI Grid */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <AnalyticsKPI key={kpi.label} kpi={kpi} />
          ))}
        </div>
      )}

      {/* Area Chart — Featured Card */}
      {chartData.length > 0 && (
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
      )}

      {kpis.length === 0 && chartData.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="No overview data yet"
          description="Post jobs and receive applications to start seeing analytics."
        />
      )}
    </div>
  );
}
