"use client";

import { useState, useMemo } from "react";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import {
  Check,
  Lock,
  Wallet,
  Award,
  Users,
  TrendingUp,
  Zap,
  Gift,
  Sparkles,
  Layers,
} from "lucide-react";
import { expertApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { cn } from "@/lib/utils";
import { getRankColors, STATUS_COLORS, REWARD_TIER_COLORS } from "@/config/colors";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonStatCard } from "@/components/ui/skeleton";
import { DataSection } from "@/lib/motion";
import { getRewardTierProgress } from "@/types/reputation";
import { GuildAvatar } from "@/components/ui/guild";
import type { ExpertProfile, ExpertRole } from "@/types";
import { GuildRankCard } from "./expert/ranks/GuildRankCard";
import { RankTierLadder } from "./expert/ranks/RankTierLadder";
import { GUILD_RANK_CONFIGS, RANK_ICONS, getRankIndex } from "./expert/ranks/config";
import type { ExpertStats, RankConfig } from "./expert/ranks/types";

/* ─── Utilities ────────────────────────────────────────────── */

function computeExpertStats(profile: ExpertProfile, guildReputation?: number): ExpertStats {
  const approvals = profile.approvalCount ?? 0;
  const rejections = profile.rejectionCount ?? 0;
  const total = approvals + rejections;
  const consensusRate =
    total > 0 ? Math.round((Math.max(approvals, rejections) / total) * 100) : null;

  return {
    reputation: guildReputation ?? profile.reputation ?? 0,
    reviewCount: total,
    consensusRate,
    endorsementCount: profile.endorsementCount ?? 0,
  };
}

