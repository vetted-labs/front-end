# Staking Portfolio V2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the WithdrawalsPage into a premium staking portfolio dashboard with donut chart, allocation bar, and improved guild positions list.

**Architecture:** Single file rewrite of `WithdrawalsPage.tsx`, plus a new `StakingDonutChart.tsx` SVG component and a `GUILD_HEX_COLORS` map in `colors.ts`. All existing hooks/data fetching stay unchanged — only the render layer changes. The existing `StakingModal` is reused as-is.

**Tech Stack:** React 19, TailwindCSS 4, inline SVG (no chart library), existing `useFetch`/`useTokenBalance`/`useExpertAccount` hooks.

---

### File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/components/expert/StakingDonutChart.tsx` | Pure SVG donut chart component — arc segments, hover tooltip, center label |
| Modify | `src/config/colors.ts` | Add `GUILD_HEX_COLORS` map + `getGuildHexColor()` helper |
| Modify | `src/components/expert/WithdrawalsPage.tsx` | Complete rewrite — hero, stats strip, allocation bar, donut + positions grid |
| Modify | `src/components/ui/page-skeleton.tsx` | Update `WithdrawalsSkeleton` to match new layout |

---

### Task 1: Add guild hex color map to colors.ts

**Files:**
- Modify: `src/config/colors.ts`

The existing `GUILD_BADGE_COLORS` uses Tailwind class names (e.g., `bg-info-blue/10`), which can't be used for inline SVG `fill` attributes. We need a parallel map of raw hex colors that matches the `--gc-rgb` values in `globals.css`.

- [ ] **Step 1: Add GUILD_HEX_COLORS and getGuildHexColor to colors.ts**

Append at the end of `src/config/colors.ts`, before the closing of the file (after the `REWARD_TIER_COLORS` export):

