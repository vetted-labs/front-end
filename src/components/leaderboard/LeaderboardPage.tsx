"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  Trophy,
  TrendingUp,
  Star,
  Coins,
  Users,
  Zap,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import { expertApi, guildsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { LeaderboardPodium } from "./LeaderboardPodium";
import { LeaderboardYourStats } from "./LeaderboardYourStats";
import { LeaderboardTable } from "./LeaderboardTable";
import { LeaderboardTrending } from "./LeaderboardTrending";
import { LeaderboardEndorsements } from "./LeaderboardEndorsements";
import type { LeaderboardEntryV2, LeaderboardResponse, Guild } from "@/types";

/* ─── Tab & Filter Definitions ─────────────────────────────── */

const TABS = [
  { id: "overall", label: "Overall", icon: Trophy },
  { id: "earnings", label: "Earnings", icon: Coins },
  { id: "reputation", label: "Reputation", icon: Star },
  { id: "reviews", label: "Reviews", icon: BarChart3 },
  { id: "consensus", label: "Consensus", icon: Users },
  { id: "endorsements", label: "Endorsements", icon: Zap },
  { id: "trending", label: "Trending", icon: TrendingUp },
] as const;

type TabId = (typeof TABS)[number]["id"];

const PERIODS = [
  { value: "all", label: "All Time" },
  { value: "month", label: "This Month" },
  { value: "week", label: "This Week" },
];

const ROLES = [
  { value: "", label: "All Roles" },
  { value: "recruit", label: "Recruit" },
  { value: "apprentice", label: "Apprentice" },
  { value: "craftsman", label: "Craftsman" },
  { value: "officer", label: "Officer" },
  { value: "master", label: "Master" },
];

/* ─── Sort Logic ───────────────────────────────────────────── */

type SortKey = keyof LeaderboardEntryV2;

const TAB_SORT: Record<string, { primary: SortKey; secondary: SortKey }> = {
  overall: { primary: "reputation", secondary: "totalEarnings" },
  earnings: { primary: "totalEarnings", secondary: "reputation" },
  reputation: { primary: "reputation", secondary: "totalReviews" },
  reviews: { primary: "totalReviews", secondary: "consensusRate" },
  consensus: { primary: "consensusRate", secondary: "totalReviews" },
};

function sortEntries(entries: LeaderboardEntryV2[], tab: string): LeaderboardEntryV2[] {
  const sortConfig = TAB_SORT[tab];
  if (!sortConfig) return entries;

  let filtered = entries;
  if (tab === "consensus") {
    filtered = entries.filter((e) => e.totalReviews >= 3);
  }

  return [...filtered].sort((a, b) => {
    const aP = Number(a[sortConfig.primary]) || 0;
    const bP = Number(b[sortConfig.primary]) || 0;
    if (bP !== aP) return bP - aP;
    const aS = Number(a[sortConfig.secondary]) || 0;
    const bS = Number(b[sortConfig.secondary]) || 0;
    return bS - aS;
  });
}

/* ─── Filter Dropdown ──────────────────────────────────────── */

function FilterDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none cursor-pointer",
          "pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium",
          "bg-card/70 border border-border/60 text-foreground",
          "dark:bg-white/[0.04] dark:border-white/[0.08]",
          "focus:outline-none focus:ring-1 focus:ring-primary/40",
          "transition-colors hover:border-primary/30",
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}

/* ─── Skeleton Loaders ─────────────────────────────────────── */