/* ─── Next-rank goal section ───────────────────────────────── */

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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", colors.bgSubtle)}>
            <Icon className={cn("w-5 h-5", colors.text)} />
          </div>
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Next rank
            </p>
            <p className="font-display text-base font-bold">
              {nextRank.name}{" "}
              <span className="text-xs font-medium text-muted-foreground">
                · Level {nextRank.level}
              </span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "text-2xl font-bold tabular-nums font-display leading-none",
              metCount === requirements.length ? STATUS_COLORS.positive.text : "",
            )}
          >
            {metCount}
            <span className="text-base text-muted-foreground font-medium">
              /{requirements.length}
            </span>
          </p>
          <p className="text-[10.5px] text-muted-foreground uppercase tracking-[0.16em] mt-1">
            requirements met
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        {requirements.map((req) => (
          <div key={req.label}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <div className="flex items-center gap-2">
                {req.met ? (
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full shrink-0",
                      STATUS_COLORS.positive.bgSubtle,
                    )}
                  >
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
                <span
                  className={cn(
                    "text-sm",
                    req.met ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {req.label}
                </span>
              </div>
              {req.quantifiable && req.target !== null && (
                <span className="text-xs text-muted-foreground tabular-nums ml-2 shrink-0">
                  {req.current !== null
                    ? req.format === "percent"
                      ? `${req.current}%`
                      : req.current
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
                    req.met ? STATUS_COLORS.positive.bg : colors.bg,
                  )}
                  style={{ width: `${req.pct}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────── */

export function GuildRanksProgression() {
  const { address } = useExpertAccount();

  const { data: profile, isLoading, error } = useFetch<ExpertProfile>(
    () => expertApi.getProfile(address!),
    { skip: !address },
  );

  const [selectedGuildIndex, setSelectedGuildIndex] = useState(0);

  const guilds = useMemo(() => profile?.guilds || [], [profile?.guilds]);
  const clampedIndex = Math.min(selectedGuildIndex, Math.max(0, guilds.length - 1));
  const selectedGuild = guilds[clampedIndex];
  const currentRole: ExpertRole = selectedGuild?.expertRole ?? "recruit";
  const currentRankIndex = getRankIndex(currentRole);
  const currentRank = GUILD_RANK_CONFIGS[currentRankIndex];
  const nextRank =
    currentRankIndex < GUILD_RANK_CONFIGS.length - 1
      ? GUILD_RANK_CONFIGS[currentRankIndex + 1]
      : null;

  const stats = profile
    ? computeExpertStats(profile, selectedGuild?.reputation)
    : { reputation: 0, reviewCount: 0, consensusRate: null, endorsementCount: 0 };

  const defaultStats: ExpertStats = {
    reputation: 0,
    reviewCount: 0,
    consensusRate: null,
    endorsementCount: 0,
  };

  // Highest rank across guilds (for hero pill)
  const highestRole: ExpertRole = useMemo(() => {
    if (guilds.length === 0) return "recruit";
    return guilds.reduce<ExpertRole>((best, g) => {
      return getRankIndex(g.expertRole) > getRankIndex(best) ? g.expertRole : best;
    }, "recruit");
  }, [guilds]);

  const overallRankColors = getRankColors(highestRole);

  const overallReputation = profile?.reputation ?? 0;
  const { tier, nextTier, progress } = getRewardTierProgress(overallReputation);
  const tierColors = REWARD_TIER_COLORS[tier.name] ?? REWARD_TIER_COLORS.Foundation;
  const repToNextTier = nextTier
    ? Math.max(0, nextTier.minReputation - overallReputation)
    : 0;

  if (!address) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          icon={Wallet}
          title="Wallet not connected"
          description="Connect your wallet to view your guild rank progression."
        />
      </div>
    );
  }

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Hero ── */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Your progression
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display mt-1.5">
              Guild ranks
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
              Five tiers — Recruit, Apprentice, Craftsman, Officer, Master — earned
              by review accuracy, endorsements, and standing within each guild.
            </p>
          </div>

          {/* Right-aligned: overall rank pill + tier countdown */}
          {profile && guilds.length > 0 && (
            <div className="flex flex-col gap-2 lg:items-end">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em] self-start lg:self-end",
                  overallRankColors.badge,
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", overallRankColors.dot)} />
                Highest rank · {highestRole}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em] self-start lg:self-end",
                  tierColors.bg,
                  tierColors.border,
                  tierColors.text,
                )}
              >
                <Sparkles className="w-3 h-3" />
                {tier.name} · {tier.rewardWeight}× rewards
              </span>
              {nextTier && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {repToNextTier.toLocaleString()} pts to {nextTier.name}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <Alert variant="error">Failed to load rank progression data.</Alert>
        )}

        {/* ── KPI strip ── */}
        <DataSection
          isLoading={isLoading}
          skeleton={
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonStatCard key={i} />
              ))}
            </div>
          }
        >
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiTile
              icon={<TrendingUp className="w-4 h-4" />}
              label="Reputation"
              value={stats.reputation.toLocaleString()}
              tone="primary"
            />
            <KpiTile
              icon={<Award className="w-4 h-4" />}
              label="Reviews"
              value={stats.reviewCount}
              tone="info"
            />
            <KpiTile
              icon={<Users className="w-4 h-4" />}
              label="Consensus"
              value={stats.consensusRate !== null ? `${stats.consensusRate}%` : "N/A"}
              tone="positive"
            />
            <KpiTile
              icon={<Zap className="w-4 h-4" />}
              label="Endorsements"
              value={stats.endorsementCount}
              tone="warning"
            />
          </section>
        </DataSection>

        {/* ── Per-guild rank cards ── */}
        <Section
          icon={<Layers className="w-3.5 h-3.5" />}
          title="Your guilds"
          meta={guilds.length > 0 ? `${guilds.length} guild${guilds.length === 1 ? "" : "s"}` : undefined}
        >
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-[148px] rounded-xl" />
              ))}
            </div>
          ) : guilds.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No guilds joined"
              description="Apply to a guild to start building reputation and unlocking ranks."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {guilds.map((g, i) => (
                <GuildRankCard
                  key={g.id || i}
                  guild={g}
                  selected={i === clampedIndex}
                  onClick={() => setSelectedGuildIndex(i)}
                />
              ))}
            </div>
          )}
        </Section>

        {/* ── Selected guild context + Next rank goal ── */}
        {!isLoading && selectedGuild && nextRank && (
          <Section
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            title={`Next goal · ${selectedGuild.name}`}
            meta={`Level ${currentRank?.level ?? 1} → ${nextRank.level}`}
          >
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
              <GuildAvatar guild={selectedGuild.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {selectedGuild.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Currently {currentRank?.name} · {selectedGuild.reputation.toLocaleString()} pts
                </p>
              </div>
            </div>
            <NextRankGoal nextRank={nextRank} stats={stats} />
          </Section>
        )}

        {/* ── Reward tier explainer ── */}
        {!isLoading && (
          <Section
            icon={<Gift className="w-3.5 h-3.5" />}
            title="Reward tier"
            meta={`${tier.rewardWeight}× rewards`}
          >
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", tierColors.bg)}>
                <Sparkles className={cn("w-5 h-5", tierColors.text)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="font-display text-base font-bold">{tier.name}</p>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {nextTier
                      ? `${overallReputation.toLocaleString()} / ${nextTier.minReputation.toLocaleString()}`
                      : "Maximum tier"}
                  </span>
                </div>
                {nextTier ? (
                  <>
                    <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", tierColors.bar ?? "bg-primary")}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {repToNextTier.toLocaleString()} pts to {nextTier.name} ({nextTier.rewardWeight}× rewards).
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    You&apos;ve unlocked the highest reward multiplier on the platform.
                  </p>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* ── Rank ladder ── */}
        <Section icon={<Award className="w-3.5 h-3.5" />} title="Rank ladder">
          <RankTierLadder
            currentRankIndex={isLoading ? -1 : currentRankIndex}
            stats={isLoading ? defaultStats : stats}
            isLoading={isLoading}
          />
        </Section>
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
