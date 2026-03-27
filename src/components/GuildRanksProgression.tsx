"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import {
  Check,
  ChevronDown,
  Crown,
  Lock,
  Shield,
  Star,
  Swords,
  Trophy,
  Wallet,
  Zap,
  Users,
  TrendingUp,
  Award,
  Gift,
} from "lucide-react";
import { expertApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { cn } from "@/lib/utils";
import { getRankColors, STATUS_COLORS } from "@/config/colors";
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
    description: "Elected leader representing the guild in platform governance. Only one per guild.",
    requirements: [
      { label: "Elected by guild members (1 per guild)", metric: null, target: null },
      { label: "Complete 200+ reviews", metric: "reviewCount", target: 200 },
      { label: "Maintain 85%+ consensus", metric: "consensusRate", target: 85, format: "percent" },
      { label: "Reputation score 500+", metric: "reputation", target: 500 },
      { label: "Proven leadership", metric: null, target: null },
    ],
    unlocks: [
      "Full delete/moderation",
      "Full guild control",
      "3-month term (1 quarter), re-electable once",
      "Must step down after 2 consecutive terms",
    ],
  },
];

const RANK_ICONS: Record<ExpertRole, React.ElementType> = {
  recruit: Shield,
  apprentice: Swords,
  craftsman: Trophy,
  officer: Star,
  master: Crown,
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

/* ─── StatsGrid ────────────────────────────────────────────── */

function StatsGrid({ stats }: { stats: ExpertStats }) {
  const items = [
    { label: "Reputation", value: String(stats.reputation), icon: TrendingUp, color: "text-primary" },
    { label: "Reviews", value: String(stats.reviewCount), icon: Award, color: "text-primary" },
    { label: "Consensus", value: stats.consensusRate !== null ? `${stats.consensusRate}%` : "N/A", icon: Users, color: "text-primary" },
    { label: "Endorsements", value: String(stats.endorsementCount), icon: Zap, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="rounded-2xl border border-border bg-card" padding="none">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <item.icon className={cn("w-4 h-4", item.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {item.label}
                </p>
                <p className="text-xl font-bold tabular-nums">{item.value}</p>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ─── CurrentRankHero ──────────────────────────────────────── */

function CurrentRankHero({ rank, stats }: { rank: RankConfig; stats: ExpertStats }) {
  const colors = getRankColors(rank.role);
  const Icon = RANK_ICONS[rank.role];
  const { tier, nextTier, progress } = getRewardTierProgress(stats.reputation);

  return (
    <Card className={cn("relative overflow-hidden", colors.border)} padding="none">
      {/* Subtle gradient glow behind the rank */}
      <div className={cn(
        "absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-[0.04] blur-3xl pointer-events-none",
        colors.bg,
      )} />

      <div className="relative p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Rank Icon */}
          <div className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl shrink-0",
            "shadow-lg",
            colors.bgSubtle,
            colors.glow,
          )}>
            <Icon className={cn("w-8 h-8", colors.text)} />
          </div>

          {/* Rank Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl font-bold tracking-tight">{rank.name}</h2>
              <Badge variant={getRankBadgeVariant(rank.role)}>{rank.role}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{rank.description}</p>
          </div>
        </div>

        {/* Term Rules for Guild Master */}
        {rank.role === "master" && (
          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2.5">
              Term Rules
            </p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {[
                "3-month term (1 quarter)",
                "Can be re-elected for a second consecutive term",
                "Must step down after 2 consecutive terms",
                "Eligible to run again after sitting out one term",
              ].map((rule) => (
                <div key={rule} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/40 mt-2 shrink-0" />
                  {rule}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reward Tier */}
        <div className="mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Gift className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Reward Tier
                  </span>
                  <span className={cn("text-sm font-medium", colors.text)}>{tier.name}</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {tier.rewardWeight}x rewards
                </span>
              </div>
              {nextTier ? (
                <div className="mt-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress to {nextTier.name}</span>
                    <span className="tabular-nums">
                      {stats.reputation} / {nextTier.minReputation}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/50 dark:bg-muted/40 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", colors.bg)}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Maximum tier — highest reward multiplier.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ─── NextRankGoal ─────────────────────────────────────────── */

function NextRankGoal({ nextRank, stats }: { nextRank: RankConfig; stats: ExpertStats }) {
  const colors = getRankColors(nextRank.role);
  const Icon = RANK_ICONS[nextRank.role];

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
    <Card padding="none">
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl shrink-0",
              colors.bgSubtle,
            )}>
              <Icon className={cn("w-4 h-4", colors.text)} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Next Rank
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{nextRank.name}</span>
                <Badge variant={getRankBadgeVariant(nextRank.role)} className="text-xs">
                  Level {nextRank.level}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className={cn("text-xl font-bold tabular-nums", metCount === requirements.length ? STATUS_COLORS.positive.text : "")}>
              {metCount}/{requirements.length}
            </p>
            <p className="text-xs text-muted-foreground">requirements met</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-3.5">
        {requirements.map((req) => (
          <div key={req.label}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <div className="flex items-center gap-2">
                {req.met ? (
                  <div className={cn("flex h-5 w-5 items-center justify-center rounded-full shrink-0", STATUS_COLORS.positive.bgSubtle)}>
                    <Check className={cn("w-3 h-3", STATUS_COLORS.positive.text)} />
                  </div>
                ) : !req.quantifiable ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted/50 shrink-0">
                    <Lock className="w-3 h-3 text-muted-foreground/50" />
                  </div>
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted/50 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                  </div>
                )}
                <span className={cn(
                  "text-sm",
                  req.met ? "text-muted-foreground" : "text-foreground"
                )}>
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
              <div className="ml-7 h-1.5 rounded-full bg-muted/50 dark:bg-muted/40 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    req.met ? STATUS_COLORS.positive.bg : colors.bg
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

/* ─── RankLadder ───────────────────────────────────────────── */

function RankLadder({
  currentRankIndex,
  stats,
}: {
  currentRankIndex: number;
  stats: ExpertStats;
}) {
  const [expandedRank, setExpandedRank] = useState<string | null>(null);

  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
        All Ranks
      </h3>

      <div className="relative">
        {/* Vertical timeline line */}
        <div
          className="absolute left-[23px] top-6 bottom-6 w-px bg-border/60 dark:bg-muted/40"
          aria-hidden="true"
        />
        {/* Achieved portion of the line */}
        {currentRankIndex > 0 && (
          <div
            className="absolute left-[23px] top-6 w-px bg-positive/40"
            style={{
              height: `calc(${(currentRankIndex / (GUILD_RANK_CONFIGS.length - 1)) * 100}% - 12px)`,
            }}
            aria-hidden="true"
          />
        )}

        <div className="space-y-2">
          {GUILD_RANK_CONFIGS.map((rank, i) => {
            const isAchieved = i < currentRankIndex;
            const isCurrent = i === currentRankIndex;
            const isLocked = i > currentRankIndex;
            const isExpanded = expandedRank === rank.role;
            const colors = getRankColors(rank.role);
            const Icon = RANK_ICONS[rank.role];

            return (
              <div key={rank.role} className="relative">
                <Card
                  padding="none"
                  className={cn(
                    "ml-12 transition-all",
                    isCurrent && cn(colors.border, "shadow-md", colors.glow),
                    isLocked && "opacity-70",
                  )}
                >
                  <button
                    onClick={() => setExpandedRank(isExpanded ? null : rank.role)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{rank.name}</span>
                        {isLocked && <Lock className="w-3 h-3 text-muted-foreground/40" />}
                      </div>
                      <p className="text-xs text-muted-foreground/60 mt-0.5 hidden sm:block">
                        {rank.description}
                      </p>
                    </div>
                    {isCurrent && (
                      <div className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                        colors.badge,
                      )}>
                        Current
                      </div>
                    )}
                    {isAchieved && (
                      <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border", STATUS_COLORS.positive.badge)}>
                        Achieved
                      </div>
                    )}
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-muted-foreground/40 transition-transform shrink-0",
                        isExpanded && "rotate-180",
                        "group-hover:text-muted-foreground",
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border">
                      <div className="grid sm:grid-cols-2 gap-6 pt-4">
                        {/* Requirements */}
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                            Requirements
                          </p>
                          <ul className="space-y-2">
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
                                    <div className={cn("flex h-[18px] w-[18px] items-center justify-center rounded-full mt-0.5 shrink-0", STATUS_COLORS.positive.bgSubtle)}>
                                      <Check className={cn("w-3 h-3", STATUS_COLORS.positive.text)} />
                                    </div>
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border border-muted-foreground/20 mt-0.5 shrink-0" />
                                  )}
                                  <span className={cn(
                                    "text-sm",
                                    met ? "text-muted-foreground" : "text-foreground"
                                  )}>
                                    {req.label}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        {/* Unlocks */}
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                            Unlocks
                          </p>
                          <ul className="space-y-2">
                            {rank.unlocks.map((unlock) => (
                              <li key={unlock} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className={cn(
                                  "inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                                  colors.bg
                                )} />
                                {unlock}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Timeline node */}
                <div className="absolute left-0 top-3.5 flex items-center justify-center w-[47px]">
                  <div
                    className={cn(
                      "w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all",
                      isAchieved && cn(STATUS_COLORS.positive.bgSubtle, "ring-2 ring-positive/30"),
                      isCurrent && cn(colors.bgSubtle, "ring-2", `ring-current`, colors.text, "shadow-lg", colors.glow),
                      isLocked && "bg-muted/50 dark:bg-muted/30",
                    )}
                  >
                    {isAchieved ? (
                      <Check className={cn("w-4 h-4", STATUS_COLORS.positive.text)} />
                    ) : (
                      <Icon className={cn(
                        "w-4 h-4",
                        isCurrent ? colors.text : "text-muted-foreground/40",
                      )} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Advance Your Guild Rank</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build reputation, complete reviews, and climb from Recruit to Guild Master.
        </p>
      </div>

      {/* Stats Overview */}
      <StatsGrid stats={stats} />

      {/* Current Rank Hero */}
      <CurrentRankHero rank={currentRank} stats={stats} />

      {/* Next Rank Progress */}
      {nextRank && <NextRankGoal nextRank={nextRank} stats={stats} />}

      {/* Rank Ladder */}
      <RankLadder currentRankIndex={currentRankIndex} stats={stats} />
    </div>
  );
}
