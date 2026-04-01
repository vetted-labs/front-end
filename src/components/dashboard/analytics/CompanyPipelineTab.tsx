"use client";

import { FunnelChart } from "@/components/analytics/FunnelChart";
import { HorizontalBars } from "@/components/analytics/HorizontalBars";
import { HeatmapChart } from "@/components/analytics/HeatmapChart";
import { DonutChart } from "@/components/analytics/DonutChart";
import {
  FUNNEL_STAGES,
  SOURCE_DATA,
  HEATMAP_DATA,
  HEATMAP_ROWS,
  HEATMAP_COLS,
  GUILD_DISTRIBUTION,
} from "@/components/analytics/mock-data";

export function CompanyPipelineTab() {
  return (
    <div className="space-y-5 pt-4">
      {/* Funnel — Featured Card */}
      <div className="relative rounded-[14px] border border-primary/12 bg-card/60 backdrop-blur-sm p-7 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />

        <div className="mb-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Hiring Funnel
          </h3>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            Conversion through each stage
          </p>
        </div>

        <div className="mt-4">
          <FunnelChart stages={FUNNEL_STAGES} />
        </div>
      </div>

      {/* 2-column: Sources + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sources Card */}
        <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
          <div className="mb-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Candidate Sources
            </h3>
          </div>

          <HorizontalBars data={SOURCE_DATA} />

          {/* Hire Rate by Source */}
          <div className="border-t border-border pt-[18px] mt-[22px]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/60 mb-3">
              Hire Rate by Source
            </div>
            <div className="flex gap-2.5">
              <div className="flex-1 rounded-lg bg-muted border border-border/50 py-2.5 text-center">
                <div className="font-mono text-lg font-semibold text-positive">
                  6.1%
                </div>
                <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Endorsed
                </div>
              </div>
              <div className="flex-1 rounded-lg bg-muted border border-border/50 py-2.5 text-center">
                <div className="font-mono text-lg font-semibold text-primary">
                  4.2%
                </div>
                <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Guild
                </div>
              </div>
              <div className="flex-1 rounded-lg bg-muted border border-border/50 py-2.5 text-center">
                <div className="font-mono text-lg font-semibold">1.8%</div>
                <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Direct
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap Card */}
        <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Application Activity
              </h3>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                When candidates apply
              </p>
            </div>
            <span className="text-[11px] font-semibold font-mono text-primary">
              Peak: Tue 2pm
            </span>
          </div>

          <HeatmapChart
            data={HEATMAP_DATA}
            rows={HEATMAP_ROWS}
            cols={HEATMAP_COLS}
          />
        </div>
      </div>

      {/* Guild Distribution Card */}
      <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
        <div className="mb-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Applications by Guild
          </h3>
        </div>

        <DonutChart segments={GUILD_DISTRIBUTION} total={1247} />
      </div>
    </div>
  );
}
