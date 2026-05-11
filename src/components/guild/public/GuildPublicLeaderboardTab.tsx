"use client";

import { useState, useMemo } from "react";
import { Trophy, ChevronUp, ChevronDown, ChevronRight, Star } from "lucide-react";
import type { LeaderboardExpert } from "@/types";

type RangeFilter = "24h" | "7d" | "30d" | "all";
type MetricFilter = "rep" | "reviews" | "consensus" | "stake";

interface GuildPublicLeaderboardTabProps {
  leaderboardData: {
    topExperts: LeaderboardExpert[];
    currentUser: LeaderboardExpert | null;
  };
  /** Range tab — drives the period passed to the parent. */
  range: "all" | "month" | "week";
  onRangeChange: (range: "all" | "month" | "week") => void;
}

const RANGE_TO_PERIOD: Record<RangeFilter, "all" | "month" | "week"> = {
  "24h": "week",
  "7d": "week",
  "30d": "month",
  all: "all",
};

const PERIOD_TO_RANGE: Record<"all" | "month" | "week", RangeFilter> = {
  all: "all",
  month: "30d",
  week: "7d",
};

const METRIC_CHIPS: { value: MetricFilter; label: string }[] = [
  { value: "rep", label: "Reputation gain" },
  { value: "reviews", label: "Reviews" },
  { value: "consensus", label: "Consensus rate" },
  { value: "stake", label: "Stake" },
];

const RANGE_TABS: RangeFilter[] = ["24h", "7d", "30d", "all"];

