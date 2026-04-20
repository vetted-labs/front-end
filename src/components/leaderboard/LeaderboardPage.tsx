"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import {
  TrendingUp,
  BarChart3,
  ChevronDown,
  Calendar,
  Building2,
  Check,
} from "lucide-react";
import { VettedIcon, type VettedIconName } from "@/components/ui/vetted-icon";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { expertApi, guildsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { STAT_ICON } from "@/config/colors";
import { LeaderboardPodium } from "./LeaderboardPodium";
import { LeaderboardYourStats } from "./LeaderboardYourStats";
import { LeaderboardTable } from "./LeaderboardTable";
import { LeaderboardTrending } from "./LeaderboardTrending";
import { LeaderboardEndorsements } from "./LeaderboardEndorsements";
import { PatternBackground } from "@/components/ui/pattern-background";
import type { LeaderboardEntryV2, LeaderboardResponse, Guild } from "@/types";

/* ─── Tab & Filter Definitions ─────────────────────────────── */

const TABS = [
  { id: "overall", label: "Overall", icon: "leaderboard" as VettedIconName },
  { id: "earnings", label: "Earnings", icon: "earnings" as VettedIconName },
  { id: "reputation", label: "Reputation", icon: "reputation" as VettedIconName },
  { id: "reviews", label: "Reviews", icon: BarChart3 },
  { id: "endorsements", label: "Endorsements", icon: "endorsement" as VettedIconName },
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
  reviews: { primary: "totalReviews", secondary: "reputation" },
};

function sortEntries(entries: LeaderboardEntryV2[], tab: string): LeaderboardEntryV2[] {
  if (!Array.isArray(entries)) return [];
  const sortConfig = TAB_SORT[tab];
  if (!sortConfig) return entries;

  return [...entries].sort((a, b) => {
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
  icon: Icon,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  icon?: React.ElementType;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-medium cursor-pointer",
          "bg-card border shadow-sm",
          "",
          "transition-all duration-150",
          open
            ? "border-primary/30 ring-2 ring-primary/10 bg-card dark:bg-muted/40"
            : "border-border hover:border-primary/25 hover:bg-card dark:hover:bg-muted/30",
        )}
      >
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />}
        <span className="text-foreground">{selected?.label ?? "Select"}</span>
        <ChevronDown className={cn(
          "w-3 h-3 text-muted-foreground/50 shrink-0 transition-transform duration-150",
          open && "rotate-180",
        )} />
      </button>

      {open && (
        <div className={cn(
          "absolute top-full left-0 mt-1.5 z-50 min-w-[160px]",
          "rounded-xl border border-border shadow-xl",
          "bg-card",
          "dark:bg-[#1a1d27]/95",
          "py-1 animate-in fade-in-0 zoom-in-95",
        )}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors",
                  isSelected
                    ? "text-primary bg-primary/[0.06] font-semibold"
                    : "text-foreground hover:bg-muted/50 dark:hover:bg-muted/30",
                )}
              >
                <span className="flex-1">{opt.label}</span>
                {isSelected && <Check className="w-3 h-3 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
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
            <div className="flex-1 space-y-2">
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
  const { address } = useExpertAccount();

  const [activeTab, setActiveTab] = useState<TabId>(
    () => (searchParams.get("tab") as TabId) || "overall"
  );
  const [guildId, setGuildId] = useState(() => searchParams.get("guild") || "");
  const [period, setPeriod] = useState(() => searchParams.get("period") || "all");
  const [role, setRole] = useState(() => searchParams.get("role") || "");
  const [limit, setLimit] = useState(50);

  const fetchFn = useCallback(
    () =>
      expertApi.getLeaderboardV2(
        {
          guildId: guildId || undefined,
          period: period || undefined,
          role: role || undefined,
          limit,
        },
        address || undefined
      ),
    [guildId, period, role, address, limit]
  );

  const { data, isLoading, error, refetch } = useFetch<LeaderboardResponse>(fetchFn);

  // eslint-disable-next-line no-restricted-syntax -- refetch when filters or limit change (useFetch doesn't support custom deps)
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only refetch when filter values/limit change, not when refetch identity changes
  }, [guildId, period, role, limit]);

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
    <div className="space-y-6">
      {/* Header with pattern */}
      <div className="relative overflow-hidden rounded-xl -mx-1 px-1 pb-1">
        <PatternBackground mask="fade-bottom" intensity="medium" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[150px] rounded-full bg-primary/[0.05] blur-[80px]" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <VettedIcon name="leaderboard" className={`w-6 h-6 ${STAT_ICON.text}`} />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top performing experts ranked across multiple dimensions.
          </p>
        </div>
      </div>

      {/* Tabs + Filters */}
      <Card padding="none" className="overflow-visible">
        {/* Tabs row */}
        <div className="flex items-center gap-2 px-2 pt-2 pb-0 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {typeof tab.icon === "string" ? (
                <VettedIcon name={tab.icon} className="w-3.5 h-3.5" />
              ) : (
                <tab.icon className="w-3.5 h-3.5" />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border mx-3 mt-1.5" />

        {/* Filters row */}
        <div className="flex items-center gap-3 px-3 py-2.5 flex-wrap">
          <FilterDropdown
            icon={Building2}
            value={guildId}
            options={guildOptions}
            onChange={setGuildId}
          />
          <FilterDropdown
            icon={Calendar}
            value={period}
            options={PERIODS}
            onChange={setPeriod}
          />
          <FilterDropdown
            icon={({ className }: { className?: string }) => <VettedIcon name="guilds" className={className ?? ""} />}
            value={role}
            options={ROLES}
            onChange={setRole}
          />
          <div className="flex-1" />
          {!isLoading && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {sortedEntries.length} expert{sortedEntries.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {/* Loading skeleton */}
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

          {/* Load More */}
          {(data?.entries?.length ?? 0) >= limit && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={() => setLimit((l) => l + 50)}>
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
