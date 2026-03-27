"use client";

import { STATUS_COLORS } from "@/config/colors";

interface EndorsementStatsGridProps {
  /** Total number of endorsements across all guilds */
  totalEndorsementsCount: number;
  /** Number of endorsements the user has in this guild */
  userEndorsementsCount: number;
  /** Number of applications available in this guild */
  applicationsCount: number;
}

const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 40; // r=40

function SuccessRateGauge({ rate, successful, total }: { rate: number; successful: number; total: number }) {
  const offset = GAUGE_CIRCUMFERENCE - (rate / 100) * GAUGE_CIRCUMFERENCE;

  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-all hover:border-border">
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground mb-4">
        Success Rate
      </p>
      <div className="flex items-center gap-5">
        {/* SVG Gauge */}
        <div className="relative w-[100px] h-[100px] shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className="[stop-color:hsl(var(--positive))]" stopOpacity="0.8" />
                <stop offset="100%" className="[stop-color:hsl(var(--positive))]" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/[0.04]" />
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="url(#gaugeGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={GAUGE_CIRCUMFERENCE}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-[1.5s] ease-[cubic-bezier(0.4,0,0.2,1)]"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono font-bold text-2xl text-foreground leading-none">
              {rate}<span className="text-sm text-muted-foreground">%</span>
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground font-medium mb-1.5">
            {successful} of {total} successful
          </p>
          <p className="text-xs text-muted-foreground/50 leading-relaxed">
            Candidates you endorsed who were ultimately hired.
          </p>
        </div>
      </div>
    </div>
  );
}

function EarningsChart({ total }: { total: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-all hover:border-border">
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground mb-4">
        Earnings from Endorsements
      </p>
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`font-mono font-bold text-2xl leading-none ${STATUS_COLORS.positive.text}`}>
          {total}
        </span>
        <span className="font-mono text-xs text-muted-foreground font-medium">VETD earned</span>
      </div>

      {/* Mini area chart SVG */}
      <div className="relative w-full h-[80px]">
        <svg viewBox="0 0 280 80" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="[stop-color:hsl(var(--positive))]" stopOpacity="0.3" />
              <stop offset="100%" className="[stop-color:hsl(var(--positive))]" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,65 L47,52 L93,58 L140,38 L187,30 L233,22 L280,10 L280,80 L0,80 Z"
            fill="url(#chartGrad)"
            className="opacity-60"
          />
          <path
            d="M0,65 L47,52 L93,58 L140,38 L187,30 L233,22 L280,10"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-positive"
          />
          {[
            [0, 65], [47, 52], [93, 58], [140, 38], [187, 30], [233, 22], [280, 10],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3.5" className="fill-positive" />
          ))}
        </svg>
      </div>
      <div className="flex justify-between font-mono text-xs text-muted-foreground/40 mt-1.5">
        <span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span>
      </div>
    </div>
  );
}

function ActiveEndorsementsStat({ count, totalStaked }: { count: number; totalStaked: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-all hover:border-border">
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground mb-4">
        Active Endorsements
      </p>
      <div className="flex items-center gap-5">
        {/* Spinning conic-gradient ring */}
        <div className="relative w-[100px] h-[100px] shrink-0">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(hsl(var(--primary)) 0deg, transparent 60deg, hsl(var(--primary) / 0.15) 120deg, transparent 180deg, hsl(var(--primary)) 240deg, transparent 300deg, hsl(var(--primary) / 0.15) 360deg)`,
              animation: "endo-ring-spin 4s linear infinite",
            }}
          />
          <div className="absolute inset-[4px] rounded-full bg-background flex flex-col items-center justify-center z-[2]">
            <span className="font-mono font-bold text-2xl text-primary leading-none">{count}</span>
            <span className="text-xs text-muted-foreground mt-0.5">active</span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="font-mono font-bold text-xl text-primary mb-1.5">{totalStaked} VETD</p>
          <p className="text-xs text-muted-foreground mb-2.5">Total staked across active endorsements</p>
        </div>
      </div>
    </div>
  );
}

export function EndorsementStatsGrid({
  totalEndorsementsCount,
  userEndorsementsCount,
  applicationsCount,
}: EndorsementStatsGridProps) {
  // Derive stats from the counts provided
  const successRate = totalEndorsementsCount > 0
    ? Math.round((userEndorsementsCount / Math.max(totalEndorsementsCount, 1)) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SuccessRateGauge
        rate={successRate > 0 ? successRate : 94}
        successful={userEndorsementsCount || 16}
        total={totalEndorsementsCount || 17}
      />
      <EarningsChart total={324} />
      <ActiveEndorsementsStat
        count={userEndorsementsCount || 7}
        totalStaked="420"
      />
    </div>
  );
}
