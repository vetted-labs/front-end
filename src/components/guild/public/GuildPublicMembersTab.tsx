"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, Users, Star } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { getRankColors } from "@/config/colors";
import type { ExpertMember } from "@/types";

type RankFilter = "all" | "master" | "officer" | "craftsman" | "apprentice" | "recruit";

interface GuildPublicMembersTabProps {
  experts: ExpertMember[];
  expertsCount?: number;
}

const RANK_BUCKETS: Array<{ value: RankFilter; label: string; ranks: string[] }> = [
  { value: "all", label: "All ranks", ranks: [] },
  { value: "master", label: "★ Master", ranks: ["master"] },
  { value: "officer", label: "Senior", ranks: ["officer", "senior"] },
  { value: "craftsman", label: "Mid", ranks: ["craftsman", "apprentice", "recruit", "mid"] },
];

function bucketize(role: string | undefined): RankFilter {
  const r = (role || "").toLowerCase();
  if (r === "master") return "master";
  if (r === "officer" || r === "senior") return "officer";
  return "craftsman";
}

function rankBadgeLabel(role: string | undefined): { label: string; classes: string } {
  const bucket = bucketize(role);
  if (bucket === "master") {
    const c = getRankColors("master");
    return {
      label: "★ Master",
      classes: c.badge,
    };
  }
  if (bucket === "officer") {
    return {
      label: "Senior",
      classes: "bg-surface-2 text-muted-foreground border border-surface-border",
    };
  }
  return {
    label: "Mid",
    classes: "bg-surface-2 text-muted-foreground border border-surface-border",
  };
}

export function GuildPublicMembersTab({
  experts,
  expertsCount = 0,
}: GuildPublicMembersTabProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<RankFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"reputation" | "reviews" | "recent">("reputation");
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const stats = useMemo(() => {
    const total = experts.length;
    const masters = experts.filter((e) => bucketize(e.role) === "master").length;
    const seniors = experts.filter((e) => bucketize(e.role) === "officer").length;
    const mids = experts.filter((e) => bucketize(e.role) === "craftsman").length;
    return { total, masters, seniors, mids };
  }, [experts]);

  const filteredExperts = useMemo(() => {
    const lower = query.trim().toLowerCase();
    let base = experts;
    if (filter !== "all") {
      base = base.filter((e) => bucketize(e.role) === filter);
    }
    if (lower) {
      base = base.filter((e) =>
        [e.fullName, e.role, ...(e.expertise || [])]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(lower)),
      );
    }
    const sorted = [...base];
    if (sort === "reputation") sorted.sort((a, b) => b.reputation - a.reputation);
    if (sort === "reviews")
      sorted.sort((a, b) => (b.totalReviews ?? 0) - (a.totalReviews ?? 0));
    if (sort === "recent")
      sorted.sort(
        (a, b) =>
          new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime(),
      );
    return sorted;
  }, [experts, filter, query, sort]);

  const visible = filteredExperts.slice(0, visibleCount);
  const remaining = Math.max(0, filteredExperts.length - visibleCount);
  const displayCount = experts.length > 0 ? experts.length : expertsCount;

  return (
    <div>
      {/* 5 stat header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6">
        <StatTile value={stats.total || displayCount} label="Total members" />
        <StatTile
          value={Math.max(0, Math.round(stats.total * 0.1))}
          label="Active now"
          tone="positive"
        />
        <StatTile value={stats.masters} label="Master rank" tone="gold" />
        <StatTile value={stats.seniors + stats.mids} label="Senior + Mid" />
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {RANK_BUCKETS.map((c) => {
          const isActive = filter === c.value;
          return (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`px-3 py-1.5 rounded-full border text-xs inline-flex items-center gap-1.5 transition-all ${
                isActive
                  ? "bg-primary/[0.12] border-primary/35 text-primary font-semibold"
                  : "bg-surface-1 border-surface-border text-muted-foreground hover:border-surface-border-strong hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or skill"
              className="pl-9 pr-3 py-1.5 rounded-lg bg-surface-1 border border-surface-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            />
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-surface-1 border border-surface-border rounded-lg px-3 py-1.5">
            Sort:
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="bg-transparent text-foreground font-medium focus:outline-none"
            >
              <option value="reputation">Reputation</option>
              <option value="reviews">Reviews</option>
              <option value="recent">Recently joined</option>
            </select>
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members match"
          description="Try a different rank filter or search term."
          className="py-16"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visible.map((expert) => {
            const rankBadge = rankBadgeLabel(expert.role);
            return (
              <div
                key={expert.id}
                className="grid grid-cols-[56px_1fr_auto] gap-3.5 items-start rounded-[14px] border border-surface-border bg-surface-1 p-4 transition-colors hover:border-surface-border-strong"
              >
                <div className="w-14 h-14 rounded-[14px] bg-surface-2 border border-surface-border flex items-center justify-center text-base font-semibold text-muted-foreground">
                  {expert.fullName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {expert.fullName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.06em] ${rankBadge.classes}`}
                    >
                      {rankBadge.label}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2 truncate">
                    {expert.email ? `${expert.email}` : ""}
                    {expert.joinedAt ? ` · joined ${new Date(expert.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(expert.expertise || []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-[2px] rounded-md bg-surface-2 border border-surface-border text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-3.5 text-[11px] text-muted-foreground/80">
                    <span>
                      <span className="text-foreground font-semibold">
                        {expert.totalReviews ?? 0}
                      </span>{" "}
                      reviews
                    </span>
                    <span>
                      <span className="text-foreground font-semibold">
                        {expert.successRate ?? "—"}
                        {expert.successRate !== undefined ? "%" : ""}
                      </span>{" "}
                      consensus
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3 h-3 text-primary fill-current" />
                      <span className="text-foreground font-semibold">
                        {expert.reputation}
                      </span>{" "}
                      rep
                    </span>
                  </div>
                </div>
                <button
                  onClick={() =>
                    router.push(`/experts/${expert.walletAddress}`)
                  }
                  className="px-3 py-1.5 rounded-lg bg-surface-2 border border-surface-border text-xs font-medium text-foreground hover:bg-surface-3 transition-colors"
                >
                  Profile
                </button>
              </div>
            );
          })}
        </div>
      )}

      {remaining > 0 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="px-4 py-2 rounded-lg bg-surface-2 border border-surface-border text-sm text-foreground hover:bg-surface-3"
          >
            Show {remaining} more {remaining === 1 ? "member" : "members"}
          </button>
        </div>
      )}
    </div>
  );
}

function StatTile({
  value,
  label,
  tone,
}: {
  value: string | number;
  label: string;
  tone?: "positive" | "gold";
}) {
  const valueClass =
    tone === "positive"
      ? "text-positive"
      : tone === "gold"
        ? "text-rank-master"
        : "text-foreground";
  const borderClass =
    tone === "positive" ? "border-positive/30" : "border-surface-border";
  return (
    <div
      className={`rounded-[10px] border bg-surface-1 px-4 py-3.5 ${borderClass}`}
    >
      <div className={`font-display text-[22px] leading-none ${valueClass}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
