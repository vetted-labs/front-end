"use client";

import { useState, useEffect, useMemo } from "react";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { expertApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import {
  Shield,
  Activity,
  Award,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Skeleton, SkeletonStatCard } from "@/components/ui/skeleton";
import { DataSection } from "@/lib/motion";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { useAuthContext } from "@/hooks/useAuthContext";
import { toast } from "sonner";
import { STATUS_COLORS, REWARD_TIER_COLORS, getRankColors } from "@/config/colors";
import { GUILD_RANK_ORDER } from "@/config/constants";
import { getDaysUntilDecay } from "@/lib/reputation-helpers";
import { cn } from "@/lib/utils";
import { GuildAvatar } from "@/components/ui/guild";
import {
  getRewardTierProgress,
  type ReputationTimelineEntry,
  type ReputationTimelineResponse,
  type ExpertProfile,
  type PaginationInfo,
} from "@/types";

import { RewardTierTower } from "./RewardTierTower";
import { ReputationScoreChart } from "./ReputationScoreChart";
import { HowReputationWorks } from "./HowReputationWorks";
import { ReputationTimeline } from "./ReputationTimeline";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";
import { withStoryLabReputation } from "@/components/expert/story-lab/storyLabFixtures";

type StatusTone = "positive" | "warning" | "negative" | "neutral" | "info" | "pending";

function repTone(reputation: number): StatusTone {
  if (reputation >= 70) return "positive";
  if (reputation >= 50) return "warning";
  if (reputation === 0) return "neutral";
  return "negative";
}

export default function ReputationPage() {
  const { address: wagmiAddress } = useExpertAccount();
  const auth = useAuthContext();
  const address = wagmiAddress || auth.walletAddress;
  const { isActive: isStoryLabPreview } = useStoryLabContext();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [timeline, setTimeline] = useState<ReputationTimelineEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);

  const { isLoading: loading, refetch } = useFetch(
    async () => {
      if (!address) return null;
      const [profileRes, timelineRes] = await Promise.all([
        expertApi.getProfile(address),
        expertApi.getReputationTimeline(address, { page, limit: 15 }) as Promise<ReputationTimelineResponse>,
      ]);
      return { profileRes, timelineRes };
    },
    {
      skip: !address,
      onSuccess: (result) => {
        if (!result) return;
        const rawProfile = result.profileRes;
        const tData = result.timelineRes.data ?? result.timelineRes;
        const rawTimeline = tData.items || [];
        const rawPagination = tData.pagination || null;
        if (isStoryLabPreview) {
          const injected = withStoryLabReputation(rawProfile, rawTimeline, rawPagination);
          setProfile(injected.profile);
          setTimeline(injected.timeline);
          setPagination(injected.pagination);
        } else {
          setProfile(rawProfile);
          setTimeline(rawTimeline);
          setPagination(rawPagination);
        }
      },
      onError: () => {
        toast.error("Failed to load reputation data");
      },
    }
  );

  // eslint-disable-next-line no-restricted-syntax -- triggers re-fetch on page change (useFetch doesn't support custom deps)
  useEffect(() => {
    if (address) {
      refetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch is stable, only re-run on page/address change
  }, [page, address]);

  // eslint-disable-next-line no-restricted-syntax -- subscribing to custom DOM event for cross-component state refresh
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("vetted:reputation-refresh", handler);
    return () => window.removeEventListener("vetted:reputation-refresh", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch is stable
  }, []);

  // Compute stats from timeline
  const totalGains = timeline.filter((e) => e.change_amount > 0).reduce((s, e) => s + e.change_amount, 0);
  const totalLosses = timeline.filter((e) => e.change_amount < 0).reduce((s, e) => s + e.change_amount, 0);
  const alignedCount = timeline.filter((e) => e.reason === "aligned").length;
  const deviationCount = timeline.filter((e) => e.reason?.includes("deviation")).length;

  // Per-guild breakdown derived from profile guilds + timeline activity
  const guildBreakdown = useMemo(() => {
    const guilds = profile?.guilds;
    if (!guilds) return [];
    const byGuild = new Map<string, { entries: number; delta: number }>();
    for (const e of timeline) {
      const key = e.guild_name || "Unknown";
      const cur = byGuild.get(key) ?? { entries: 0, delta: 0 };
      cur.entries += 1;
      cur.delta += e.change_amount;
      byGuild.set(key, cur);
    }
    return guilds.map((g) => {
      const stats = byGuild.get(g.name) ?? { entries: 0, delta: 0 };
      return {
        id: g.id,
        name: g.name,
        role: g.expertRole,
        delta: stats.delta,
        entries: stats.entries,
        reputation: g.reputation ?? 0,
      };
    });
  }, [profile, timeline]);

  if (!address) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <WalletRequiredState
          icon={Shield}
          message="Connect your wallet to view reputation"
        />
      </div>
    );
  }

  const reputation = profile?.reputation ?? 0;
  const daysUntilDecay = getDaysUntilDecay(profile?.recentActivity);
  const tone = repTone(reputation);
  const { tier, nextTier, progress } = getRewardTierProgress(reputation);
  const tierColors = REWARD_TIER_COLORS[tier.name] ?? REWARD_TIER_COLORS.Foundation;
  const tierLabelMap: Record<StatusTone, string> = {
    positive: "Strong",
    warning: "Stable",
    negative: "Watch",
    neutral: "Foundation",
    info: "Foundation",
    pending: "Foundation",
  };

  // Highest rank across guilds
  const primaryRank = profile?.guilds?.length
    ? profile.guilds.reduce((best, g) => {
        const gIdx = GUILD_RANK_ORDER.indexOf(g.expertRole);
        const bIdx = GUILD_RANK_ORDER.indexOf(best);
        return gIdx > bIdx ? g.expertRole : best;
      }, profile.guilds[0].expertRole)
    : null;
  const rankColors = primaryRank ? getRankColors(primaryRank) : null;
  const alignmentRate =
    alignedCount + deviationCount > 0
      ? Math.round((alignedCount / (alignedCount + deviationCount)) * 100)
      : 100;
  const reviewCount = profile?.reviewCount ?? 0;
  const endorsementCount = profile?.endorsementCount ?? 0;

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-8">
        {/* ── Eyebrow + display heading ── */}
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display mt-1.5">
            Reputation
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
            Track your standing across guilds, decay timers, and the rewards your accuracy unlocks.
          </p>
        </div>

        {/* ── Hero ring card ── */}
        <DataSection
          isLoading={loading}
          skeleton={
            <div className="bg-card rounded-xl border border-border p-6 mt-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-center">
              <Skeleton className="h-[200px] w-[200px] rounded-full mx-auto" />
              <div className="space-y-3">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => <SkeletonStatCard key={i} />)}
                </div>
              </div>
            </div>
          }
        >
          <section className="rounded-xl border border-border bg-card p-6 sm:p-8 mt-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/60" />
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-center">
              <div className="flex justify-center">
                <ScoreRing
                  reputation={reputation}
                  max={2000}
                  tone={tone}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em]",
                      tierColors.bg,
                      tierColors.border,
                      tierColors.text,
                    )}
                  >
                    <Sparkles className="w-3 h-3" />
                    {tier.name} · {tier.rewardWeight}× rewards
                  </span>
                  {rankColors && primaryRank && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em]",
                        rankColors.badge,
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", rankColors.dot)} />
                      <span className="capitalize">{primaryRank}</span>
                    </span>
                  )}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]",
                      STATUS_COLORS[tone].badge,
                    )}
                  >
                    {tierLabelMap[tone]}
                  </span>
                </div>

                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                  {reputation.toLocaleString()}
                  <span className="text-base text-muted-foreground font-medium ml-1.5">/ 2,000</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {nextTier
                    ? `${(nextTier.minReputation - reputation).toLocaleString()} pts to ${nextTier.name} tier (${nextTier.rewardWeight}×)`
                    : `You're at the top tier — ${tier.rewardWeight}× rewards across guilds.`}
                </p>

                {/* Tier progress bar */}
                <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", tierColors.bar ?? "bg-primary")}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Mini KPI tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                  <KpiTile
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Gains"
                    value={`+${totalGains}`}
                    tone="positive"
                  />
                  <KpiTile
                    icon={<Activity className="w-4 h-4" />}
                    label="Alignment"
                    value={`${alignmentRate}%`}
                    tone="primary"
                  />
                  <KpiTile
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    label="Reviews"
                    value={reviewCount}
                    tone="info"
                  />
                  <KpiTile
                    icon={<Clock className="w-4 h-4" />}
                    label={daysUntilDecay !== null && daysUntilDecay > 0 ? "Decay in" : "Decay"}
                    value={
                      daysUntilDecay !== null && daysUntilDecay > 0
                        ? `${daysUntilDecay}d`
                        : "Active"
                    }
                    tone={daysUntilDecay !== null && daysUntilDecay === 0 ? "warning" : "warning"}
                  />
                </div>

                <div
                  className={cn(
                    "mt-4 text-xs",
                    daysUntilDecay !== null && daysUntilDecay === 0
                      ? STATUS_COLORS.warning.text
                      : "text-muted-foreground",
                  )}
                >
                  {daysUntilDecay !== null && daysUntilDecay > 0
                    ? `Next decay check in ${daysUntilDecay} days — keep voting to reset the timer.`
                    : "Inactivity decay may apply — review or vote to reset the timer."}
                </div>
              </div>
            </div>
          </section>
        </DataSection>

        <div className="space-y-10 mt-10">
          {/* ── Per-guild breakdown ── */}
          <DataSection
            isLoading={loading}
            skeleton={
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <Skeleton className="h-4 w-40" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            }
          >
            <Section icon={<Shield className="w-3.5 h-3.5" />} title="Guild Standing" meta={`${guildBreakdown.length} guild${guildBreakdown.length === 1 ? "" : "s"}`}>
              {guildBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Join a guild to start building per-guild reputation.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {guildBreakdown.map((g) => {
                    const guildRank = getRankColors(g.role);
                    const isUp = g.delta >= 0;
                    return (
                      <div
                        key={g.id}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 rounded-xl border border-border bg-muted/20 hover:border-primary/30 transition-colors"
                      >
                        <GuildAvatar guild={g.name} size="md" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{g.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.14em] border",
                                guildRank.badge,
                              )}
                            >
                              <span className={cn("w-1 h-1 rounded-full", guildRank.dot)} />
                              <span className="capitalize">{g.role}</span>
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {g.reputation} pts
                            </span>
                            {g.entries > 0 && (
                              <span className="text-xs text-muted-foreground">
                                · {g.entries} recent change{g.entries === 1 ? "" : "s"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              "text-sm font-bold tabular-nums font-display flex items-center justify-end gap-1",
                              g.delta === 0
                                ? "text-muted-foreground"
                                : isUp
                                  ? STATUS_COLORS.positive.text
                                  : STATUS_COLORS.negative.text,
                            )}
                          >
                            {g.delta !== 0 &&
                              (isUp ? (
                                <TrendingUp className="w-3.5 h-3.5" />
                              ) : (
                                <TrendingDown className="w-3.5 h-3.5" />
                              ))}
                            {g.delta > 0 ? "+" : ""}
                            {g.delta}
                          </p>
                          <p className="text-[10.5px] text-muted-foreground uppercase tracking-[0.16em]">
                            recent
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </DataSection>

          {/* ── Reward Tier Tower (preserved) ── */}
          <DataSection
            isLoading={loading}
            skeleton={
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <div className="flex gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            }
          >
            <RewardTierTower reputation={reputation} />
          </DataSection>

          {/* ── Score history chart ── */}
          <DataSection
            isLoading={loading}
            skeleton={
              <div className="rounded-xl border border-border bg-card p-6">
                <Skeleton className="h-5 w-40 mb-4" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </div>
            }
          >
            <ReputationScoreChart timeline={timeline} reputation={reputation} />
          </DataSection>

          {/* ── How It Works ── */}
          <HowReputationWorks />

          {/* ── Recent Impact Timeline ── */}
          <DataSection
            isLoading={loading}
            skeleton={
              <div className="space-y-3">
                <Skeleton className="h-6 w-48 mb-2" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border/40">
                    <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-md" />
                  </div>
                ))}
              </div>
            }
          >
            <ReputationTimeline
              timeline={timeline}
              pagination={pagination}
              page={page}
              onPageChange={setPage}
            />
          </DataSection>

          {/* ── Endorsement footer hint ── */}
          {endorsementCount > 0 && (
            <div className="rounded-xl border border-border bg-muted/20 px-5 py-4 flex items-center gap-3">
              <Award className={cn("w-4 h-4", STATUS_COLORS.positive.text)} />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">
                  {endorsementCount}
                </span>{" "}
                endorsement{endorsementCount === 1 ? "" : "s"} given —{" "}
                <span className={STATUS_COLORS.positive.text}>+{totalGains}</span>{" "}
                gains,{" "}
                <span className={STATUS_COLORS.negative.text}>{totalLosses}</span>{" "}
                losses recorded across recent activity.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Inline helpers ─────────────────────────────────────────────── */

function ScoreRing({
  reputation,
  max,
  tone,
}: {
  reputation: number;
  max: number;
  tone: StatusTone;
}) {
  const size = 200;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(reputation / max, 1) * 100;
  const dashOffset = circumference - (percent / 100) * circumference;
  const toneTextClass = STATUS_COLORS[tone].text;

  return (
    <div className="relative">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={cn("transition-all duration-700", toneTextClass)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p
          className={cn(
            "text-4xl font-bold font-display tabular-nums leading-none",
            toneTextClass,
          )}
        >
          {reputation.toLocaleString()}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mt-2">
          Reputation
        </p>
        <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
          {percent.toFixed(0)}% of {max.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

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
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
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
        <p className="text-lg font-bold text-foreground tabular-nums leading-tight mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}
