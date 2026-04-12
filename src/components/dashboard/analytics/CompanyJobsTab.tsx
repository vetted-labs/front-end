"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { BarDistribution } from "@/components/analytics/BarDistribution";
import { useFetch } from "@/lib/hooks/useFetch";
import { analyticsApi } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertTriangle, BarChart3 } from "lucide-react";
import type { TimePeriod } from "@/components/analytics/TimeFilter";
import type { CompanyJobsData } from "@/types/analytics";

// ── Component ─────────────────────────────────────────────────

interface Props {
  period: TimePeriod;
}

export function CompanyJobsTab({ period }: Props) {
  const { data: rawData, isLoading, error } = useFetch(
    () => analyticsApi.getCompanyJobPerformance(period),
    {}
  );

  const data = useMemo((): Partial<CompanyJobsData> => {
    if (!rawData) return {};
    return rawData;
  }, [rawData]);

  const jobs = data.jobs ?? [];
  const timeToHireDist = data.timeToHireDistribution ?? [];
  const timeStats = data.timeToHireStats;

  if (isLoading) {
    return (
      <div className="space-y-5 pt-4">
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
        title="Unable to load job analytics"
        description="Something went wrong loading your job data. Please try again."
      />
    );
  }

  return (
    <div className="space-y-5 pt-4">
      {/* Performance Table Card */}
      {jobs.length > 0 && (
        <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
          <div className="flex items-start justify-between mb-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Performance by Role
            </h3>
            <button
              type="button"
              className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Filter
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Header */}
            <div
              className="hidden sm:grid gap-2 pb-3 border-b border-border/50 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/60"
              style={{ gridTemplateColumns: "2fr 80px 80px 90px 80px 70px" }}
            >
              <span>Role</span>
              <span className="text-right">Apps</span>
              <span className="text-right">Review</span>
              <span className="text-right">Time to Hire</span>
              <span className="text-right">Views</span>
              <span className="text-center">Status</span>
            </div>

            {/* Rows */}
            {jobs.map((job) => (
              <div
                key={job.name}
                className="flex flex-col gap-2 py-3.5 border-b border-border/30 last:border-b-0 sm:grid sm:gap-2 sm:items-center"
                style={{ gridTemplateColumns: "2fr 80px 80px 90px 80px 70px" }}
              >
                {/* Role */}
                <div>
                  <div className="text-[13px] font-medium text-foreground">
                    {job.name}
                  </div>
                  <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/8 text-primary">
                    {job.guild}
                  </span>
                </div>

                {/* Mobile stats summary */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground sm:hidden">
                  <span>{job.apps} apps</span>
                  <span>{job.inReview} in review</span>
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize",
                      job.status === "active"
                        ? "bg-positive/10 text-positive"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {job.status === "active" ? "Active" : "Paused"}
                  </span>
                </div>

                {/* Apps */}
                <div className="text-right hidden sm:block">
                  <div className="text-[13px] font-mono font-semibold">
                    {job.apps.toLocaleString()}
                  </div>
                  <div
                    className={cn(
                      "text-[10px] font-mono mt-0.5",
                      job.appsTrend.startsWith("+") &&
                        Number.parseInt(job.appsTrend.slice(1)) >= 25
                        ? "text-positive"
                        : "text-muted-foreground/60"
                    )}
                  >
                    {job.appsTrend}
                  </div>
                </div>

                {/* Review */}
                <div className="text-right hidden sm:block">
                  <div
                    className={cn(
                      "text-[13px] font-mono font-semibold",
                      job.reviewNote === "slow" && "text-negative"
                    )}
                  >
                    {job.inReview}
                  </div>
                  {job.reviewNote && (
                    <div className="text-[10px] font-mono text-negative mt-0.5">
                      {job.reviewNote}
                    </div>
                  )}
                </div>

                {/* Time to Hire */}
                <div className="text-right hidden sm:block">
                  <div className="text-[13px] font-mono font-semibold">
                    {job.timeToHire}
                  </div>
                  <div
                    className={cn(
                      "text-[10px] font-mono mt-0.5",
                      job.timeDeltaPositive && job.timeDelta !== "avg"
                        ? "text-positive"
                        : job.timeDelta === "avg"
                          ? "text-muted-foreground/60"
                          : "text-negative"
                    )}
                  >
                    {job.timeDelta}
                  </div>
                </div>

                {/* Views */}
                <div className="text-right hidden sm:block">
                  <div className="text-[13px] font-mono font-semibold">
                    {job.views.toLocaleString()}
                  </div>
                </div>

                {/* Status */}
                <div className="text-center hidden sm:block">
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize",
                      job.status === "active"
                        ? "bg-positive/10 text-positive"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {job.status === "active" ? "Active" : "Paused"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time-to-Hire Distribution Card */}
      {timeToHireDist.length > 0 && (
        <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Time-to-Hire Distribution
            </h3>
            {timeStats?.median && (
              <span className="text-[11px] font-semibold font-mono text-primary">
                Median: {timeStats.median}
              </span>
            )}
          </div>

          <BarDistribution bars={timeToHireDist} medianLabel="MEDIAN" />

          {/* Stats Row */}
          {timeStats && (
            <div className="flex gap-3 mt-4 pt-4 border-t border-border">
              {timeStats.fastest && (
                <div className="flex-1 rounded-lg bg-muted border border-border/50 p-3">
                  <div className="text-[10px] text-muted-foreground/60 mb-1">
                    Fastest
                  </div>
                  <div className="font-mono text-lg font-semibold text-positive">
                    {timeStats.fastest.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {timeStats.fastest.role}
                  </div>
                </div>
              )}
              {timeStats.slowest && (
                <div className="flex-1 rounded-lg bg-muted border border-border/50 p-3">
                  <div className="text-[10px] text-muted-foreground/60 mb-1">
                    Slowest
                  </div>
                  <div className="font-mono text-lg font-semibold text-negative">
                    {timeStats.slowest.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {timeStats.slowest.role}
                  </div>
                </div>
              )}
              {timeStats.industryAvg && (
                <div className="flex-1 rounded-lg bg-muted border border-border/50 p-3">
                  <div className="text-[10px] text-muted-foreground/60 mb-1">
                    Industry Avg
                  </div>
                  <div className="font-mono text-lg font-semibold">
                    {timeStats.industryAvg}
                  </div>
                  {timeStats.comparisonNote && (
                    <div className="text-[10px] text-positive mt-0.5">
                      {timeStats.comparisonNote}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {jobs.length === 0 && timeToHireDist.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="No job data yet"
          description="Post active jobs to see per-role performance analytics."
        />
      )}
    </div>
  );
}
