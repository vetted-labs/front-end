"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Check, ChevronDown, Lock, Wallet } from "lucide-react";
import { expertApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge, getRankBadgeVariant } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { getRewardTierProgress } from "@/types/reputation";
import type { ExpertProfile, ExpertRole } from "@/types";

/* ─── Types ────────────────────────────────────────────────── */

type RankMetric = "reputation" | "reviewCount" | "consensusRate" | "endorsementCount";

interface RankRequirement {
  label: string;
  metric: RankMetric | null;
  target: number | null;
  format?: "percent" | "number";
}

interface RankConfig {
  level: number;
  name: string;
  role: ExpertRole;
  description: string;
  requirements: RankRequirement[];
  unlocks: string[];
}

interface ExpertStats {
  reputation: number;
  reviewCount: number;
  consensusRate: number | null;
  endorsementCount: number;
}

/* ─── Constants ────────────────────────────────────────────── */

const GUILD_RANK_CONFIGS: RankConfig[] = [
  {
    level: 1,
    name: "Recruit",
    role: "recruit",
    description: "Entry-level guild member who has passed initial vetting",
    requirements: [
      { label: "Pass guild application review", metric: null, target: null },
      { label: "Receive approval from guild members", metric: null, target: null },
      { label: "Complete profile verification", metric: null, target: null },
    ],
    unlocks: ["Reply to feed posts", "View guild discussions"],
  },
  {
    level: 2,
    name: "Apprentice",
    role: "apprentice",
    description: "Active participant building reputation through reviews",
    requirements: [
      { label: "Complete 10+ reviews", metric: "reviewCount", target: 10 },
      { label: "Maintain 70%+ consensus", metric: "consensusRate", target: 70, format: "percent" },
      { label: "Reputation score 50+", metric: "reputation", target: 50 },
    ],
    unlocks: ["Create feed posts", "Participate in discussions"],
  },
  {
    level: 3,
    name: "Craftsman",
    role: "craftsman",
    description: "Trusted reviewer eligible to endorse candidates",
    requirements: [
      { label: "Complete 50+ reviews", metric: "reviewCount", target: 50 },
      { label: "Maintain 75%+ consensus", metric: "consensusRate", target: 75, format: "percent" },
      { label: "Reputation score 150+", metric: "reputation", target: 150 },
      { label: "Endorse 5+ candidates", metric: "endorsementCount", target: 5 },
    ],
    unlocks: ["Edit others' posts", "Mark duplicates", "Endorse candidates"],
  },
  {
    level: 4,
    name: "Officer",
    role: "officer",
    description: "Senior guild member overseeing governance",
    requirements: [
      { label: "Complete 100+ reviews", metric: "reviewCount", target: 100 },
      { label: "Maintain 80%+ consensus", metric: "consensusRate", target: 80, format: "percent" },
      { label: "Reputation score 300+", metric: "reputation", target: 300 },
      { label: "Participate in guild governance", metric: null, target: null },
      { label: "Mentor 3+ lower-rank members", metric: null, target: null },
    ],
    unlocks: ["Pin/unpin posts", "Close/reopen threads", "Accept answers on behalf"],
  },
  {
    level: 5,
    name: "Guild Master",
    role: "master",
    description: "Elected leader representing the guild in platform governance",
    requirements: [
      { label: "Elected by guild members", metric: null, target: null },
      { label: "Complete 200+ reviews", metric: "reviewCount", target: 200 },
      { label: "Maintain 85%+ consensus", metric: "consensusRate", target: 85, format: "percent" },
      { label: "Reputation score 500+", metric: "reputation", target: 500 },
      { label: "Proven leadership", metric: null, target: null },
    ],
    unlocks: ["Full delete/moderation", "Full guild control"],
  },
];

const RANK_COLORS: Record<ExpertRole, { ring: string; bg: string; text: string; border: string }> = {
  recruit: {
    ring: "ring-cyan-500/30",
    bg: "bg-cyan-500",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/20 dark:border-cyan-500/30",
  },
  apprentice: {
    ring: "ring-emerald-500/30",
    bg: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20 dark:border-emerald-500/30",
  },
  craftsman: {
    ring: "ring-orange-500/30",
    bg: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/20 dark:border-orange-500/30",
  },
  officer: {
    ring: "ring-blue-500/30",
    bg: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20 dark:border-blue-500/30",
  },
  master: {
    ring: "ring-amber-500/30",
    bg: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20 dark:border-amber-500/30",
  },
};