function PodiumSkeleton() {
  return (
    <Card className="h-80 flex items-end justify-center gap-4 pb-0 overflow-hidden">
      {[2, 1, 3].map((rank) => (
        <div key={rank} className="flex flex-col items-center gap-2" style={{ order: rank === 1 ? 2 : rank === 2 ? 1 : 3 }}>
          <div className={cn("rounded-full bg-muted/50 animate-pulse", rank === 1 ? "w-20 h-20" : "w-16 h-16")} />
          <div className="w-20 h-3 rounded bg-muted/50 animate-pulse" />
          <div className="w-14 h-3 rounded bg-muted/50 animate-pulse" />
          <div className={cn("w-full rounded-t-lg bg-muted/30 animate-pulse", rank === 1 ? "h-36 w-44" : rank === 2 ? "h-24 w-36" : "h-16 w-36")} />
        </div>
      ))}
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card padding="none">
      <div className="divide-y divide-border/30">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-muted/50 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="w-32 h-3 rounded bg-muted/50 animate-pulse" />
              <div className="w-20 h-2 rounded bg-muted/30 animate-pulse" />
            </div>
            <div className="w-16 h-3 rounded bg-muted/50 animate-pulse" />
            <div className="w-16 h-3 rounded bg-muted/50 animate-pulse" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── Main Component ───────────────────────────────────────── */

export default function LeaderboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address } = useAccount();

  const [activeTab, setActiveTab] = useState<TabId>(
    () => (searchParams.get("tab") as TabId) || "overall"
  );
  const [guildId, setGuildId] = useState(() => searchParams.get("guild") || "");
  const [period, setPeriod] = useState(() => searchParams.get("period") || "all");
  const [role, setRole] = useState(() => searchParams.get("role") || "");

  const fetchFn = useCallback(
    () =>
      expertApi.getLeaderboardV2(
        {
          guildId: guildId || undefined,
          period: period || undefined,
          role: role || undefined,
          limit: 50,
        },
        address || undefined
      ),
    [guildId, period, role, address]
  );

  const { data, isLoading, error, refetch } = useFetch<LeaderboardResponse>(fetchFn);

  // eslint-disable-next-line no-restricted-syntax -- refetch when filters change (useFetch doesn't support custom deps)
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only refetch when filter values change, not when refetch identity changes
  }, [guildId, period, role]);

  const { data: guilds } = useFetch<Guild[]>(() => guildsApi.getAll());

  const guildOptions = useMemo(() => {
    const opts = [{ value: "", label: "All Guilds" }];
    if (guilds) {
      for (const g of guilds) {
        opts.push({ value: g.id, label: g.name });
      }
    }
    return opts;
  }, [guilds]);

  const sortedEntries = useMemo(() => {
    if (!data?.entries) return [];
    return sortEntries(data.entries, activeTab);
  }, [data?.entries, activeTab]);

  const currentUserRank = useMemo(() => {
    if (!data?.currentUser || !address) return 0;
    const idx = sortedEntries.findIndex(
      (e) => e.walletAddress.toLowerCase() === address.toLowerCase()
    );
    return idx >= 0 ? idx + 1 : sortedEntries.length + 1;
  }, [sortedEntries, data?.currentUser, address]);

  // Sync state to URL
  // eslint-disable-next-line no-restricted-syntax -- URL sync needs to react to state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== "overall") params.set("tab", activeTab);
    if (guildId) params.set("guild", guildId);
    if (period !== "all") params.set("period", period);
    if (role) params.set("role", role);
    const qs = params.toString();
    router.replace(`/expert/leaderboard${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [activeTab, guildId, period, role, router]);

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2.5">
          <Trophy className="w-6 h-6 text-[#f59e0b]" />
          Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Top performing experts ranked across multiple dimensions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
              activeTab === tab.id
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterDropdown

          value={guildId}
          options={guildOptions}
          onChange={setGuildId}
        />
        <FilterDropdown

          value={period}
          options={PERIODS}
          onChange={setPeriod}
        />
        <FilterDropdown

          value={role}
          options={ROLES}
          onChange={setRole}
        />
        <span className="text-xs text-muted-foreground ml-1 tabular-nums">
          {sortedEntries.length} expert{sortedEntries.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {/* Loading */}
      {isLoading && (
        <>
          <PodiumSkeleton />
          <TableSkeleton />
        </>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <>
          {/* Podium */}
          <LeaderboardPodium
            entries={sortedEntries}
            activeTab={activeTab}
            currentWalletAddress={address}
          />

          {/* Your Stats */}
          <LeaderboardYourStats
            currentUser={data?.currentUser ?? null}
            rank={currentUserRank}
          />

          {/* Tab Content */}
          {activeTab === "trending" ? (
            <LeaderboardTrending
              entries={data?.entries ?? []}
              currentWalletAddress={address}
            />
          ) : activeTab === "endorsements" ? (
            <LeaderboardEndorsements
              entries={data?.entries ?? []}
              currentWalletAddress={address}
            />
          ) : (
            <LeaderboardTable
              entries={sortedEntries}
              activeTab={activeTab}
              currentWalletAddress={address}
            />
          )}
        </>
      )}
    </div>
  );
}
