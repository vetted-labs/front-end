import { Skeleton, SkeletonStatCard, SkeletonCard, SkeletonListItem } from "./skeleton";

/* ─── Shared Shells ─────────────────────────────────────── */

function Shell6xl({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">{children}</div>
    </div>
  );
}

function HeaderSkeleton({ titleW = "w-48", descW = "w-72" }: { titleW?: string; descW?: string }) {
  return (
    <div>
      <Skeleton className="w-12 h-[3px] rounded-full mb-4" />
      <Skeleton className={`h-8 ${titleW} mb-2`} />
      <Skeleton className={`h-4 ${descW}`} />
    </div>
  );
}

function TabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-2 border-b border-border pb-px">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-lg" />
      ))}
    </div>
  );
}

function StatRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

/* ─── Dashboard ─────────────────────────────────────────── */
/* max-w-7xl, header + 4 stat cards + 2-col grid + guild list + 2-col grid */

export function DashboardSkeleton() {
  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header: title + action buttons */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="hidden sm:flex gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>

        <StatRow />

        {/* Review Queue + Rank Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
          <SkeletonCard className="min-h-[240px]" />
          <SkeletonCard className="min-h-[240px]" />
        </div>

        {/* Guilds */}
        <SkeletonCard className="min-h-[160px]" />

        {/* Activity + Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
          <SkeletonCard className="min-h-[180px]" />
          <SkeletonCard className="min-h-[180px]" />
        </div>
      </div>
    </div>
  );
}

/* ─── Notifications ─────────────────────────────────────── */
/* Heading + tab pills + notification items grouped by date */

export function NotificationsSkeleton() {
  return (
    <Shell6xl>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {["w-16", "w-20", "w-20", "w-16", "w-20"].map((w, i) => (
          <Skeleton key={i} className={`h-8 ${w} rounded-full flex-shrink-0`} />
        ))}
      </div>

      {/* Date group */}
      <Skeleton className="h-4 w-16" />

      {/* Notification items */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-border/40">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </Shell6xl>
  );
}

/* ─── Applications / Reviews ────────────────────────────── */
/* Header card with stats + tab bar + filter row + card list */

export function ApplicationsSkeleton() {
  return (
    <Shell6xl>
      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-80" />
        <div className="flex gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-6 w-10" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs + filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      {/* Application cards */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonListItem key={i} />
        ))}
      </div>
    </Shell6xl>
  );
}

/* ─── Endorsements ──────────────────────────────────────── */
/* Full-width: header bar + active endorsements + available grid */

export function EndorsementsSkeleton() {
  return (
    <div className="min-h-full space-y-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>

        {/* Active endorsements row */}
        <SkeletonCard className="min-h-[100px]" />

        {/* Available grid */}
        <Skeleton className="h-5 w-48 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="min-h-[140px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── My Guilds ─────────────────────────────────────────── */
/* Header + tab bar + search + guild card grid */

export function GuildsSkeleton() {
  return (
    <Shell6xl>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <TabsSkeleton count={2} />

      {/* Search */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Guild cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="min-h-[160px]" />
        ))}
      </div>
    </Shell6xl>
  );
}

/* ─── Guild Ranks ───────────────────────────────────────── */
/* Header + 4 stats + current rank hero card + rank ladder */

export function GuildRanksSkeleton() {
  return (
    <Shell6xl>
      <HeaderSkeleton titleW="w-64" descW="w-96" />
      <StatRow />

      {/* Current rank hero */}
      <div className="rounded-xl border border-border bg-card p-8 flex items-center gap-6">
        <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-3 w-full max-w-xs rounded-full" />
        </div>
      </div>

      {/* Rank ladder */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border/40">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </Shell6xl>
  );
}

/* ─── Governance / Proposals ────────────────────────────── */
/* Large hero header + filter tabs + proposal list */

export function GovernanceSkeleton() {
  return (
    <Shell6xl>
      {/* Hero */}
      <div className="pt-6 pb-4 flex items-end justify-between">
        <div className="space-y-3">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      <TabsSkeleton count={4} />

      {/* Proposal cards */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </Shell6xl>
  );
}

/* ─── Earnings ──────────────────────────────────────────── */
/* Accent header + summary cards + chart + timeline */

export function EarningsSkeleton() {
  return (
    <Shell6xl>
      <HeaderSkeleton titleW="w-32" descW="w-80" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Chart area */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-14 rounded-full" />
            ))}
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>

      {/* Timeline items */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonListItem key={i} />
        ))}
      </div>
    </Shell6xl>
  );
}

/* ─── Reputation ────────────────────────────────────────── */
/* Score hero + breakdown cards + chart + timeline */

export function ReputationSkeleton() {
  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex gap-4">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-8 space-y-8">
        {/* Breakdown cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-border bg-card p-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Leaderboard ───────────────────────────────────────── */
/* Podium + your stats card + tabs + table rows */

export function LeaderboardSkeleton() {
  return (
    <Shell6xl>
      {/* Podium */}
      <div className="flex items-end justify-center gap-4 py-6">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-20 w-24 rounded-t-lg" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-28 w-28 rounded-t-lg" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="w-14 h-14 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-16 w-20 rounded-t-lg" />
        </div>
      </div>

      {/* Your rank card */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>

      <TabsSkeleton count={5} />

      {/* Table rows */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 px-4 rounded-lg border border-border/30">
            <Skeleton className="w-6 h-6 rounded flex-shrink-0" />
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </Shell6xl>
  );
}

/* ─── Withdrawals / Staking ─────────────────────────────── */
/* Narrower max-w-3xl, back button + header + stats + guild stake cards */

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

/* ─── Generic fallbacks (kept for backward compat) ──────── */

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Shell6xl>
      <HeaderSkeleton />
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonListItem key={i} />
        ))}
      </div>
    </Shell6xl>
  );
}

export function DetailSkeleton() {
  return (
    <Shell6xl>
      <HeaderSkeleton />
      <div className="rounded-xl border border-border bg-card p-8">
        <div className="flex items-center gap-6">
          <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>
      <SkeletonCard className="min-h-[160px]" />
      <SkeletonCard className="min-h-[160px]" />
    </Shell6xl>
  );
}

export function ProfileSkeleton() {
  return (
    <Shell6xl>
      <HeaderSkeleton />
      <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </Shell6xl>
  );
}

export function ExpertPageSkeleton() {
  return <EarningsSkeleton />;
}

export function GuildDetailSkeleton() {
  return (
    <Shell6xl>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <StatRow />
      </div>
      <TabsSkeleton count={5} />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="min-h-[120px]" />
        ))}
      </div>
    </Shell6xl>
  );
}

export function MessagesSkeleton() {
  return (
    <Shell6xl>
      <HeaderSkeleton />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border/40">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </Shell6xl>
  );
}