/* ─── Utilities ────────────────────────────────────────────── */

function computeExpertStats(profile: ExpertProfile, guildReputation?: number): ExpertStats {
  return {
    reputation: guildReputation ?? profile.reputation ?? 0,
    reviewCount: (profile.approvalCount ?? 0) + (profile.rejectionCount ?? 0),
    consensusRate: null,
    endorsementCount: profile.endorsementCount ?? 0,
  };
}

function getRankIndex(role: ExpertRole): number {
  return GUILD_RANK_CONFIGS.findIndex((r) => r.role === role);
}

/* ─── RankRail ─────────────────────────────────────────────── */

function RankRail({ currentRankIndex }: { currentRankIndex: number }) {
  return (
    <Card padding="sm">
      <div className="flex items-center px-2">
        {GUILD_RANK_CONFIGS.map((rank, i) => {
          const isAchieved = i < currentRankIndex;
          const isCurrent = i === currentRankIndex;
          const colors = RANK_COLORS[rank.role];

          return (
            <div key={rank.role} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                    isAchieved && "bg-emerald-500 text-white",
                    isCurrent && cn(colors.bg, "text-white ring-4", colors.ring),
                    !isAchieved && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isAchieved ? <Check className="w-3.5 h-3.5" /> : rank.level}
                </div>
                <span className="text-[11px] font-medium text-muted-foreground hidden sm:block">
                  {rank.name}
                </span>
              </div>
              {i < GUILD_RANK_CONFIGS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px mx-2",
                    i < currentRankIndex ? "bg-emerald-500/40" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ─── CurrentRankHero ──────────────────────────────────────── */

function CurrentRankHero({ rank, stats }: { rank: RankConfig; stats: ExpertStats }) {
  const colors = RANK_COLORS[rank.role];
  const { tier, nextTier, progress } = getRewardTierProgress(stats.reputation);

  return (
    <Card className={cn("shadow-lg", colors.border)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Current Rank
          </p>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="text-2xl font-bold tracking-tight">{rank.name}</h2>
            <Badge variant={getRankBadgeVariant(rank.role)}>{rank.role}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{rank.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 shrink-0">
          {[
            { label: "Reputation", value: String(stats.reputation) },
            { label: "Reviews", value: String(stats.reviewCount) },
            { label: "Consensus", value: stats.consensusRate !== null ? `${stats.consensusRate}%` : "N/A" },
            { label: "Endorsements", value: String(stats.endorsementCount) },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-xl font-bold tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Reward Tier
            </p>
            <span className={cn("text-sm font-semibold", colors.text)}>{tier.name}</span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {tier.rewardWeight}x rewards
          </span>
        </div>
        {nextTier ? (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress to {nextTier.name}</span>
              <span className="tabular-nums">
                {stats.reputation} / {nextTier.minReputation}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/50 dark:bg-white/[0.06] overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", colors.bg)}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            Maximum tier — highest reward multiplier.
          </p>
        )}
      </div>
    </Card>
  );
}

/* ─── NextRankGoal ─────────────────────────────────────────── */

function NextRankGoal({ nextRank, stats }: { nextRank: RankConfig; stats: ExpertStats }) {
  const colors = RANK_COLORS[nextRank.role];

  const requirements = nextRank.requirements.map((req) => {
    if (!req.metric || req.target === null) {
      return { ...req, current: null as number | null, pct: 0, met: false, quantifiable: false };
    }
    const current = stats[req.metric];
    if (current === null) {
      return { ...req, current: null as number | null, pct: 0, met: false, quantifiable: true };
    }
    const met = current >= req.target;
    const pct = Math.min(Math.round((current / req.target) * 100), 100);
    return { ...req, current, pct, met, quantifiable: true };
  });

  const metCount = requirements.filter((r) => r.met).length;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Next:</p>
          <Badge variant={getRankBadgeVariant(nextRank.role)}>{nextRank.name}</Badge>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {metCount} of {requirements.length} requirements met
        </span>
      </div>

      <div className="space-y-3">
        {requirements.map((req) => (
          <div key={req.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <div className="flex items-center gap-1.5">
                {!req.quantifiable && <Lock className="w-3 h-3 text-muted-foreground/50" />}
                {req.met && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                <span className={req.met ? "text-muted-foreground line-through" : ""}>
                  {req.label}
                </span>
              </div>
              {req.quantifiable && req.target !== null && (
                <span className="text-xs text-muted-foreground tabular-nums ml-2 shrink-0">
                  {req.current !== null
                    ? req.format === "percent" ? `${req.current}%` : req.current
                    : "N/A"}{" "}
                  / {req.format === "percent" ? `${req.target}%` : req.target}
                </span>
              )}
            </div>
            {req.quantifiable && req.target !== null && (
              <div className="h-1.5 rounded-full bg-muted/50 dark:bg-white/[0.06] overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    req.met ? "bg-emerald-500" : colors.bg
                  )}
                  style={{ width: `${req.pct}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── RankDetailAccordion ──────────────────────────────────── */

function RankDetailAccordion({
  currentRankIndex,
  stats,
}: {
  currentRankIndex: number;
  stats: ExpertStats;
}) {
  const [openRank, setOpenRank] = useState<string | null>(null);

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        All Ranks
      </h3>
      <div className="space-y-1.5">
        {GUILD_RANK_CONFIGS.map((rank, i) => {
          const isAchieved = i < currentRankIndex;
          const isCurrent = i === currentRankIndex;
          const isOpen = openRank === rank.role;
          const colors = RANK_COLORS[rank.role];

          return (
            <Card key={rank.role} padding="none">
              <button
                onClick={() => setOpenRank(isOpen ? null : rank.role)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                    isAchieved && "bg-emerald-500 text-white",
                    isCurrent && cn(colors.bg, "text-white"),
                    !isAchieved && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isAchieved ? <Check className="w-3 h-3" /> : rank.level}
                </div>
                <span className="text-sm font-semibold flex-1">{rank.name}</span>
                {isCurrent && (
                  <Badge variant="default" className="text-[10px]">Current</Badge>
                )}
                {isAchieved && (
                  <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    Achieved
                  </Badge>
                )}
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-border/40">
                  <div className="grid sm:grid-cols-2 gap-6 pt-4">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                        Requirements
                      </p>
                      <ul className="space-y-1.5">
                        {rank.requirements.map((req) => {
                          let met = false;
                          if (i <= currentRankIndex) {
                            met = true;
                          } else if (req.metric && req.target !== null) {
                            const current = stats[req.metric];
                            met = current !== null && current >= req.target;
                          }

                          return (
                            <li key={req.label} className="flex items-start gap-2 text-sm">
                              {met ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                              ) : (
                                <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 mt-0.5 shrink-0 inline-block" />
                              )}
                              <span className={met ? "text-muted-foreground line-through" : ""}>
                                {req.label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                        Unlocks
                      </p>
                      <ul className="space-y-1.5">
                        {rank.unlocks.map((unlock) => (
                          <li key={unlock} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className={cn("inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", colors.bg)} />
                            {unlock}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────── */

export function GuildRanksProgression() {
  const { address } = useAccount();

  const { data: profile, isLoading, error } = useFetch<ExpertProfile>(
    () => expertApi.getProfile(address!),
    { skip: !address }
  );

  if (!address) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          icon={Wallet}
          title="Wallet not connected"
          description="Connect your wallet to view your guild rank progression."
        />
      </div>
    );
  }

  if (isLoading) return null;

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert variant="error">Failed to load rank progression data.</Alert>
      </div>
    );
  }

  const guild = profile?.guilds?.[0];
  const currentRole: ExpertRole = guild?.expertRole ?? "recruit";
  const currentRankIndex = getRankIndex(currentRole);
  const currentRank = GUILD_RANK_CONFIGS[currentRankIndex];
  const nextRank =
    currentRankIndex < GUILD_RANK_CONFIGS.length - 1
      ? GUILD_RANK_CONFIGS[currentRankIndex + 1]
      : null;

  const stats = profile
    ? computeExpertStats(profile, guild?.reputation)
    : { reputation: 0, reviewCount: 0, consensusRate: null, endorsementCount: 0 };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Guild Rank Progression</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Advance from Recruit to Guild Master by building reputation and contributing to your guild.
        </p>
      </div>

      <RankRail currentRankIndex={currentRankIndex} />
      <CurrentRankHero rank={currentRank} stats={stats} />
      {nextRank && <NextRankGoal nextRank={nextRank} stats={stats} />}
      <RankDetailAccordion currentRankIndex={currentRankIndex} stats={stats} />
    </div>
  );
}
