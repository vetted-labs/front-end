"use client";

import { cn } from "@/lib/utils";
import { BarDistribution } from "@/components/analytics/BarDistribution";
import {
  JOB_PERFORMANCE,
  TIME_TO_HIRE_DISTRIBUTION,
} from "@/components/analytics/mock-data";

export function CompanyJobsTab() {
  return (
    <div className="space-y-5 pt-4">
      {/* Performance Table Card */}
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
            className="grid gap-2 pb-3 border-b border-border/50 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/60"
            style={{
              gridTemplateColumns: "2fr 80px 80px 90px 80px 70px",
            }}
          >
            <span>Role</span>
            <span className="text-right">Apps</span>
            <span className="text-right">Review</span>
            <span className="text-right">Time to Hire</span>
            <span className="text-right">Views</span>
            <span className="text-center">Status</span>
          </div>

          {/* Rows */}
          {JOB_PERFORMANCE.map((job) => (
            <div
              key={job.name}
              className="grid gap-2 py-3.5 border-b border-border/30 items-center last:border-b-0"
              style={{
                gridTemplateColumns: "2fr 80px 80px 90px 80px 70px",
              }}
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

              {/* Apps */}
              <div className="text-right">
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
              <div className="text-right">
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
              <div className="text-right">
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
              <div className="text-right">
                <div className="text-[13px] font-mono font-semibold">
                  {job.views.toLocaleString()}
                </div>
              </div>

              {/* Status */}
              <div className="text-center">
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

      {/* Time-to-Hire Distribution Card */}
      <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Time-to-Hire Distribution
          </h3>
          <span className="text-[11px] font-semibold font-mono text-primary">
            Median: 14d
          </span>
        </div>

        <BarDistribution
          bars={TIME_TO_HIRE_DISTRIBUTION}
          medianLabel="MEDIAN"
        />

        {/* Stats Row */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-border">
          <div className="flex-1 rounded-lg bg-muted border border-border/50 p-3">
            <div className="text-[10px] text-muted-foreground/60 mb-1">
              Fastest
            </div>
            <div className="font-mono text-lg font-semibold text-positive">
              2.1 days
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">
              Solidity Developer
            </div>
          </div>
          <div className="flex-1 rounded-lg bg-muted border border-border/50 p-3">
            <div className="text-[10px] text-muted-foreground/60 mb-1">
              Slowest
            </div>
            <div className="font-mono text-lg font-semibold text-negative">
              34.2 days
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">
              Product Designer
            </div>
          </div>
          <div className="flex-1 rounded-lg bg-muted border border-border/50 p-3">
            <div className="text-[10px] text-muted-foreground/60 mb-1">
              Industry Avg
            </div>
            <div className="font-mono text-lg font-semibold">23.4 days</div>
            <div className="text-[10px] text-positive mt-0.5">
              You&apos;re 40% faster
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
