"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { AreaChart } from "@/components/analytics/AreaChart";
import { useFetch } from "@/lib/hooks/useFetch";
import { analyticsApi } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertTriangle, BarChart3 } from "lucide-react";
import type { TimePeriod } from "@/components/analytics/TimeFilter";

// ── Component ─────────────────────────────────────────────────

interface Props {
  period: TimePeriod;
}

export function CandidateVisibilityTab({ period }: Props) {
  const { data: rawData, isLoading, error } = useFetch(
    () => analyticsApi.getCandidateVisibility(period),
    {}
  );

  const data = rawData;

  const chartData = useMemo(() => {
    if (!data?.profileViews) return [];
    return data.profileViews.map((d) => ({
      label: d.label,
      value: d.value,
    }));
  }, [data]);

  const discovery = data?.discovery ?? [];
  const guildMemberships = data?.guildMemberships ?? [];

  if (isLoading) {
    return (
      <div className="space-y-5">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-[14px] border border-border bg-card/60 h-48 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load visibility data"
        description="Something went wrong loading your visibility data. Please try again."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Profile Views Chart */}
      {chartData.length > 0 && (
        <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
          <div className="mb-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Profile Views
            </h3>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              Companies viewing your vetted profile
            </p>
          </div>

          <AreaChart data={chartData} />

          {(data?.totalViews != null || data?.viewsChange != null) && (
            <p className="text-[11px] text-muted-foreground mt-2">
              {data?.totalViews != null && `${data.totalViews} views`}
              {data?.totalViews != null && data?.viewsChange && (
                <>
                  {" "}
                  <span className="text-muted-foreground/50">&middot;</span>{" "}
                  <span className="text-positive">{data.viewsChange}</span> vs
                  prior period
                </>
              )}
            </p>
          )}
        </div>
      )}

      {/* 2-column grid */}
      {(discovery.length > 0 || guildMemberships.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Discovery Metrics */}
          {discovery.length > 0 && (
            <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
              <div className="mb-6">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Discovery
                </h3>
              </div>

              <div className="flex flex-col">
                {discovery.map((metric, i) => (
                  <div
                    key={metric.label}
                    className={cn(
                      "flex justify-between items-center py-3",
                      i < discovery.length - 1 && "border-b border-border/50"
                    )}
                  >
                    <span className="text-[13px] text-muted-foreground">
                      {metric.label}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-sm font-semibold",
                        metric.color === "primary"
                          ? "text-primary"
                          : "text-foreground"
                      )}
                    >
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guild Memberships */}
          {guildMemberships.length > 0 && (
            <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
              <div className="mb-6">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Guild Memberships
                </h3>
              </div>

              <div className="flex flex-col gap-2.5">
                {guildMemberships.map((g) => {
                  const isActive = g.status === "active";
                  return (
                    <div
                      key={g.guild}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-[10px] border",
                        isActive
                          ? "bg-primary/[0.02] border-primary/[0.06]"
                          : "bg-foreground/[0.015] border-border"
                      )}
                    >
                      <span className="inline-flex items-center rounded-full bg-primary/8 border border-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                        {g.guild}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">
                          Score: {g.score}
                        </div>
                        <div className="text-[10px] text-muted-foreground/60">
                          Vetted {g.vettedDate}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-semibold",
                          isActive ? "text-positive" : "text-muted-foreground"
                        )}
                      >
                        {isActive ? "Active" : "Improve"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {chartData.length === 0 && discovery.length === 0 && guildMemberships.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="No visibility data yet"
          description="Complete your profile and get vetted to improve your discoverability."
        />
      )}
    </div>
  );
}
