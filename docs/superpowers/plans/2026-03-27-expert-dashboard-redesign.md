# Expert Dashboard Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the expert dashboard into a focused, professional command center with dark premium glass morphism styling, replacing the current cluttered layout with a clean 4-section vertical flow.

**Architecture:** The dashboard (`EnhancedExpertDashboard.tsx`) keeps its existing 3-phase data loading but gets a completely new render layer. We extract three new presentational components (ReviewQueue, RankProgress, GuildsSection) and redesign two existing ones (StatCard, ActionButtonPanel). The notification feed and inactivity banner are removed from the dashboard.

**Tech Stack:** Next.js 15, React 19, TypeScript, TailwindCSS 4, Lucide icons, existing `useFetch` hook

**Spec:** `docs/superpowers/specs/2026-03-27-expert-dashboard-redesign-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/components/dashboard/StatCard.tsx` | Redesigned stat card — glass morphism, optional warning indicator, trend subtext |
| Modify | `src/components/dashboard/ActionButtonPanel.tsx` | Slim header buttons (ghost + accent) replacing full-width gradient cards |
| Create | `src/components/dashboard/ReviewQueue.tsx` | Review queue with candidate rows, avatar initials, action buttons |
| Create | `src/components/dashboard/RankProgress.tsx` | Simplified guild rank progress bars (no criteria checklist) |
| Create | `src/components/dashboard/GuildsSection.tsx` | Top 3 guild cards + expand/collapse for remaining |
| Modify | `src/components/EnhancedExpertDashboard.tsx` | Orchestrator rewrite — new 4-section layout, remove notifications/banner |

---

## Task 1: Redesign StatCard

**Files:**
- Modify: `src/components/dashboard/StatCard.tsx`

The current StatCard has a required `icon` prop and uses the existing card theme. The redesign removes icons entirely and uses glass morphism styling with an optional amber warning dot for the reputation decay indicator.

- [ ] **Step 1: Read the current StatCard**

Read `src/components/dashboard/StatCard.tsx` to confirm the current interface matches what the plan expects.

- [ ] **Step 2: Rewrite StatCard with new interface and styling**

Replace the entire file with:

```tsx
"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextVariant?: "default" | "success" | "warning";
  warningDot?: boolean;
}

export function StatCard({
  label,
  value,
  subtext,
  subtextVariant = "default",
  warningDot = false,
}: StatCardProps) {
  const subtextColors = {
    default: "text-zinc-500",
    success: "text-emerald-400",
    warning: "text-amber-500",
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-[18px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">
          {label}
        </span>
        {warningDot && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        )}
      </div>
      <div className="text-[28px] font-bold text-zinc-50 tracking-tight mt-1.5">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {subtext && (
        <div className={`text-[11px] mt-1 ${subtextColors[subtextVariant]}`}>
          {subtext}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build 2>&1 | head -40`

Expected: Build may fail because `EnhancedExpertDashboard.tsx` still passes the old props (icon, iconBgColor, etc.). This is expected — we'll fix it in Task 6 when we rewrite the dashboard. For now, just verify the StatCard file itself has no syntax errors by checking the build output for errors in `StatCard.tsx` specifically.

