"use client";

import { cn } from "@/lib/utils";
import { AreaChart } from "@/components/analytics/AreaChart";
import {
  EXPERT_OVERVIEW,
  EXPERT_REPUTATION_TIMELINE,
  EXPERT_EARNINGS,
} from "@/components/analytics/mock-data";

// ── Reputation Ring ───────────────────────────────────────────

const RING_SIZE = 150;
const RING_CX = 75;
const RING_CY = 75;
const RING_R = 62;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;
const SCORE_RATIO = EXPERT_OVERVIEW.reputation / 2500;
const DASH_LENGTH = SCORE_RATIO * CIRCUMFERENCE;

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
      <div
        className={cn("font-display text-2xl font-bold", valueColor)}
      >
        {value}
      </div>
      <div className={cn("text-xs mt-1", noteColor ?? "text-muted-foreground/60")}>
        {note}
      </div>
    </div>
  );
}

// ── Net earnings total ────────────────────────────────────────

const NET_TOTAL = EXPERT_EARNINGS.reduce((sum, e) => sum + e.amount, 0);

// ── Component ─────────────────────────────────────────────────

export function ExpertOverviewTab() {
  const reputationData = EXPERT_REPUTATION_TIMELINE.map((d) => ({
    label: d.month,
    value: d.score,
  }));

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
                strokeDasharray={`${DASH_LENGTH} ${CIRCUMFERENCE}`}
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
                strokeDasharray={`${DASH_LENGTH} ${CIRCUMFERENCE}`}
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
                {EXPERT_OVERVIEW.reputation.toLocaleString()}
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
                {EXPERT_OVERVIEW.tier}
              </span>
              <div className="text-[10px] text-muted-foreground/50 mt-2">
                {EXPERT_OVERVIEW.ptsToNext} pts to Authority
              </div>
              <div className="mx-auto mt-1.5 w-[120px] h-1.5 rounded-full bg-muted/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${EXPERT_OVERVIEW.tierProgress}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right: 2x2 stat grid */}
          <div className="flex-1 grid grid-cols-2 gap-3.5">
            <StatBox
              label="$VETD Balance"
              value={EXPERT_OVERVIEW.vetdBalance.toLocaleString()}
              valueColor="text-primary"
              note={`${EXPERT_OVERVIEW.vetdStaked.toLocaleString()} staked \u00b7 ${EXPERT_OVERVIEW.vetdAvailable.toLocaleString()} available`}
            />
            <StatBox
              label="Total Earned"
              value={`${EXPERT_OVERVIEW.totalEarned.toLocaleString()} $VETD`}
              valueColor="text-positive"
              note={`+${EXPERT_OVERVIEW.periodEarned.toLocaleString()} this period`}
              noteColor="text-positive"
            />
            <StatBox
              label="Reviews Completed"
              value={EXPERT_OVERVIEW.reviewsCompleted.toLocaleString()}
              note={`${EXPERT_OVERVIEW.reviewsThisPeriod} this period`}
            />
            <StatBox
              label="Consensus Alignment"
              value={`${EXPERT_OVERVIEW.consensusAlignment}%`}
              valueColor="text-positive"
              note="Within IQR band"
            />
          </div>
        </div>
      </div>

      {/* ── Reputation Over Time ── */}
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
          <AreaChart data={reputationData} primaryColor="hsl(var(--primary))" />
        </div>
      </div>

      {/* ── Earnings Breakdown ── */}
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
            Net: +{NET_TOTAL.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {EXPERT_EARNINGS.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between mb-1.5">
                <span
                  className={cn(
                    "text-[13px]",
                    item.positive
                      ? "text-muted-foreground"
                      : "text-negative"
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
    </div>
  );
}
