"use client";

import { cn } from "@/lib/utils";
import { AreaChart } from "@/components/analytics/AreaChart";
import { BarDistribution } from "@/components/analytics/BarDistribution";
import {
  EXPERT_SCORE_DISTRIBUTION,
  EXPERT_STAKING,
} from "@/components/analytics/mock-data";

// ── Consensus alignment data ─────────────────────────────────

const CONSENSUS_DATA = [
  { label: "Oct", value: 78 },
  { label: "Nov", value: 82 },
  { label: "Dec", value: 86 },
  { label: "Jan", value: 89 },
  { label: "Feb", value: 90 },
  { label: "Mar", value: 92 },
];

// ── Map score distribution to BarDistribution format ─────────

const SCORE_BARS = EXPERT_SCORE_DISTRIBUTION.map((d) => {
  const maxCount = Math.max(...EXPERT_SCORE_DISTRIBUTION.map((s) => s.count));
  const isMax = d.count === maxCount;
  return {
    range: d.range,
    count: d.count,
    opacity: isMax ? 1 : d.count / maxCount,
    isMedian: isMax,
  };
});

// ── Color helper ─────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  primary: "text-primary",
  positive: "text-positive",
};

// ── Component ────────────────────────────────────────────────

export function ExpertReviewsTab() {
  return (
    <div className="space-y-5 pt-4">
      {/* ── Consensus Alignment Chart ── */}
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
            data={CONSENSUS_DATA}
            primaryColor="hsl(var(--positive))"
          />
        </div>
      </div>

      {/* ── 2-column: Score Deviation + Staking ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Score Deviation */}
        <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
          <div className="mb-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Score Deviation
            </h3>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              Your scores vs consensus median
            </p>
          </div>

          <BarDistribution bars={SCORE_BARS} medianLabel="In IQR" />
        </div>

        {/* Staking Portfolio */}
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
            {EXPERT_STAKING.map((item, i) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center justify-between py-3.5",
                  i < EXPERT_STAKING.length - 1 && "border-b border-border"
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
      </div>
    </div>
  );
}