If the build fails due to the dashboard passing old props, that's fine — proceed to the next task.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/StatCard.tsx
git commit -m "refactor: redesign StatCard with glass morphism and warning indicator"
```

---

## Task 2: Redesign ActionButtonPanel

**Files:**
- Modify: `src/components/dashboard/ActionButtonPanel.tsx`

Transform from full-width gradient action cards into slim inline header buttons. Keep the StakingModal integration and dynamic label logic.

- [ ] **Step 1: Read the current ActionButtonPanel**

Read `src/components/dashboard/ActionButtonPanel.tsx` to confirm the StakingModal dynamic import pattern and props interface.

- [ ] **Step 2: Rewrite ActionButtonPanel as slim header buttons**

Replace the entire file with:

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Coins, Sparkles } from "lucide-react";

const StakingModal = dynamic(
  () => import("./StakingModal").then((m) => ({ default: m.StakingModal })),
  { ssr: false }
);

interface ActionButtonPanelProps {
  stakingStatus?: {
    meetsMinimum: boolean;
    stakedAmount: string;
  };
  onRefresh?: () => void;
}

export function ActionButtonPanel({
  stakingStatus,
  onRefresh,
}: ActionButtonPanelProps) {
  const router = useRouter();
  const [showStakingModal, setShowStakingModal] = useState(false);
  const meetsMinimum = stakingStatus?.meetsMinimum ?? false;

  return (
    <>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setShowStakingModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-[9px] bg-white/[0.05] border border-white/[0.08] text-zinc-400 text-xs font-medium hover:bg-white/[0.08] hover:text-zinc-300 transition-colors"
        >
          <Coins className="w-3.5 h-3.5" />
          {meetsMinimum ? "Manage Stake" : "Stake to Start Vetting"}
          {meetsMinimum && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
          )}
        </button>
        <button
          onClick={() => router.push("/expert/endorsements")}
          className="flex items-center gap-2 px-4 py-2 rounded-[9px] bg-indigo-500/[0.12] border border-indigo-500/[0.25] text-indigo-300 text-xs font-medium hover:bg-indigo-500/[0.18] transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Start Endorsing
          {!meetsMinimum && (
            <span className="text-[10px] text-amber-400 ml-1">
              Stake Required
            </span>
          )}
        </button>
      </div>

      {showStakingModal && (
        <StakingModal
          isOpen={showStakingModal}
          onClose={() => setShowStakingModal(false)}
          onSuccess={() => {
            setShowStakingModal(false);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/ActionButtonPanel.tsx
git commit -m "refactor: redesign ActionButtonPanel as slim header buttons"
```

---

## Task 3: Create ReviewQueue Component

**Files:**
- Create: `src/components/dashboard/ReviewQueue.tsx`

New component showing assigned candidates with avatar initials, metadata, and direct "Review →" action buttons.

- [ ] **Step 1: Read the current assigned applications render logic**

Read `src/components/EnhancedExpertDashboard.tsx` lines 360-416 to understand the current rendering and routing logic for assigned applications. Also check what fields are available on the `GuildApplication` type from `@/types`.

- [ ] **Step 2: Create ReviewQueue component**

