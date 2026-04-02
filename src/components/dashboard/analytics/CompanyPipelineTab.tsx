"use client";

import { FunnelChart, type FunnelStage } from "@/components/analytics/FunnelChart";
import { HorizontalBars, type SourceData } from "@/components/analytics/HorizontalBars";
import { HeatmapChart } from "@/components/analytics/HeatmapChart";
import { DonutChart, type GuildDistribution } from "@/components/analytics/DonutChart";
import { useFetch } from "@/lib/hooks/useFetch";
import { analyticsApi } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";
import type { TimePeriod } from "@/components/analytics/TimeFilter";

// ── Types ─────────────────────────────────────────────────────

interface HireRateBySource {
  endorsed?: string;
  guild?: string;
  direct?: string;
}

interface PipelineData {
  funnelStages?: FunnelStage[];
  sources?: SourceData[];
  hireRateBySource?: HireRateBySource;
  heatmap?: number[][];
  heatmapRows?: string[];
  heatmapCols?: string[];
  heatmapPeak?: string;
  guildDistribution?: GuildDistribution[];
  guildTotal?: number;
}

// ── Component ─────────────────────────────────────────────────

interface Props {
  period: TimePeriod;
}

export function CompanyPipelineTab({ period }: Props) {
  const { data: rawData, isLoading, error } = useFetch(
    () => analyticsApi.getCompanyPipeline(period),
    {}
  );

  const data = rawData as PipelineData | null;

  const funnelStages = data?.funnelStages ?? [];
  const sources = data?.sources ?? [];
  const hireRate = data?.hireRateBySource;
  const heatmap = data?.heatmap ?? [];
  const heatmapRows = data?.heatmapRows ?? [];
  const heatmapCols = data?.heatmapCols ?? [];
  const guildDistribution = data?.guildDistribution ?? [];
  const guildTotal = data?.guildTotal ?? 0;

  const hasHeatmap =
    (data?.heatmap?.length ?? 0) > 0 &&
    (data?.heatmapRows?.length ?? 0) > 0 &&
    (data?.heatmapCols?.length ?? 0) > 0;

  if (isLoading) {
    return (
      <div className="space-y-5 pt-4">
        {[1, 2, 3].map((i) => (
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
        icon={BarChart3}
        title="Analytics coming soon"
        description="Real-time analytics will be available once the backend API is deployed."
      />
    );
  }

  return (
    <div className="space-y-5 pt-4">
      {/* Funnel — Featured Card */}
      {funnelStages.length > 0 && (
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
            <FunnelChart stages={funnelStages} />
          </div>
        </div>
      )}

      {/* 2-column: Sources + Heatmap */}
      {(sources.length > 0 || hasHeatmap) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Sources Card */}
          {sources.length > 0 && (
            <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
              <div className="mb-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Candidate Sources
                </h3>
              </div>

              <HorizontalBars data={sources} />

              {/* Hire Rate by Source */}
              {hireRate && (
                <div className="border-t border-border pt-[18px] mt-[22px]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/60 mb-3">
                    Hire Rate by Source
                  </div>
                  <div className="flex gap-2.5">
                    {hireRate.endorsed && (
                      <div className="flex-1 rounded-lg bg-muted border border-border/50 py-2.5 text-center">
                        <div className="font-mono text-lg font-semibold text-positive">
                          {hireRate.endorsed}
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                          Endorsed
                        </div>
                      </div>
                    )}
                    {hireRate.guild && (
                      <div className="flex-1 rounded-lg bg-muted border border-border/50 py-2.5 text-center">
                        <div className="font-mono text-lg font-semibold text-primary">
                          {hireRate.guild}
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                          Guild
                        </div>
                      </div>
                    )}
                    {hireRate.direct && (
                      <div className="flex-1 rounded-lg bg-muted border border-border/50 py-2.5 text-center">
                        <div className="font-mono text-lg font-semibold">
                          {hireRate.direct}
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                          Direct
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Heatmap Card */}
          {hasHeatmap && (
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
                {data?.heatmapPeak && (
                  <span className="text-[11px] font-semibold font-mono text-primary">
                    Peak: {data.heatmapPeak}
                  </span>
                )}
              </div>

              <HeatmapChart
                data={heatmap}
                rows={heatmapRows}
                cols={heatmapCols}
              />
            </div>
          )}
        </div>
      )}

      {/* Guild Distribution Card */}
      {guildDistribution.length > 0 && (
        <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
          <div className="mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Applications by Guild
            </h3>
          </div>

          <DonutChart segments={guildDistribution} total={guildTotal} />
        </div>
      )}

      {funnelStages.length === 0 && sources.length === 0 && !hasHeatmap && guildDistribution.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="No pipeline data yet"
          description="Pipeline analytics will appear as candidates move through your hiring process."
        />
      )}
    </div>
  );
}
