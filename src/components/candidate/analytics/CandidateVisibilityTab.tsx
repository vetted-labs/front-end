"use client";

import { cn } from "@/lib/utils";
import { AreaChart } from "@/components/analytics/AreaChart";
import {
  PROFILE_VIEWS_DATA,
  CANDIDATE_DISCOVERY,
  GUILD_MEMBERSHIPS,
} from "@/components/analytics/mock-data";

export function CandidateVisibilityTab() {
  const chartData = PROFILE_VIEWS_DATA.map((d) => ({
    label: d.week,
    value: d.views,
  }));

  return (
    <div className="space-y-5">
      {/* Profile Views Chart */}
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

        <p className="text-[11px] text-muted-foreground mt-2">
          89 views{" "}
          <span className="text-muted-foreground/50">&middot;</span>{" "}
          <span className="text-positive">+34%</span> vs prior period
        </p>
      </div>

      {/* 2-column grid */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Discovery Metrics */}
        <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
          <div className="mb-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Discovery
            </h3>
          </div>

          <div className="flex flex-col">
            {CANDIDATE_DISCOVERY.map((metric, i) => (
              <div
                key={metric.label}
                className={cn(
                  "flex justify-between items-center py-3",
                  i < CANDIDATE_DISCOVERY.length - 1 &&
                    "border-b border-border/50"
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

        {/* Guild Memberships */}
        <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
          <div className="mb-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Guild Memberships
            </h3>
          </div>

          <div className="flex flex-col gap-2.5">
            {GUILD_MEMBERSHIPS.map((g) => {
              const isActive = g.status === "active";
              return (
                <div
                  key={g.guild}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-[10px] border",
                    isActive
                      ? "bg-primary/[0.02] border-primary/[0.06]"
                      : "bg-white/[0.015] border-border"
                  )}
                >
                  <span className="inline-flex items-center rounded-full bg-primary/8 border border-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                    {g.guild}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">Score: {g.score}</div>
                    <div className="text-[10px] text-muted-foreground/60">
                      Vetted {g.vettedDate}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold",
                      isActive
                        ? "text-positive"
                        : "text-muted-foreground"
                    )}
                  >
                    {isActive ? "Active" : "Improve"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