export function GuildPublicLeaderboardTab({
  leaderboardData,
  range,
  onRangeChange,
}: GuildPublicLeaderboardTabProps) {
  const initialRange = PERIOD_TO_RANGE[range];
  const [activeRange, setActiveRange] = useState<RangeFilter>(initialRange);
  const [metric, setMetric] = useState<MetricFilter>("rep");

  const handleRangeChange = (r: RangeFilter) => {
    setActiveRange(r);
    onRangeChange(RANGE_TO_PERIOD[r]);
  };

  const sorted = useMemo(() => {
    const arr = [...leaderboardData.topExperts];
    if (metric === "reviews") arr.sort((a, b) => b.totalReviews - a.totalReviews);
    else if (metric === "consensus") arr.sort((a, b) => b.accuracy - a.accuracy);
    else if (metric === "stake") arr.sort((a, b) => b.totalEarnings - a.totalEarnings);
    else arr.sort((a, b) => b.reputation - a.reputation);
    return arr;
  }, [leaderboardData.topExperts, metric]);

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const me = leaderboardData.currentUser;

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-1 p-12 text-center">
        <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">
          No leaderboard data yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Once members start reviewing candidates, they&apos;ll appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Range + metric chips row */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="inline-flex gap-0 bg-surface-1 border border-surface-border rounded-[10px] p-[3px]">
          {RANGE_TABS.map((r) => {
            const isActive = activeRange === r;
            return (
              <button
                key={r}
                onClick={() => handleRangeChange(r)}
                className={`px-3.5 py-1.5 rounded-[7px] text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "24h" ? "24h" : r === "7d" ? "7d" : r === "30d" ? "30d" : "All-time"}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {METRIC_CHIPS.map((c) => {
            const isActive = metric === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setMetric(c.value)}
                className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
                  isActive
                    ? "bg-primary/[0.12] border-primary/35 text-primary font-semibold"
                    : "bg-surface-1 border-surface-border text-muted-foreground hover:border-surface-border-strong hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="my-3 px-3.5 py-2 bg-surface-1 border border-surface-border border-l-[3px] border-l-primary rounded-r-lg text-xs text-muted-foreground">
        Resets monthly. Top 3 earn featured placement on the guild homepage. Top 10 split a 1,000 VETD bonus pool.
      </div>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <PodiumCard rank={2} expert={top3[1]} medalClass="silver" />
          <PodiumCard rank={1} expert={top3[0]} medalClass="gold" big />
          <PodiumCard rank={3} expert={top3[2]} medalClass="bronze" />
        </div>
      )}

      {/* Header row */}
      <div className="grid grid-cols-[40px_40px_1fr_100px_100px_90px_28px] gap-3.5 px-4 py-2 text-[11px] uppercase tracking-[0.06em] font-semibold text-muted-foreground">
        <div className="text-center">#</div>
        <div />
        <div>Member</div>
        <div>Reviews</div>
        <div>Consensus</div>
        <div>Rep gain</div>
        <div />
      </div>

      {/* Rows */}
      <div className="space-y-1">
        {rest.map((expert, idx) => (
          <LbRow key={expert.id} rank={idx + 4} expert={expert} highlightYou={false} />
        ))}

        {me && me.rank > 3 && me.rank > rest.length + 3 && (
          <LbRow rank={me.rank} expert={me} highlightYou />
        )}
      </div>
    </div>
  );
}

function LbRow({
  rank,
  expert,
  highlightYou,
}: {
  rank: number;
  expert: LeaderboardExpert;
  highlightYou: boolean;
}) {
  const change = expert.rankChange ?? 0;
  return (
    <div
      className={`grid grid-cols-[40px_40px_1fr_100px_100px_90px_28px] gap-3.5 items-center px-4 py-3 rounded-[10px] border text-[13px] transition-colors ${
        highlightYou
          ? "border-primary/35 bg-gradient-to-r from-primary/[0.06] to-surface-1"
          : "border-surface-border bg-surface-1 hover:border-surface-border-strong"
      }`}
    >
      <div className="font-display text-[18px] text-foreground text-center">
        {rank}
      </div>
      <div className={`text-[11px] inline-flex items-center gap-1 ${
        change > 0 ? "text-positive" : change < 0 ? "text-negative" : "text-muted-foreground/60"
      }`}>
        {change > 0 && <ChevronUp className="w-3 h-3" />}
        {change < 0 && <ChevronDown className="w-3 h-3" />}
        {change === 0 ? "—" : Math.abs(change)}
      </div>
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-7 h-7 rounded-lg border flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
            highlightYou
              ? "bg-primary/[0.12] border-primary/35 text-primary"
              : "bg-surface-2 border-surface-border text-muted-foreground"
          }`}
        >
          {expert.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate">
            {highlightYou ? `You · ${expert.name}` : expert.name}
            {highlightYou && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/[0.12] text-primary border border-primary/35 align-middle">
                YOU
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground capitalize truncate">
            {expert.role}
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <span className="font-display text-[15px] text-foreground">
          {expert.totalReviews}
        </span>
        <span className="text-[10px] text-muted-foreground">this period</span>
      </div>
      <div className="flex flex-col">
        <span className="font-display text-[15px] text-foreground">
          {expert.accuracy}%
        </span>
        <span className="text-[10px] text-muted-foreground">
          {expert.reputationChange ? (expert.reputationChange > 0 ? "+" : "") + expert.reputationChange + " rep" : "—"}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="font-display text-[15px] text-positive">
          {(expert.reputationChange ?? expert.reputation) > 0 ? "+" : ""}
          {expert.reputationChange ?? expert.reputation}
        </span>
      </div>
      <div className="text-muted-foreground/60">
        <ChevronRight className="w-3 h-3" />
      </div>
    </div>
  );
}

function PodiumCard({
  rank,
  expert,
  medalClass,
  big,
}: {
  rank: number;
  expert?: LeaderboardExpert;
  medalClass: "gold" | "silver" | "bronze";
  big?: boolean;
}) {
  const medalColor =
    medalClass === "gold"
      ? "border-rank-master/40"
      : medalClass === "silver"
        ? "border-surface-border-strong"
        : "border-amber-700/40";
  const medalAccent =
    medalClass === "gold"
      ? "bg-rank-master"
      : medalClass === "silver"
        ? "bg-muted-foreground"
        : "bg-amber-700";
  const medalText =
    medalClass === "gold"
      ? "text-rank-master"
      : medalClass === "silver"
        ? "text-muted-foreground"
        : "text-amber-700";

  if (!expert) {
    return <div className="hidden sm:block" />;
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[14px] border bg-surface-1 px-4 py-5 text-center ${
        medalColor
      } ${big ? "" : "sm:mt-6"}`}
    >
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${medalAccent}`} />
      <div className={`font-display ${big ? "text-[36px]" : "text-[32px]"} leading-none ${medalText} mb-2`}>
        {rank}
      </div>
      <div
        className={`mx-auto ${big ? "w-20 h-20 text-[26px]" : "w-14 h-14 text-base"} rounded-[14px] bg-surface-2 border border-surface-border flex items-center justify-center font-semibold text-muted-foreground mb-2.5`}
      >
        {expert.name.slice(0, 1).toUpperCase()}
      </div>
      <div className={`font-semibold text-foreground ${big ? "text-base" : "text-sm"} mb-1`}>
        {expert.name}
      </div>
      <div className="text-[11px] text-muted-foreground capitalize mb-3">
        {expert.role}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <div className="font-display text-[17px] text-foreground inline-flex items-center justify-center gap-1">
            <Star className="w-3 h-3 text-primary fill-current" />
            {expert.reputationChange ?? expert.reputation}
          </div>
          <div className="text-[10px] text-muted-foreground">Rep gained</div>
        </div>
        <div>
          <div className="font-display text-[17px] text-foreground">
            {expert.totalReviews}
          </div>
          <div className="text-[10px] text-muted-foreground">Reviews</div>
        </div>
      </div>
    </div>
  );
}
