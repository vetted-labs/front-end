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
  Trophy,
  Users,
  Activity,
  Crown,
} from "lucide-react";
import { VettedIcon, type VettedIconName } from "@/components/ui/vetted-icon";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { expertApi, guildsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GuildPill } from "@/components/ui/guild";
import { LeaderboardPodium } from "./LeaderboardPodium";
import { LeaderboardYourStats } from "./LeaderboardYourStats";
import { LeaderboardTable } from "./LeaderboardTable";
import { LeaderboardTrending } from "./LeaderboardTrending";
import { LeaderboardEndorsements } from "./LeaderboardEndorsements";
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
  { value: "", label: "All Ranks" },
  { value: "master", label: "Master" },
  { value: "officer", label: "Officer" },
  { value: "craftsman", label: "Craftsman" },
  { value: "apprentice", label: "Apprentice" },
  { value: "recruit", label: "Recruit" },
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

/* ─── Skeletons ─────────────────────────────────────────────── */

function PodiumSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card h-80 flex items-end justify-center gap-4 pb-0 overflow-hidden">
      {[2, 1, 3].map((rank) => (
        <div key={rank} className="flex flex-col items-center gap-2" style={{ order: rank === 1 ? 2 : rank === 2 ? 1 : 3 }}>
          <div className={cn("rounded-full bg-muted/50 animate-pulse", rank === 1 ? "w-20 h-20" : "w-16 h-16")} />
          <div className="w-20 h-3 rounded bg-muted/50 animate-pulse" />
          <div className="w-14 h-3 rounded bg-muted/50 animate-pulse" />
          <div className={cn("w-full rounded-t-lg bg-muted/30 animate-pulse", rank === 1 ? "h-36 w-44" : rank === 2 ? "h-24 w-36" : "h-16 w-36")} />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
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
    </div>
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
  }, [data, activeTab]);

  const currentUserRank = useMemo(() => {
    if (!data?.currentUser || !address) return 0;
    const idx = sortedEntries.findIndex(
      (e) => e.walletAddress.toLowerCase() === address.toLowerCase()
    );
    return idx >= 0 ? idx + 1 : sortedEntries.length + 1;
  }, [sortedEntries, data?.currentUser, address]);

  // ── KPI derivations from current entries ──
  const kpis = useMemo(() => {
    const entries = data?.entries ?? [];
    const totalExperts = entries.length;
    const activeRecently = entries.filter(
      (e) => Math.abs(e.reputationDelta) > 0 || (e.streak ?? 0) > 0,
    ).length;
    const avgRep = totalExperts > 0
      ? Math.round(entries.reduce((s, e) => s + (Number(e.reputation) || 0), 0) / totalExperts)
      : 0;
    let topGuild: { name: string; count: number } = { name: "—", count: 0 };
    if (guilds && guilds.length > 0) {
      // Pick guild with highest member count among guilds we know
      topGuild = guilds.reduce<{ name: string; count: number }>((best, g) => {
        const memberCount = g.memberCount ?? 0;
        return memberCount > best.count ? { name: g.name, count: memberCount } : best;
      }, { name: guilds[0]?.name ?? "—", count: 0 });
    }
    return { totalExperts, activeRecently, avgRep, topGuild };
  }, [data?.entries, guilds]);

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

  // Top 3 visible guilds for filter chip row
  const topGuildChips = useMemo(() => (guilds ?? []).slice(0, 6), [guilds]);

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Eyebrow + display heading ── */}
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Discovery
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display mt-1.5">
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
            Top performing experts ranked across reputation, earnings, reviews, and endorsements.
          </p>
        </div>

        {/* ── KPI strip ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile
            icon={<Users className="w-4 h-4" />}
            label="Total experts"
            value={kpis.totalExperts}
            tone="primary"
          />
          <KpiTile
            icon={<Activity className="w-4 h-4" />}
            label="Active this week"
            value={kpis.activeRecently}
            tone="positive"
          />
          <KpiTile
            icon={<TrendingUp className="w-4 h-4" />}
            label="Avg reputation"
            value={kpis.avgRep}
            tone="info"
          />
          <KpiTile
            icon={<Crown className="w-4 h-4" />}
            label="Top guild"
            value={kpis.topGuild.name}
            tone="warning"
          />
        </section>

        {/* ── Two-column workspace ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <Section icon={<Trophy className="w-3.5 h-3.5" />} title="Browse">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                      activeTab === tab.id
                        ? "bg-primary/[0.08] text-primary border-primary/20 shadow-sm"
                        : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/40 hover:border-border",
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

              <div className="border-t border-border mt-4 pt-4 flex items-center gap-3 flex-wrap">
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
                <div className="flex-1 min-w-0" />
                {!isLoading && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {sortedEntries.length} expert{sortedEntries.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Rank chips */}
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                {ROLES.map((r) => (
                  <button
                    key={r.value || "all"}
                    onClick={() => setRole(r.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-[0.14em] border transition-colors",
                      role === r.value
                        ? "bg-primary/[0.08] text-primary border-primary/20"
                        : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Guild chip row using GuildPill */}
              {topGuildChips.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setGuildId("")}
                    aria-pressed={!guildId}
                    className={cn(
                      "inline-flex items-center h-7 px-2.5 rounded-full text-xs font-medium border transition-colors",
                      !guildId
                        ? "bg-primary/[0.08] text-primary border-primary/20"
                        : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30",
                    )}
                  >
                    All Guilds
                  </button>
                  {topGuildChips.map((g) => (
                    <GuildPill
                      key={g.id}
                      guild={g}
                      selected={guildId === g.id}
                      onClick={() => setGuildId(g.id)}
                      size="sm"
                    />
                  ))}
                </div>
              )}
            </Section>

            {/* Error */}
            {error && <Alert variant="error">{error}</Alert>}

            {/* Skeleton */}
            {isLoading && (
              <>
                <PodiumSkeleton />
                <TableSkeleton />
              </>
            )}

            {/* Content */}
            {!isLoading && !error && (
              <>
                <Section icon={<Crown className="w-3.5 h-3.5" />} title="Podium">
                  <LeaderboardPodium
                    entries={sortedEntries}
                    activeTab={activeTab}
                    currentWalletAddress={address}
                  />
                </Section>

                {activeTab === "trending" ? (
                  <Section icon={<TrendingUp className="w-3.5 h-3.5" />} title="Trending">
                    <LeaderboardTrending
                      entries={data?.entries ?? []}
                      currentWalletAddress={address}
                    />
                  </Section>
                ) : activeTab === "endorsements" ? (
                  <Section icon={<VettedIcon name="endorsement" className="w-3.5 h-3.5" />} title="Endorsements">
                    <LeaderboardEndorsements
                      entries={data?.entries ?? []}
                      currentWalletAddress={address}
                    />
                  </Section>
                ) : (
                  <Section
                    icon={<Trophy className="w-3.5 h-3.5" />}
                    title="Full ranking"
                    meta={`${sortedEntries.length} listed`}
                  >
                    <LeaderboardTable
                      entries={sortedEntries}
                      activeTab={activeTab}
                      currentWalletAddress={address}
                    />
                  </Section>
                )}

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

          {/* ── Right sticky rail ── */}
          <aside className="lg:col-span-1 lg:sticky lg:top-6 lg:self-start space-y-4">
            {data?.currentUser && address && (
              <SidebarCard title="Your stats">
                <LeaderboardYourStats
                  currentUser={data.currentUser}
                  rank={currentUserRank}
                />
              </SidebarCard>
            )}

            <SidebarCard title="How rankings work">
              <KeyValue
                icon={<TrendingUp className="w-3.5 h-3.5" />}
                label="Reputation"
                value="From accuracy"
              />
              <KeyValue
                icon={<VettedIcon name="earnings" className="w-3.5 h-3.5" />}
                label="Earnings"
                value="Voting + endorsement"
              />
              <KeyValue
                icon={<BarChart3 className="w-3.5 h-3.5" />}
                label="Reviews"
                value="Total cast"
              />
              <KeyValue
                icon={<VettedIcon name="endorsement" className="w-3.5 h-3.5" />}
                label="Endorsements"
                value="Hires backed"
              />
            </SidebarCard>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ── Inline helpers ─────────────────────────────────────────────── */

function Section({
  icon,
  title,
  meta,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {meta && (
          <span className="text-[11px] text-muted-foreground tabular-nums">{meta}</span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function KeyValue({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-sm text-foreground font-medium leading-snug tabular-nums">{value}</p>
      </div>
    </div>
  );
}

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "positive" | "info" | "warning";
}

const KPI_TONE: Record<KpiTileProps["tone"], { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  positive: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  info: { bg: "bg-sky-500/10", text: "text-sky-500" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-500" },
};

function KpiTile({ icon, label, value, tone }: KpiTileProps) {
  const t = KPI_TONE[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
      <span
        className={cn(
          "w-9 h-9 rounded-lg grid place-items-center flex-shrink-0",
          t.bg,
          t.text,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-xl font-bold text-foreground tabular-nums leading-tight mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}