```typescript
// ─── Guild Hex Colors (for SVG charts / inline styles) ──────────────
// These match the --gc-rgb values in globals.css.

export const GUILD_HEX_COLORS: Record<string, string> = {
  engineering: "#3b82f6",
  design: "#a855f7",
  data: "#14b8a6",
  security: "#ef4444",
  marketing: "#f59e0b",
  devops: "#22c55e",
  product: "#ff6a00",
  operations: "#94a3b8",
  finance: "#f59e0b",
  people: "#a855f7",
  sales: "#22c55e",
};

const DEFAULT_GUILD_HEX = "#ff6a00"; // brand orange fallback

/** Resolve a guild name to a hex color string for SVG/inline styles. */
export function getGuildHexColor(guildName: string): string {
  const key = guildName.toLowerCase().replace(/ guild$/i, "").split(/[\s&,]+/)[0];
  return GUILD_HEX_COLORS[key] ?? DEFAULT_GUILD_HEX;
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/svendaneel/Desktop/vetted/front-end && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to colors.ts

- [ ] **Step 3: Commit**

```bash
git add src/config/colors.ts
git commit -m "feat: add GUILD_HEX_COLORS map for SVG chart fills"
```

---

### Task 2: Create StakingDonutChart component

**Files:**
- Create: `src/components/expert/StakingDonutChart.tsx`

A pure presentational SVG donut chart. Accepts an array of segments (label, value, color) and renders arc-based paths with hover tooltips.

- [ ] **Step 1: Create StakingDonutChart.tsx**

Create `src/components/expert/StakingDonutChart.tsx`:

```tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface DonutSegment {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

interface StakingDonutChartProps {
  segments: DonutSegment[];
  totalLabel: string;
  totalValue: string;
  size?: number;
}

/* ─── SVG arc math ─── */

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startDeg: number, endDeg: number,
) {
  const os = polarToCartesian(cx, cy, outerR, startDeg);
  const oe = polarToCartesian(cx, cy, outerR, endDeg);
  const is_ = polarToCartesian(cx, cy, innerR, endDeg);
  const ie = polarToCartesian(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${is_.x} ${is_.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${ie.x} ${ie.y}`,
    "Z",
  ].join(" ");
}

/* ─── Component ─── */

export function StakingDonutChart({
  segments,
  totalLabel,
  totalValue,
  size = 220,
}: StakingDonutChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const viewBox = 200;
  const cx = viewBox / 2;
  const cy = viewBox / 2;
  const outerR = 88;
  const innerR = 58;
  const gapDeg = 1.5;
  const totalGap = gapDeg * segments.length;
  const available = 360 - totalGap;

  const paths: { d: string; color: string; index: number }[] = [];
  let startAngle = -90;

  for (let i = 0; i < segments.length; i++) {
    const sweep = (segments[i].percentage / 100) * available;
    const endAngle = startAngle + sweep;
    paths.push({
      d: arcPath(cx, cy, outerR, innerR, startAngle, endAngle),
      color: segments[i].color,
      index: i,
    });
    startAngle = endAngle + gapDeg;
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, index: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setHovered(index);
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: size, height: size }}
      onMouseLeave={() => setHovered(null)}
    >
      <svg viewBox={`0 0 ${viewBox} ${viewBox}`} className="w-full h-full">
        {paths.map((p) => (
          <path
            key={p.index}
            d={p.d}
            fill={p.color}
            className={cn(
              "transition-opacity duration-200",
              hovered !== null && hovered !== p.index && "opacity-30",
            )}
            style={{ cursor: "pointer" }}
            onMouseMove={(e) => handleMouseMove(e, p.index)}
          />
        ))}
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold tracking-tight">{totalValue}</span>
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mt-0.5">
          {totalLabel}
        </span>
      </div>

      {/* Tooltip */}
      {hovered !== null && (
        <div
          className="absolute z-20 pointer-events-none rounded-lg border border-border bg-popover px-3 py-2 shadow-lg"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: "translate(-50%, calc(-100% - 12px))",
          }}
        >
          <div className="text-sm font-semibold" style={{ color: segments[hovered].color }}>
            {segments[hovered].label}
          </div>
          <div className="text-xs text-muted-foreground font-mono tabular-nums">
            {segments[hovered].value.toFixed(2)} VETD &middot; {segments[hovered].percentage.toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/svendaneel/Desktop/vetted/front-end && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/expert/StakingDonutChart.tsx
git commit -m "feat: add StakingDonutChart SVG component"
```

---

### Task 3: Rewrite WithdrawalsPage

**Files:**
- Modify: `src/components/expert/WithdrawalsPage.tsx`

Complete rewrite. Preserves all existing data fetching logic and hook usage. Replaces the entire render with the new design: breadcrumb, hero number, stats strip, allocation bar, donut + positions grid.

- [ ] **Step 1: Rewrite WithdrawalsPage.tsx**

Replace the entire contents of `src/components/expert/WithdrawalsPage.tsx` with:

```tsx
"use client";

import { useState, useMemo } from "react";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { formatEther } from "viem";
import { hashToBytes32 } from "@/lib/blockchain";
import { Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { blockchainApi } from "@/lib/api";
import { toast } from "sonner";
import { useFetch } from "@/lib/hooks/useFetch";
import { buttonVariants } from "@/components/ui/button";
import { useTokenBalance } from "@/lib/hooks/useVettedContracts";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { StakingDonutChart } from "@/components/expert/StakingDonutChart";
import { getGuildHexColor } from "@/config/colors";
import type { GuildStakeInfo } from "@/types";

const StakingModal = dynamic(
  () =>
    import("@/components/dashboard/StakingModal").then((m) => ({
      default: m.StakingModal,
    })),
  { ssr: false }
);

/* ─── Types ────────────────────────────────────────────── */

interface UnstakeInfo {
  hasRequest: boolean;
  unlockTime?: string;
  amount?: string;
}

interface GuildPosition extends GuildStakeInfo {
  unstakeInfo?: UnstakeInfo;
}

/* ─── Helpers ──────────────────────────────────────────── */

function getGuildAbbreviation(name: string): string {
  const words = name.split(/[\s&,]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function getCooldownProgress(unlockTime: string): {
  percent: number;
  label: string;
} {
  const unlock = new Date(unlockTime).getTime();
  const now = Date.now();
  const totalCooldown = 7 * 24 * 60 * 60 * 1000;
  const remaining = Math.max(0, unlock - now);
  const elapsed = totalCooldown - remaining;
  const percent = Math.min(
    100,
    Math.max(0, (elapsed / totalCooldown) * 100)
  );

  if (remaining <= 0) return { percent: 100, label: "Ready" };

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor(
    (remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
  );
  return { percent, label: `${days}d ${hours}h` };
}

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

/* ─── Component ────────────────────────────────────────── */

export default function WithdrawalsPage() {
  const { address } = useExpertAccount();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState<string | undefined>();

  const { balance, refetchBalance } = useTokenBalance();

  const {
    data: guildStakes,
    isLoading: loadingStakes,
    refetch: refetchStakes,
  } = useFetch<GuildStakeInfo[]>(
    () => blockchainApi.getExpertGuildStakes(address!),
    {
      skip: !address,
      onError: (error) => {
        if (!error.includes("404")) {
          toast.error("Failed to load staking information");
        }
      },
    }
  );

  const guildsWithStakes = useMemo(
    () => (guildStakes || []).filter((g) => parseFloat(g.stakedAmount) > 0),
    [guildStakes]
  );

  const { data: unstakeMap } = useFetch<Record<string, UnstakeInfo>>(
    async () => {
      if (guildsWithStakes.length === 0) return {};
      const results = await Promise.all(
        guildsWithStakes.map(async (g) => {
          try {
            const info = await blockchainApi.getUnstakeRequestDetailed(
              address!,
              hashToBytes32(g.guildId)
            );
            return [g.guildId, info] as const;
          } catch {
            return [g.guildId, { hasRequest: false }] as const;
          }
        })
      );
      return Object.fromEntries(results);
    },
    { skip: !address || guildsWithStakes.length === 0 }
  );

  const positions: GuildPosition[] = useMemo(
    () =>
      guildsWithStakes.map((g) => ({
        ...g,
        unstakeInfo: unstakeMap?.[g.guildId],
      })),
    [guildsWithStakes, unstakeMap]
  );

  const totalStaked = useMemo(
    () => positions.reduce((sum, g) => sum + parseFloat(g.stakedAmount), 0),
    [positions]
  );

  const pendingUnstake = useMemo(() => {
    let totalAmount = 0;
    let earliestUnlock: string | null = null;
    for (const p of positions) {
      if (p.unstakeInfo?.hasRequest && p.unstakeInfo.amount) {
        totalAmount += parseFloat(p.unstakeInfo.amount);
        if (
          p.unstakeInfo.unlockTime &&
          (!earliestUnlock || p.unstakeInfo.unlockTime < earliestUnlock)
        ) {
          earliestUnlock = p.unstakeInfo.unlockTime;
        }
      }
    }
    return { totalAmount, earliestUnlock };
  }, [positions]);

  const availableBalance =
    balance !== undefined ? parseFloat(formatEther(balance)) : 0;

  const stakingRatio = availableBalance > 0
    ? ((totalStaked / (totalStaked + availableBalance)) * 100).toFixed(5)
    : "0";

  /* Sorted positions: highest stake first */
  const sortedPositions = useMemo(
    () => [...positions].sort((a, b) => parseFloat(b.stakedAmount) - parseFloat(a.stakedAmount)),
    [positions]
  );

  /* Donut segments */
  const donutSegments = useMemo(
    () =>
      sortedPositions.map((g) => {
        const value = parseFloat(g.stakedAmount);
        return {
          label: g.guildName || g.guildId,
          value,
          color: getGuildHexColor(g.guildName || g.guildId),
          percentage: totalStaked > 0 ? (value / totalStaked) * 100 : 0,
        };
      }),
    [sortedPositions, totalStaked]
  );

  const handleGuildClick = (guildId: string) => {
    setSelectedGuildId(guildId);
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    refetchStakes();
    refetchBalance();
  };

  // ── No wallet ──
  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-muted-foreground mb-4">
            Please connect your wallet to manage your staking portfolio
          </p>
          <Link href="/expert/dashboard" className={cn(buttonVariants())}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loadingStakes) {
    return (
      <div
        className="flex items-center justify-center py-20"
        role="status"
        aria-label="Loading staking portfolio"
      >
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-page-enter">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/expert/dashboard" },
          { label: "Staking Portfolio" },
        ]}
      />

      {/* ── Hero: Big Number ── */}
      <div className="mb-10 mt-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
          Total Staked Value
        </p>
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-5xl sm:text-6xl font-extrabold tracking-tighter tabular-nums">
            {formatCompactNumber(totalStaked)}
          </span>
          <span className="text-2xl font-semibold text-muted-foreground tracking-tight">
            VETD
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {positions.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {positions.length} active guild{positions.length !== 1 ? "s" : ""}
            </span>
          )}
          {pendingUnstake.totalAmount > 0 && pendingUnstake.earliestUnlock && (
            <span className="text-xs">
              {pendingUnstake.totalAmount.toFixed(2)} VETD pending &middot;{" "}
              {getCooldownProgress(pendingUnstake.earliestUnlock).label} left
            </span>
          )}
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-3 rounded-xl border border-border overflow-hidden mb-10">
        <div className="bg-card p-5 border-r border-border">
          <div className="text-xs text-muted-foreground mb-1.5 font-medium">Available Balance</div>
          <div className="text-lg font-bold tabular-nums tracking-tight font-mono">
            {formatCompactNumber(availableBalance)}
            <span className="text-xs font-normal text-muted-foreground ml-1">VETD</span>
          </div>
        </div>
        <div className="bg-card p-5 border-r border-border">
          <div className="text-xs text-muted-foreground mb-1.5 font-medium">Pending Unstake</div>
          <div className={cn(
            "text-lg font-bold tabular-nums tracking-tight font-mono",
            pendingUnstake.totalAmount === 0 && "text-muted-foreground"
          )}>
            {pendingUnstake.totalAmount.toFixed(2)}
            <span className="text-xs font-normal text-muted-foreground ml-1">VETD</span>
          </div>
        </div>
        <div className="bg-card p-5">
          <div className="text-xs text-muted-foreground mb-1.5 font-medium">Staking Ratio</div>
          <div className="text-lg font-bold tabular-nums tracking-tight font-mono text-primary">
            {stakingRatio}%
          </div>
        </div>
      </div>

      {/* ── Allocation Bar ── */}
      {sortedPositions.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Allocation
          </h2>
          {/* Stacked bar */}
          <div className="flex h-9 rounded-lg overflow-hidden gap-0.5 mb-4">
            {sortedPositions.map((g) => {
              const pct = totalStaked > 0
                ? (parseFloat(g.stakedAmount) / totalStaked) * 100
                : 0;
              return (
                <button
                  key={g.guildId}
                  onClick={() => handleGuildClick(g.guildId)}
                  className="transition-all hover:brightness-110 hover:scale-y-105 origin-center cursor-pointer"
                  style={{
                    width: `${pct}%`,
                    background: getGuildHexColor(g.guildName || g.guildId),
                    minWidth: pct > 0 ? 3 : 0,
                  }}
                  title={`${g.guildName}: ${parseFloat(g.stakedAmount).toFixed(2)} VETD (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {sortedPositions.map((g) => {
              const pct = totalStaked > 0
                ? (parseFloat(g.stakedAmount) / totalStaked) * 100
                : 0;
              const shortName = (g.guildName || g.guildId).split(",")[0].split("&")[0].trim();
              return (
                <div key={g.guildId} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: getGuildHexColor(g.guildName || g.guildId) }}
                  />
                  <span>{shortName}</span>
                  <span className="font-mono text-xs text-muted-foreground/60 tabular-nums">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Donut + Positions Grid ── */}
      {sortedPositions.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          No active stakes found across any guilds.{" "}
          <Link href="/expert/dashboard" className="text-primary hover:underline">
            Go to Dashboard
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Left: Donut */}
          <div className="rounded-xl border border-border bg-card p-6 lg:sticky lg:top-6 flex flex-col items-center">
            <StakingDonutChart
              segments={donutSegments}
              totalValue={totalStaked.toFixed(0)}
              totalLabel="Total VETD"
            />
            {/* Mini legend */}
            <div className="w-full mt-4 flex flex-col divide-y divide-border">
              {sortedPositions.map((g) => {
                const pct = totalStaked > 0
                  ? (parseFloat(g.stakedAmount) / totalStaked) * 100
                  : 0;
                const shortName = (g.guildName || g.guildId).split(",")[0].split("&")[0].trim();
                return (
                  <div key={g.guildId} className="flex items-center justify-between py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-sm flex-shrink-0"
                        style={{ background: getGuildHexColor(g.guildName || g.guildId) }}
                      />
                      <span className="text-muted-foreground">{shortName}</span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground/60 tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Positions list */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-base font-bold">Guild Positions</h2>
              <span className="text-xs text-muted-foreground">Click to manage stake</span>
            </div>
            <div className="flex flex-col">
              {sortedPositions.map((guild, index) => {
                const amount = parseFloat(guild.stakedAmount);
                const pct = totalStaked > 0 ? (amount / totalStaked) * 100 : 0;
                const hasCooldown = guild.unstakeInfo?.hasRequest;
                const cooldown =
                  hasCooldown && guild.unstakeInfo?.unlockTime
                    ? getCooldownProgress(guild.unstakeInfo.unlockTime)
                    : null;
                const hexColor = getGuildHexColor(guild.guildName || guild.guildId);

                return (
                  <button
                    key={guild.guildId}
                    onClick={() => handleGuildClick(guild.guildId)}
                    className="flex items-center gap-3.5 px-3 py-3.5 rounded-xl text-left transition-all hover:bg-muted/40 cursor-pointer group"
                  >
                    {/* Rank */}
                    <span className="w-5 text-center text-xs font-mono text-muted-foreground/50 tabular-nums">
                      {index + 1}
                    </span>

                    {/* Guild icon */}
                    <div
                      className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                      style={{ background: `${hexColor}1a`, color: hexColor }}
                    >
                      {getGuildAbbreviation(guild.guildName || guild.guildId)}
                    </div>

                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold truncate">
                          {guild.guildName || guild.guildId}
                        </span>
                        {hasCooldown && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide bg-[#d9b45f]/12 text-[#d9b45f] px-1.5 py-0.5 rounded flex-shrink-0">
                            Cooldown
                          </span>
                        )}
                      </div>
                      <div className="h-[3px] bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: hexColor, opacity: 0.6 }}
                        />
                      </div>
                      {hasCooldown && guild.unstakeInfo?.amount && cooldown && (
                        <div className="text-[11px] text-[#d9b45f] mt-1">
                          Unstaking {parseFloat(guild.unstakeInfo.amount).toFixed(2)} VETD
                          {" · "}{cooldown.label} remaining
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold tabular-nums font-mono">
                        {amount.toFixed(2)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">VETD</span>
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground/50 tabular-nums">
                        {pct.toFixed(1)}%
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Staking Modal ── */}
      <StakingModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedGuildId(undefined);
        }}
        onSuccess={handleModalSuccess}
        preselectedGuildId={selectedGuildId}
        defaultMode="withdraw"
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/svendaneel/Desktop/vetted/front-end && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Verify dev server renders**

Run: `cd /Users/svendaneel/Desktop/vetted/front-end && npm run dev`
Open: `http://localhost:3000/expert/withdrawals`
Verify: Page loads without errors, layout matches mockup design

- [ ] **Step 4: Commit**

```bash
git add src/components/expert/WithdrawalsPage.tsx
git commit -m "feat: redesign staking portfolio with donut chart and allocation bar"
```

---

### Task 4: Update WithdrawalsSkeleton

**Files:**
- Modify: `src/components/ui/page-skeleton.tsx`

Update the loading skeleton to match the new layout structure (breadcrumb → hero number → stats strip → allocation bar → two-column grid).

- [ ] **Step 1: Update WithdrawalsSkeleton**

In `src/components/ui/page-skeleton.tsx`, replace the `WithdrawalsSkeleton` function with:

```tsx
export function WithdrawalsSkeleton() {
  return (
    <div className="min-h-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb */}
        <Skeleton className="h-4 w-40" />

        {/* Hero number */}
        <div className="space-y-3 mt-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-14 w-64" />
          <Skeleton className="h-5 w-32 rounded-full" />
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 rounded-xl border border-border overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card p-5 border-r border-border last:border-r-0">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>

        {/* Allocation bar */}
        <div>
          <Skeleton className="h-3 w-20 mb-4" />
          <Skeleton className="h-9 w-full rounded-lg mb-4" />
          <div className="flex gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
          </div>
        </div>

        {/* Two-column: donut + positions */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center">
            <Skeleton className="w-[220px] h-[220px] rounded-full mb-4" />
            <div className="w-full space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 mb-3" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/svendaneel/Desktop/vetted/front-end && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/page-skeleton.tsx
git commit -m "refactor: update WithdrawalsSkeleton for new portfolio layout"
```

---

### Self-Review

1. **Spec coverage:**
   - Hero section with big number: Task 3 ✓
   - Stats strip (3 cells): Task 3 ✓
   - Horizontal allocation bar + legend: Task 3 ✓
   - SVG donut chart: Task 2 + Task 3 ✓
   - Guild positions list with rank/badge/bar: Task 3 ✓
   - Guild colors from color system: Task 1 ✓
   - Click → StakingModal in withdraw mode: Task 3 (preserved from original) ✓
   - Breadcrumb navigation: Task 3 (uses existing `Breadcrumb` component) ✓
   - No insights section: Confirmed removed ✓
   - Loading skeleton: Task 4 ✓

2. **Placeholder scan:** No TBD, TODO, "similar to", or description-without-code steps found.

3. **Type consistency:**
   - `getGuildHexColor` defined in Task 1, imported in Task 3 ✓
   - `StakingDonutChart` created in Task 2, imported in Task 3 ✓
   - `DonutSegment` interface: `{ label, value, color, percentage }` — matches usage ✓
   - `GuildPosition`, `UnstakeInfo` interfaces preserved from original ✓
   - `Breadcrumb` component import matches existing `src/components/ui/breadcrumb.tsx` ✓
