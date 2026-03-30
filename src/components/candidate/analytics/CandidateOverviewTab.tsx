"use client";

import { cn } from "@/lib/utils";
import { AnalyticsKPI } from "@/components/analytics/AnalyticsKPI";
import {
  CANDIDATE_KPIS,
  CANDIDATE_PIPELINE,
  VETTING_SCORES,
} from "@/components/analytics/mock-data";

// ── Pipeline stage styling ──────────────────────────────────────

const STAGE_STYLES: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  primary: {
    bg: "bg-primary/[0.04]",
    border: "border-primary/10",
    text: "text-primary",
  },
  "primary-muted": {
    bg: "bg-primary/[0.025]",
    border: "border-primary/[0.06]",
    text: "text-primary/65",
  },
  muted: {
    bg: "bg-foreground/[0.02]",
    border: "border-border",
    text: "text-muted-foreground",
  },
  positive: {
    bg: "bg-positive/[0.04]",
    border: "border-positive/10",
    text: "text-positive",
  },
};

export function CandidateOverviewTab() {
  return (
    <div className="space-y-7">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CANDIDATE_KPIS.map((kpi) => (
          <AnalyticsKPI key={kpi.label} kpi={kpi} />
        ))}
      </div>

      {/* Application Pipeline */}
      <div
        className={cn(
          "rounded-[14px] border border-primary/[0.12] bg-card/60 backdrop-blur-sm p-7",
          "relative overflow-hidden"
        )}
      >
        {/* Featured top glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Application Pipeline
            </h3>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              Where your applications stand
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-stretch">
          {CANDIDATE_PIPELINE.map((stage, i) => {
            const style = STAGE_STYLES[stage.color] ?? STAGE_STYLES.muted;
            return (
              <div key={stage.stage} className="contents">
                {i > 0 && (
                  <div className="flex items-center text-muted-foreground/40 text-lg select-none">
                    &rarr;
                  </div>
                )}
                <div
                  className={cn(
                    "flex-1 border rounded-[10px] px-4 py-5 text-center",
                    style.bg,
                    style.border
                  )}
                >
                  <div
                    className={cn(
                      "font-display text-[30px] font-bold leading-none",
                      style.text
                    )}
                  >
                    {stage.count}
                  </div>
                  <div
                    className={cn(
                      "text-xs mt-1",
                      stage.color === "positive"
                        ? "text-positive"
                        : "text-muted-foreground/70"
                    )}
                  >
                    {stage.stage}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vetting Scores */}
      <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Vetting Scores
            </h3>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              Consensus scores from 5-7 expert panels
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-[18px]">
          {VETTING_SCORES.map((item) => {
            const pct = Math.round((item.score / item.maxScore) * 100);
            const isHigh = item.score >= 80;
            // Decrease gradient opacity per score level
            const startOpacity =
              item.score >= 80 ? 0.45 : item.score >= 70 ? 0.3 : 0.18;
            const endOpacity =
              item.score >= 80 ? 0.15 : item.score >= 70 ? 0.08 : 0.04;

            return (
              <div key={item.guild}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="inline-flex items-center rounded-full bg-primary/8 border border-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                    {item.guild}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[17px] font-semibold",
                      isHigh ? "text-positive" : "text-foreground"
                    )}
                  >
                    {item.score}
                    <span className="text-[11px] font-normal text-muted-foreground">
                      /100
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-foreground/[0.02] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, hsl(var(--primary) / ${startOpacity}), hsl(var(--primary) / ${endOpacity}))`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