Create `src/components/dashboard/ReviewQueue.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { formatTimeAgo } from "@/lib/utils";
import type { GuildApplication } from "@/types";

interface ReviewQueueProps {
  applications: GuildApplication[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getReviewUrl(app: GuildApplication): string {
  const base = `/expert/guild/${app.guild_id}`;
  if (app.item_type === "guild_application") {
    return `${base}?tab=membershipApplications&candidateApplicationId=${app.id}`;
  }
  if (app.item_type === "expert_application") {
    return `${base}?tab=applications&applicationId=${app.id}`;
  }
  return `${base}?tab=membershipApplications&applicationId=${app.id}`;
}

export function ReviewQueue({ applications }: ReviewQueueProps) {
  const router = useRouter();
  const displayed = applications.slice(0, 5);
  const hasMore = applications.length > 5;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px] font-semibold text-zinc-200">
          Review Queue
        </span>
        {applications.length > 0 && (
          <span className="px-2.5 py-0.5 bg-amber-500/[0.12] text-amber-300 rounded-full text-[11px] font-semibold">
            {applications.length} pending
          </span>
        )}
      </div>

      {/* Candidate rows */}
      {displayed.length === 0 ? (
        <p className="text-center text-[12px] text-zinc-600 py-4">
          No pending reviews
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {displayed.map((app, index) => {
            const isFirst = index === 0;
            const name = app.candidate_name || "Application";
            return (
              <button
                key={`${app.item_type ?? "proposal"}-${app.id}`}
                onClick={() => router.push(getReviewUrl(app))}
                className={`flex items-center gap-3 p-3 rounded-[10px] text-left transition-colors ${
                  isFirst
                    ? "bg-amber-500/[0.05] border border-amber-500/[0.10] hover:bg-amber-500/[0.08]"
                    : "bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04]"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[12px] font-bold shrink-0 ${
                    isFirst
                      ? "bg-amber-500/[0.12] text-amber-400"
                      : "bg-indigo-500/[0.12] text-indigo-300"
                  }`}
                >
                  {getInitials(name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-zinc-200 truncate">
                    {name}
                  </div>
                  <div className="text-[11px] text-zinc-600 truncate">
                    {app.guild_name || "Guild"}
                    {app.created_at && ` · ${formatTimeAgo(app.created_at)}`}
                  </div>
                </div>

                {/* Action */}
                <span className="shrink-0 px-3 py-1.5 bg-white/[0.06] border border-white/[0.08] text-zinc-400 rounded-[7px] text-[11px] font-medium">
                  Review →
                </span>
              </button>
            );
          })}

          {hasMore && (
            <button
              onClick={() => router.push("/expert/applications")}
              className="text-center text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors py-2"
            >
              View all assigned →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "ReviewQueue" | head -10`

Expected: No errors (component is self-contained and not yet imported anywhere).

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/ReviewQueue.tsx
git commit -m "feat: add ReviewQueue component for dashboard redesign"
```

---

## Task 4: Create RankProgress Component

**Files:**
- Create: `src/components/dashboard/RankProgress.tsx`

Simplified version of `PromotionProgressCard` — shows guild name, rank label, and progress bar only. No criteria checklist.

- [ ] **Step 1: Read constants for rank criteria**

Read `src/config/constants.ts` lines around 204-216 to confirm GUILD_RANK_CRITERIA and GUILD_RANK_ORDER structure. Also read `src/components/expert/PromotionProgressCard.tsx` to understand the existing progress calculation logic.

- [ ] **Step 2: Create RankProgress component**

Create `src/components/dashboard/RankProgress.tsx`:

```tsx
"use client";

import { GUILD_RANK_CRITERIA, GUILD_RANK_ORDER } from "@/config/constants";
import type { ExpertGuild } from "@/types";

interface RankProgressProps {
  guilds: ExpertGuild[];
}

const RANK_LABELS: Record<string, string> = {
  recruit: "Recruit",
  apprentice: "Apprentice",
  craftsman: "Craftsman",
  officer: "Officer",
  master: "Guild Master",
};

function computeProgress(guild: ExpertGuild): number {
  const currentIndex = GUILD_RANK_ORDER.indexOf(guild.expertRole);
  if (currentIndex === -1) return 0;
  // Max rank = 100%
  if (currentIndex >= GUILD_RANK_ORDER.length - 1) return 1;

  const nextRank = GUILD_RANK_ORDER[currentIndex + 1];
  const criteria = GUILD_RANK_CRITERIA[nextRank];
  if (!criteria) return 1;

  const checks: boolean[] = [];

  // Reviews
  if (criteria.minReviews > 0) {
    const reviewCount =
      (guild.pendingProposals ?? 0) +
      (guild.ongoingProposals ?? 0) +
      (guild.closedProposals ?? 0);
    checks.push(reviewCount >= criteria.minReviews);
  }

  // Consensus — we don't have per-guild consensus on ExpertGuild,
  // so we can't check it here. Treat as not met for progress bar.
  if (criteria.minConsensus > 0) {
    checks.push(false);
  }

  // Endorsements — not available on ExpertGuild type
  if (criteria.minEndorsements > 0) {
    checks.push(false);
  }

  // Election
  if (criteria.requiresElection) {
    checks.push(false);
  }

  if (checks.length === 0) return 1;
  return checks.filter(Boolean).length / checks.length;
}

function selectTopGuilds(guilds: ExpertGuild[]): ExpertGuild[] {
  const maxRankIndex = GUILD_RANK_ORDER.length - 1;

  return [...guilds]
    .sort((a, b) => {
      const aIsMax =
        GUILD_RANK_ORDER.indexOf(a.expertRole) >= maxRankIndex ? 1 : 0;
      const bIsMax =
        GUILD_RANK_ORDER.indexOf(b.expertRole) >= maxRankIndex ? 1 : 0;

      // Non-max-rank guilds first
      if (aIsMax !== bIsMax) return aIsMax - bIsMax;

      // Then by progress descending
      const aProgress = computeProgress(a);
      const bProgress = computeProgress(b);
      if (aProgress !== bProgress) return bProgress - aProgress;

      // Then by earnings descending
      return (b.totalEarnings ?? 0) - (a.totalEarnings ?? 0);
    })
    .slice(0, 3);
}

export function RankProgress({ guilds }: RankProgressProps) {
  const topGuilds = selectTopGuilds(guilds);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-5 h-full">
      <span className="text-[13px] font-semibold text-zinc-200">
        Rank Progress
      </span>

      <div className="flex flex-col gap-3.5 mt-4">
        {topGuilds.map((guild, index) => {
          const progress = computeProgress(guild);
          const isHighlighted = index === 0;
          const isMaxRank =
            GUILD_RANK_ORDER.indexOf(guild.expertRole) >=
            GUILD_RANK_ORDER.length - 1;

          return (
            <div
              key={guild.id}
              className={`p-3 rounded-[10px] ${
                isHighlighted
                  ? "bg-indigo-500/[0.06] border border-indigo-500/[0.12]"
                  : "bg-white/[0.02] border border-white/[0.05]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[12px] font-semibold ${
                    isHighlighted ? "text-indigo-200" : "text-zinc-300"
                  }`}
                >
                  {guild.name}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wider font-semibold ${
                    isHighlighted ? "text-indigo-400" : "text-zinc-500"
                  }`}
                >
                  {RANK_LABELS[guild.expertRole] ?? guild.expertRole}
                </span>
              </div>
              <div className="w-full h-[3px] bg-white/[0.06] rounded-full">
                <div
                  className="h-[3px] rounded-full bg-gradient-to-r from-indigo-400 to-indigo-500 transition-all duration-500"
                  style={{
                    width: `${Math.round((isMaxRank ? 1 : progress) * 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/RankProgress.tsx
git commit -m "feat: add RankProgress component for dashboard redesign"
```

---

## Task 5: Create GuildsSection Component

**Files:**
- Create: `src/components/dashboard/GuildsSection.tsx`

Top 3 guild cards sorted by earnings, with expand/collapse to show all remaining guilds. Compact inline cards — no GuildCard dependency.

- [ ] **Step 1: Read existing guild card rendering in dashboard**

Read `src/components/EnhancedExpertDashboard.tsx` lines 418-458 to confirm the current guild rendering and data available. Also read the `ExpertGuild` type from `src/types/expert.ts` (or the re-exported type in `src/types/guild.ts`) to confirm available fields.

- [ ] **Step 2: Create GuildsSection component**

Create `src/components/dashboard/GuildsSection.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExpertGuild } from "@/types";

interface GuildsSectionProps {
  guilds: ExpertGuild[];
  guildStakes: Record<string, string>;
}

const RANK_LABELS: Record<string, string> = {
  recruit: "Recruit",
  apprentice: "Apprentice",
  craftsman: "Craftsman",
  officer: "Officer",
  master: "Guild Master",
};

function GuildCompactCard({
  guild,
  stakedAmount,
  onClick,
}: {
  guild: ExpertGuild;
  stakedAmount: number;
  onClick: () => void;
}) {
  const earned = guild.totalEarnings ?? 0;
  const pending =
    (guild.pendingProposals ?? 0) + (guild.pendingApplications ?? 0);

  return (
    <button
      onClick={onClick}
      className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-4 text-left hover:border-white/[0.12] hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[13px] font-semibold text-zinc-200">
            {guild.name}
          </div>
          <div className="text-[11px] text-zinc-600">
            {RANK_LABELS[guild.expertRole] ?? guild.expertRole} ·{" "}
            {guild.memberCount ?? 0} members
          </div>
        </div>
        {earned > 0 && (
          <span className="px-2 py-0.5 bg-emerald-500/[0.10] text-emerald-400 rounded-md text-[10px] font-semibold">
            ${Math.round(earned)}
          </span>
        )}
      </div>
      <div className="flex gap-4">
        <div>
          <div className="text-[16px] font-bold text-zinc-300">
            {Math.round(stakedAmount)}
          </div>
          <div className="text-[10px] text-zinc-600">Staked</div>
        </div>
        <div>
          <div className="text-[16px] font-bold text-zinc-300">{pending}</div>
          <div className="text-[10px] text-zinc-600">Pending</div>
        </div>
      </div>
    </button>
  );
}

export function GuildsSection({
  guilds,
  guildStakes,
}: GuildsSectionProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  // Sort by earnings descending
  const sorted = [...guilds].sort(
    (a, b) => (b.totalEarnings ?? 0) - (a.totalEarnings ?? 0)
  );

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const displayed = expanded ? sorted : top3;

  if (guilds.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-8 text-center">
        <p className="text-[13px] text-zinc-500">No guild memberships yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[13px] font-semibold text-zinc-200">
          Your Guilds
        </span>
        {rest.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 rounded-[7px] bg-white/[0.04] border border-white/[0.06] text-zinc-500 text-[11px] font-medium hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
          >
            {expanded ? "Show less" : `Show all ${guilds.length} →`}
          </button>
        )}
      </div>

      {/* Guild cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayed.map((guild) => {
          const staked = parseFloat(guildStakes[guild.id] || "0");
          return (
            <GuildCompactCard
              key={guild.id}
              guild={guild}
              stakedAmount={staked}
              onClick={() => router.push(`/expert/guild/${guild.id}`)}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/GuildsSection.tsx
git commit -m "feat: add GuildsSection with top-3 expand/collapse for dashboard"
```

---

## Task 6: Rewrite EnhancedExpertDashboard

**Files:**
- Modify: `src/components/EnhancedExpertDashboard.tsx`

This is the big one. Keep the existing data-fetching phases (1-3) and wallet connection logic. Replace the entire render section with the new 4-section vertical flow. Remove the notifications fetch.

- [ ] **Step 1: Read the full current file**

Read `src/components/EnhancedExpertDashboard.tsx` in full. Pay close attention to:
- Lines 1-30: imports
- Lines 31-60: hooks and state
- Lines 62-116: Phase 1 data fetch (profile + earnings) — **keep**
- Lines 118-128: Phase 2 data fetch (assigned apps) — **keep**
- Lines 130-200: Phase 3 data fetch (guild stakes) — **keep**
- Lines 200-270: derived state, loading, error handling — **keep most, adjust**
- Lines 270-467: render section — **replace entirely**

- [ ] **Step 2: Update imports**

Replace the imports section of the file. Remove unused imports, add new component imports:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "./ui/alert";
import { expertApi, guildApplicationsApi, blockchainApi } from "@/lib/api";
import { ActionButtonPanel } from "@/components/dashboard/ActionButtonPanel";
import { StatCard } from "@/components/dashboard/StatCard";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";
import { RankProgress } from "@/components/dashboard/RankProgress";
import { GuildsSection } from "@/components/dashboard/GuildsSection";
import { WalletVerificationModal } from "@/components/WalletVerificationModal";
import { useWalletVerification } from "@/lib/hooks/useWalletVerification";
import { useFetch } from "@/lib/hooks/useFetch";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { hashToBytes32 } from "@/lib/blockchain";
import { logger } from "@/lib/logger";
import {
  GUILD_RANK_ORDER,
  REPUTATION_DECAY_WARNING_DAYS,
} from "@/config/constants";
import type { ExpertProfile, ExpertGuild } from "@/types";
```

Removed imports: `Shield`, `Star`, `DollarSign`, `Coins`, `ClipboardList`, `UserCheck`, `GuildCard`, `DashboardNotificationsFeed`, `InactivityWarningBanner`, `PromotionProgressCard`, `formatVetd`.

Added imports: `ReviewQueue`, `RankProgress`, `GuildsSection`, `GUILD_RANK_ORDER`, `REPUTATION_DECAY_WARNING_DAYS`.

- [ ] **Step 3: Keep the data-fetching logic (Phases 1-3) and wallet logic unchanged**

The function body from component declaration through Phase 3 data loading, the wallet connection effect, the background stake sync, and the `useMountEffect` stay as-is. Do not modify lines from the component declaration through to the derived state computation.

- [ ] **Step 4: Update derived state section**

After the data-fetching phases and before the render return, add these derived computations (replace or augment the existing derived state block):

```tsx
  // Derived state for new dashboard layout
  const guildStakes = stakesData?.stakesMap ?? {};
  const totalStaked = stakesData?.totalStaked ?? 0;
  const stakingStatus = {
    stakedAmount: totalStaked.toString(),
    meetsMinimum: totalStaked > 0,
  };

  // Compute highest rank for header subtitle
  const highestRank = profile?.guilds?.length
    ? profile.guilds.reduce((best, g) => {
        const gIdx = GUILD_RANK_ORDER.indexOf(g.expertRole);
        const bIdx = GUILD_RANK_ORDER.indexOf(best);
        return gIdx > bIdx ? g.expertRole : best;
      }, profile.guilds[0].expertRole)
    : null;

  const rankLabels: Record<string, string> = {
    recruit: "Recruit",
    apprentice: "Apprentice",
    craftsman: "Craftsman",
    officer: "Officer",
    master: "Guild Master",
  };

  // Decay detection (same logic as InactivityWarningBanner)
  const isDecayActive = (() => {
    if (!profile?.recentActivity?.length) return true; // No activity = decay
    const timestamps = profile.recentActivity
      .map((a) => new Date(a.timestamp).getTime())
      .filter((t) => !isNaN(t));
    if (timestamps.length === 0) return true;
    const mostRecent = Math.max(...timestamps);
    const daysSince = Math.floor(
      (Date.now() - mostRecent) / (1000 * 60 * 60 * 24)
    );
    return daysSince >= REPUTATION_DECAY_WARNING_DAYS;
  })();

  // Consensus rate for Reviews stat
  const consensusRate =
    profile?.reviewCount && profile.reviewCount > 0 && profile.approvalCount != null
      ? Math.round((profile.approvalCount / profile.reviewCount) * 100)
      : null;
```

- [ ] **Step 5: Replace the render section**

Replace everything from the `return (` through the end of the component with:

```tsx
  // Loading state
  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert variant="error" title="Failed to load dashboard">
          {error}
        </Alert>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Wallet verification modal */}
      {showVerificationModal && (
        <WalletVerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
        />
      )}

      {/* Section 1: Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-600 mt-0.5">
            {highestRank ? rankLabels[highestRank] : "Expert"} ·{" "}
            {profile.guilds?.length ?? 0} guilds
          </p>
        </div>
        <ActionButtonPanel
          stakingStatus={stakingStatus}
          onRefresh={refetch}
        />
      </div>

      {/* Section 2: Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Reputation"
          value={profile.reputation ?? 0}
          warningDot={isDecayActive}
          subtext={
            isDecayActive ? "▼ -10/cycle · decay active" : undefined
          }
          subtextVariant={isDecayActive ? "warning" : "default"}
        />
        <StatCard
          label="Earnings"
          value={`$${Math.round(profile.totalEarnings ?? 0).toLocaleString()}`}
          subtext="total earned"
          subtextVariant="default"
        />
        <StatCard
          label="Staked VETD"
          value={Math.round(totalStaked).toLocaleString()}
          subtext={`across ${profile.guilds?.length ?? 0} guilds`}
        />
        <StatCard
          label="Reviews"
          value={profile.reviewCount ?? 0}
          subtext={
            consensusRate != null
              ? `${consensusRate}% consensus rate`
              : undefined
          }
        />
      </div>

      {/* Section 3: Review Queue + Rank Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
        <ReviewQueue applications={assignedApplications ?? []} />
        <RankProgress guilds={profile.guilds ?? []} />
      </div>

      {/* Section 4: Your Guilds */}
      <GuildsSection
        guilds={profile.guilds ?? []}
        guildStakes={guildStakes}
      />
    </div>
  );
```

- [ ] **Step 6: Verify the full build compiles**

Run: `npm run build 2>&1 | tail -20`

Expected: Build succeeds. If there are type errors, read the error messages and fix them. Common issues:
- `GuildApplication` type missing `item_type` field — check if it's on the type or dynamically added
- Import paths that changed

- [ ] **Step 7: Run lint**

Run: `npm run lint 2>&1 | tail -20`

Expected: No new errors. Fix any lint issues (unused imports, missing types).

- [ ] **Step 8: Commit**

```bash
git add src/components/EnhancedExpertDashboard.tsx
git commit -m "refactor: rewrite expert dashboard with new 4-section vertical flow layout"
```

---

## Task 7: Build Verification & Cleanup

**Files:**
- Any files with remaining issues from the build

- [ ] **Step 1: Full build check**

Run: `npm run build`

Expected: Clean build with no errors.

- [ ] **Step 2: Full lint check**

Run: `npm run lint`

Expected: No new errors introduced. Pre-existing warnings are OK.

- [ ] **Step 3: Visual verification checklist**

Run: `npm run dev`

Verify in browser at `http://localhost:3000/expert/dashboard` (connect wallet):
1. Header shows "Dashboard" + rank subtitle + two slim action buttons
2. Four stat cards display correctly with glass morphism styling
3. Reputation card shows amber decay indicator when applicable
4. Review Queue shows assigned candidates with initials and "Review →" buttons
5. Rank Progress shows top 3 guilds with progress bars
6. Your Guilds shows top 3 sorted by earnings with "Show all N →" button
7. Expanding guilds reveals all remaining guilds
8. No notifications section at the bottom
9. Responsive: shrinks to 2-col on tablet, stacks on mobile

- [ ] **Step 4: Clean up any unused imports or dead code**

Check if any old imports remain in `EnhancedExpertDashboard.tsx` that reference removed components. Remove them.

Check if `InactivityWarningBanner` and `DashboardNotificationsFeed` are imported anywhere else in the codebase:

```bash
grep -r "InactivityWarningBanner" src/ --include="*.tsx" --include="*.ts"
grep -r "DashboardNotificationsFeed" src/ --include="*.tsx" --include="*.ts"
```

If they're only used in the dashboard, they stay in the codebase but are now dead code. Don't delete them — the spec says they "stay in codebase (may be used elsewhere)".

- [ ] **Step 5: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: cleanup unused imports from dashboard redesign"
```
