"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { AreaChart } from "@/components/analytics/AreaChart";
import { useFetch } from "@/lib/hooks/useFetch";
import { analyticsApi } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertTriangle, BarChart3 } from "lucide-react";
import type { TimePeriod } from "@/components/analytics/TimeFilter";
import type { ExpertOverviewData, ReputationPoint, EarningsItem } from "@/types/analytics";

// ── Ring constants ────────────────────────────────────────────

const RING_SIZE = 150;
const RING_CX = 75;
const RING_CY = 75;
const RING_R = 62;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

// ── Stat box helper ───────────────────────────────────────────

function StatBox({
  label,
  value,
  valueColor,
  note,
  noteColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
  note: string;
  noteColor?: string;
}) {
  return (
    <div className="bg-muted/10 border border-border rounded-md p-4">
      <div className="text-[11px] text-muted-foreground mb-1.5">{label}</div>
      <div className={cn("font-display text-2xl font-bold", valueColor)}>
        {value}
      </div>
      <div
        className={cn("text-xs mt-1", noteColor ?? "text-muted-foreground/60")}
      >
        {note}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────

interface Props {
  period: TimePeriod;
  walletAddress?: string;
}

export function ExpertOverviewTab({ period, walletAddress }: Props) {
  const { data: rawOverview, isLoading: overviewLoading, error: overviewError } = useFetch(
    () => analyticsApi.getExpertOverview(walletAddress!, period),
    { skip: !walletAddress }
  );

  const { data: rawTimeline, isLoading: timelineLoading, error: timelineError } = useFetch(
    () => analyticsApi.getExpertReputationTimeline(walletAddress!, period),
    { skip: !walletAddress }
  );

  const overview = rawOverview;
  const timeline = rawTimeline;

  const reputationData = useMemo(() => {
    if (!timeline) return [];
    return timeline.map((d) => ({
      label: d.label,
      value: d.value,
    }));
  }, [timeline]);

  const earnings = useMemo((): EarningsItem[] => {
    return overview?.earnings ?? [];
  }, [overview]);

  const netTotal = useMemo(
    () => earnings.reduce((sum, e) => sum + e.amount, 0),
    [earnings]
  );

  const reputation = overview?.reputation ?? 0;
  const scoreRatio = reputation / 2500;
  const dashLength = scoreRatio * CIRCUMFERENCE;

  if (!walletAddress && !overviewLoading) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Connect your wallet"
        description="Connect your wallet to view your analytics."
      />
    );
  }

  if (overviewError && timelineError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load analytics"
        description="Something went wrong loading your analytics data. Please try again."
      />
    );
  }

  if (overviewLoading || timelineLoading) {
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

  if (overviewError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load overview"
        description="Something went wrong loading your overview data. Please try again."
      />
    );
  }

  return (
    <div className="space-y-5 pt-4">
      {/* ── Reputation Hero Card ── */}
      <div className="relative rounded-[14px] border border-primary/12 bg-card/60 backdrop-blur-sm p-7 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />

        <div className="flex flex-col md:flex-row gap-10 items-center">
          {/* Left: Ring */}
          <div className="flex-shrink-0 text-center min-w-[160px]">
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              className="mx-auto"
            >
              {/* Background ring */}
              <circle
                cx={RING_CX}
                cy={RING_CY}
                r={RING_R}
                fill="none"
                stroke="currentColor"
                className="text-foreground/[0.03]"
                strokeWidth="9"
              />
              {/* Foreground ring */}
              <circle
                cx={RING_CX}
                cy={RING_CY}
                r={RING_R}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="9"
                strokeDasharray={`${dashLength} ${CIRCUMFERENCE}`}
                strokeLinecap="round"
                style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                opacity="0.75"
              />
              {/* Glow copy */}
              <circle
                cx={RING_CX}
                cy={RING_CY}
                r={RING_R}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="9"
                strokeDasharray={`${dashLength} ${CIRCUMFERENCE}`}
                strokeLinecap="round"
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: "center",
                  filter: "blur(4px)",
                }}
                opacity="0.08"
              />
              {/* Center text */}
              <text
                x={RING_CX}
                y={RING_CY - 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-foreground"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "32px",
                  fontWeight: 700,
                }}
              >
                {reputation.toLocaleString()}
              </text>
              <text
                x={RING_CX}
                y={RING_CY + 20}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                className="fill-muted-foreground"
              >
                Reputation
              </text>
            </svg>

            {/* Tier badge */}
            <div className="mt-4">
              <span className="inline-flex items-center rounded-full bg-primary/8 text-primary px-3 py-1 text-xs font-semibold">
                {overview?.tier ?? "—"}
              </span>
              {overview?.ptsToNext != null && (
                <div className="text-[10px] text-muted-foreground/50 mt-2">
                  {overview.ptsToNext} pts to Authority
                </div>
              )}
              {overview?.tierProgress != null && (
                <div className="mx-auto mt-1.5 w-[120px] h-1.5 rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${overview.tierProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right: 2x2 stat grid */}
          <div className="flex-1 grid grid-cols-2 gap-3.5">
            <StatBox
              label="$VETD Balance"
              value={(overview?.vetdBalance ?? 0).toLocaleString()}
              valueColor="text-primary"
              note={`${(overview?.vetdStaked ?? 0).toLocaleString()} staked · ${(overview?.vetdAvailable ?? 0).toLocaleString()} available`}
            />
            <StatBox
              label="Total Earned"
              value={`${(overview?.totalEarned ?? 0).toLocaleString()} $VETD`}
              valueColor="text-positive"
              note={`+${(overview?.periodEarned ?? 0).toLocaleString()} this period`}
              noteColor="text-positive"
            />
            <StatBox
              label="Reviews Completed"
              value={(overview?.reviewsCompleted ?? 0).toLocaleString()}
              note={`${overview?.reviewsThisPeriod ?? 0} this period`}
            />
            <StatBox
              label="Consensus Alignment"
              value={`${overview?.consensusAlignment ?? 0}%`}
              valueColor="text-positive"
              note="Within IQR band"
            />
          </div>
        </div>
      </div>

      {/* ── Reputation Over Time ── */}
      {reputationData.length > 0 && (
        <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
          <div className="mb-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Reputation Over Time
            </h3>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              Score progression with tier thresholds
            </p>
          </div>

          <div className="mt-4">
            <AreaChart
              data={reputationData}
              primaryColor="hsl(var(--primary))"
            />
          </div>
        </div>
      )}

      {/* ── Earnings Breakdown ── */}
      {earnings.length > 0 && (
        <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Earnings Breakdown
              </h3>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                $VETD earned and lost by source
              </p>
            </div>
            <span className="text-sm font-semibold font-mono text-positive">
              Net: +{netTotal.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {earnings.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between mb-1.5">
                  <span
                    className={cn(
                      "text-[13px]",
                      item.positive ? "text-muted-foreground" : "text-negative"
                    )}
                  >
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-mono font-semibold",
                      item.positive ? "text-positive" : "text-negative"
                    )}
                  >
                    {item.positive ? "+" : ""}
                    {Math.abs(item.amount).toLocaleString()}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted/10 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(item.pct, 1)}%`,
                      minWidth: item.pct <= 1 ? "4px" : undefined,
                      background: item.positive
                        ? "linear-gradient(90deg, hsl(var(--primary) / 0.4), hsl(var(--primary) / 0.1))"
                        : "linear-gradient(90deg, hsl(var(--destructive) / 0.35), hsl(var(--destructive) / 0.08))",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
