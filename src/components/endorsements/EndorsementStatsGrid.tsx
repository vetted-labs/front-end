"use client";

import { useMemo } from "react";
import { STATUS_COLORS } from "@/config/colors";
import type { ActiveEndorsement, EarningsBreakdownResponse, EarningsEntry } from "@/types";

interface EndorsementStatsGridProps {
  /** Endorsements in the currently selected guild */
  guildEndorsements: ActiveEndorsement[];
  /** All endorsements across all guilds */
  allEndorsements: ActiveEndorsement[];
  /** Real earnings data from expertApi.getEarningsBreakdown() */
  earningsData: EarningsBreakdownResponse | null;
}

const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 40; // r=40

function GuildShareGauge({ rate, guildCount, totalCount }: { rate: number; guildCount: number; totalCount: number }) {
  const offset = GAUGE_CIRCUMFERENCE - (rate / 100) * GAUGE_CIRCUMFERENCE;

  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-all hover:border-border">
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground mb-4">
        Guild Share
      </p>
      <div className="flex items-center gap-4">
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
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground font-medium mb-1.5">
            {guildCount} of {totalCount} in this guild
          </p>
          <p className="text-xs text-muted-foreground/50 leading-relaxed">
            Endorsements in this guild out of your total.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Build monthly earnings totals from real API entries, returning the last 6 months. */
function buildMonthlyEarnings(entries: EarningsEntry[]): { label: string; value: number }[] {
  const now = new Date();
  const months: { label: string; year: number; month: number; value: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString("default", { month: "short" }),
      year: d.getFullYear(),
      month: d.getMonth(),
      value: 0,
    });
  }

  for (const entry of entries) {
    const dateStr = entry.created_at;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;
    const amount = typeof entry.amount === "string" ? parseFloat(entry.amount) : entry.amount;
    if (isNaN(amount)) continue;
    const m = months.find((m) => m.year === date.getFullYear() && m.month === date.getMonth());
    if (m) m.value += amount;
  }

  return months.map((m) => ({ label: m.label, value: m.value }));
}

/** Convert data points to an SVG polyline within a viewBox. */
function toSvgPath(data: { value: number }[], width: number, height: number): { line: string; area: string; points: [number, number][] } {
  if (data.length === 0) return { line: "", area: "", points: [] };

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const step = width / Math.max(data.length - 1, 1);
  const points: [number, number][] = data.map((d, i) => [
    i * step,
    height - (d.value / maxVal) * (height - 10) - 5,
  ]);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return { line, area, points };
}

function EarningsChart({ earningsData }: { earningsData: EarningsBreakdownResponse | null }) {
  // The API may return different shapes depending on auto-unwrap:
  //   EarningsBreakdownResponse: { summary, items: { items: [...] } }
  //   EarningsBreakdown: { entries: [...], summary }
  // Handle all paths.
  const raw = earningsData as Record<string, unknown> | null;
  const entries: EarningsEntry[] = useMemo(() => {
    if (!raw) return [];
    // EarningsBreakdownResponse shape (after auto-unwrap)
    const itemsObj = raw.items as { items?: EarningsEntry[] } | undefined;
    if (itemsObj?.items) return itemsObj.items;
    // Nested under .data (before auto-unwrap)
    const dataObj = raw.data as { items?: { items?: EarningsEntry[] } } | undefined;
    if (dataObj?.items?.items) return dataObj.items.items;
    // EarningsBreakdown shape
    if (Array.isArray(raw.entries)) return raw.entries as EarningsEntry[];
    return [];
  }, [raw]);

  const summary = (earningsData?.summary ?? earningsData?.data?.summary) as { totalVetd?: number } | undefined;
  const totalEarned = summary?.totalVetd
    ?? entries.reduce((sum, e) => sum + (typeof e.amount === "string" ? parseFloat(e.amount) : e.amount ?? 0), 0);

  const monthly = useMemo(() => buildMonthlyEarnings(entries), [entries]);
  const { line, area, points } = useMemo(() => toSvgPath(monthly, 280, 80), [monthly]);
  const hasData = monthly.some((m) => m.value > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-all hover:border-border">
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground mb-4">
        Earnings from Endorsements
      </p>
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`font-mono font-bold text-2xl leading-none ${STATUS_COLORS.positive.text}`}>
          {totalEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
        <span className="font-mono text-xs text-muted-foreground font-medium">VETD earned</span>
      </div>

      <div className="relative w-full h-[80px]">
        {hasData ? (
          <svg viewBox="0 0 280 80" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className="[stop-color:hsl(var(--positive))]" stopOpacity="0.3" />
                <stop offset="100%" className="[stop-color:hsl(var(--positive))]" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#chartGrad)" className="opacity-60" />
            <path d={line} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-positive" />
            {points.map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="3.5" className="fill-positive" />
            ))}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-muted-foreground/50">No earnings yet</p>
          </div>
        )}
      </div>
      <div className="flex justify-between font-mono text-xs text-muted-foreground/40 mt-1.5">
        {monthly.map((m) => (
          <span key={m.label}>{m.label}</span>
        ))}
      </div>
    </div>
  );
}

function ActiveEndorsementsStat({ count, totalStaked }: { count: number; totalStaked: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-all hover:border-border">
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground mb-4">
        Active Endorsements
      </p>
      <div className="flex items-center gap-4">
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
        <div className="flex-1 min-w-0">
          <p className="font-mono font-bold text-xl text-primary mb-1.5">
            {totalStaked.toLocaleString(undefined, { maximumFractionDigits: 0 })} VETD
          </p>
          <p className="text-xs text-muted-foreground mb-2.5">Total staked across active endorsements</p>
        </div>
      </div>
    </div>
  );
}

export function EndorsementStatsGrid({
  guildEndorsements,
  allEndorsements,
  earningsData,
}: EndorsementStatsGridProps) {
  const guildCount = guildEndorsements.length;
  const totalCount = allEndorsements.length;

  const guildShareRate = totalCount > 0
    ? Math.round((guildCount / totalCount) * 100)
    : 0;

  const guildStaked = useMemo(
    () => guildEndorsements.reduce((sum, e) => sum + parseFloat(e.stakeAmount || e.amount || "0"), 0),
    [guildEndorsements]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <GuildShareGauge
        rate={guildShareRate}
        guildCount={guildCount}
        totalCount={totalCount}
      />
      <EarningsChart earningsData={earningsData} />
      <ActiveEndorsementsStat
        count={guildCount}
        totalStaked={guildStaked}
      />
    </div>
  );
}
