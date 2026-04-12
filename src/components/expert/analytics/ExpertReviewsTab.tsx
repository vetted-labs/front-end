"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { AreaChart } from "@/components/analytics/AreaChart";
import { BarDistribution } from "@/components/analytics/BarDistribution";
import { useFetch } from "@/lib/hooks/useFetch";
import { analyticsApi } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertTriangle, BarChart3 } from "lucide-react";

// ── Color helper ─────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  primary: "text-primary",
  positive: "text-positive",
};

// ── Component ────────────────────────────────────────────────

interface Props {
  period?: string;
  walletAddress?: string;
}

export function ExpertReviewsTab({ period, walletAddress }: Props) {
  const { data: rawData, isLoading, error } = useFetch(
    () => analyticsApi.getExpertConsensus(walletAddress!, period),
    { skip: !walletAddress }
  );

  const data = rawData;

  const consensusData = useMemo(() => {
    if (!data?.consensusTimeline) return [];
    return data.consensusTimeline.map((d) => ({
      label: d.label,
      value: d.value,
    }));
  }, [data]);

  const scoreBars = useMemo(() => {
    if (!data?.scoreDistribution) return [];
    const dist = data.scoreDistribution;
    const maxCount = Math.max(...dist.map((s) => s.count));
    return dist.map((d) => ({
      range: d.range,
      count: d.count,
      opacity: d.opacity ?? (d.count === maxCount ? 1 : d.count / maxCount),
      isMedian: d.isMedian ?? d.count === maxCount,
    }));
  }, [data]);

  const staking = data?.staking ?? [];

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
        title="Unable to load reviews"
        description="Something went wrong loading your review data. Please try again."
      />
    );
  }

  return (
    <div className="space-y-5 pt-4">
      {/* ── Consensus Alignment Chart ── */}
      {consensusData.length > 0 && (
        <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
          <div className="mb-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Consensus Alignment
            </h3>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              % of votes within IQR band over time
            </p>
          </div>

          <div className="mt-4">
            <AreaChart
              data={consensusData}
              primaryColor="hsl(var(--positive))"
            />
          </div>
        </div>
      )}

      {/* ── 2-column: Score Deviation + Staking ── */}
      {(scoreBars.length > 0 || staking.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Score Deviation */}
          {scoreBars.length > 0 && (
            <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
              <div className="mb-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Score Deviation
                </h3>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  Your scores vs consensus median
                </p>
              </div>

              <BarDistribution bars={scoreBars} medianLabel="In IQR" />
            </div>
          )}

          {/* Staking Portfolio */}
          {staking.length > 0 && (
            <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
              <div className="mb-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Staking Portfolio
                </h3>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  $VETD allocation
                </p>
              </div>

              <div className="flex flex-col">
                {staking.map((item, i) => (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-center justify-between py-3.5",
                      i < staking.length - 1 && "border-b border-border"
                    )}
                  >
                    <span className="text-[13px] text-muted-foreground">
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-mono font-semibold",
                        item.color ? COLOR_MAP[item.color] : "text-foreground"
                      )}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty fallback when no data sections rendered */}
      {consensusData.length === 0 && scoreBars.length === 0 && staking.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="No review data yet"
          description="Complete reviews to start seeing your performance metrics."
        />
      )}
    </div>
  );
}
