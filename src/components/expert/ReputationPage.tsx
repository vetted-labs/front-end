"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  ChevronDown,
  Check,
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
import { getGuildIdentity } from "@/lib/guildIdentity";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import {
  getRewardTierProgress,
  type ReputationTimelineEntry,
  type ReputationTimelineResponse,
  type ReputationBreakdownEntry,
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
  const [breakdown, setBreakdown] = useState<ReputationBreakdownEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  // undefined = all guilds / global aggregate (default on first load)
  const [selectedGuildId, setSelectedGuildId] = useState<string | undefined>(undefined);

  const { isLoading: loading, refetch } = useFetch(
    async () => {
      if (!address) return null;
      const [profileRes, timelineRes, breakdownRes] = await Promise.all([
        expertApi.getProfile(address),
        expertApi.getReputationTimeline(address, {
          page,
          limit: 15,
          guildId: selectedGuildId,
        }) as Promise<ReputationTimelineResponse>,
        expertApi.getReputationBreakdown(address),
      ]);
      return { profileRes, timelineRes, breakdownRes };
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
        setBreakdown(result.breakdownRes);
      },
      onError: () => {
        toast.error("Failed to load reputation data");
      },
    }
  );

  // eslint-disable-next-line no-restricted-syntax -- triggers re-fetch on page / address / guild-scope change (useFetch doesn't support custom deps)
  useEffect(() => {
    if (address) {
      refetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch is stable, only re-run on page/address/guild change
  }, [page, address, selectedGuildId]);

  // eslint-disable-next-line no-restricted-syntax -- subscribing to custom DOM event for cross-component state refresh
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("vetted:reputation-refresh", handler);
    return () => window.removeEventListener("vetted:reputation-refresh", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch is stable
  }, []);

  // Reset to the first page whenever the guild scope changes.
  const handleGuildChange = useCallback((guildId: string | undefined) => {
    setSelectedGuildId(guildId);
    setPage(1);
  }, []);

  // Guild options for the scope selector (id + name from the expert's profile).
  const guildOptions = useMemo(
    () => (profile?.guilds ?? []).map((g) => ({ id: g.id, name: g.name })),
    [profile]
  );
  const selectedGuild = selectedGuildId
    ? guildOptions.find((g) => g.id === selectedGuildId)
    : undefined;
  const selectedBreakdown = selectedGuildId
    ? breakdown.find((b) => b.guildId === selectedGuildId)
    : undefined;

  // Compute stats from the (already guild-scoped) timeline.
  const totalGains = timeline.filter((e) => e.change_amount > 0).reduce((s, e) => s + e.change_amount, 0);
  const totalLosses = timeline.filter((e) => e.change_amount < 0).reduce((s, e) => s + e.change_amount, 0);
  const alignedCount = timeline.filter((e) => e.reason === "aligned").length;
  const deviationCount = timeline.filter((e) => e.reason?.includes("deviation")).length;

  // Per-guild breakdown sourced from the authoritative breakdown endpoint.
  // Falls back to deriving rows from the profile guilds + timeline when the
  // breakdown endpoint returns nothing (e.g. story-lab preview fixtures).
  // When a guild is scoped, narrow the list to just that guild.
  const guildBreakdown = useMemo(() => {
    if (breakdown.length > 0) {
      const rows = selectedGuildId
        ? breakdown.filter((b) => b.guildId === selectedGuildId)
        : breakdown;
      return rows.map((b) => ({
        id: b.guildId,
        name: b.guildName,
        role: b.role,
        delta: b.totalGains + b.totalLosses,
        entries: b.totalEvents,
        reputation: b.reputation,
      }));
    }

    // Fallback: derive from profile guilds + timeline activity.
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
    return guilds
      .filter((g) => !selectedGuildId || g.id === selectedGuildId)
      .map((g) => {
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
  }, [breakdown, profile, timeline, selectedGuildId]);

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

  // Scope the reputation score: a selected guild uses its per-guild reputation,
  // otherwise we show the global aggregate from the profile.
  const reputation = selectedGuildId
    ? selectedBreakdown?.reputation ??
      profile?.guilds?.find((g) => g.id === selectedGuildId)?.reputation ??
      0
    : profile?.reputation ?? 0;
  const daysUntilDecay = getDaysUntilDecay(profile?.recentActivity);
  const tone = repTone(reputation);
  const { tier, nextTier, progress } = getRewardTierProgress(reputation);
  const tierColors = REWARD_TIER_COLORS[tier.name] ?? REWARD_TIER_COLORS.Foundation;

  // Rank shown next to the tier chip: scoped guild's role, else highest across guilds.
  const primaryRank = selectedGuildId
    ? selectedBreakdown?.role ??
      profile?.guilds?.find((g) => g.id === selectedGuildId)?.expertRole ??
      null
    : profile?.guilds?.length
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
        {/* ── Heading + guild scope selector ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display">
            Reputation
          </h1>
          {guildOptions.length > 0 && (
            <ReputationGuildSwitcher
              guilds={guildOptions}
              value={selectedGuildId}
              onChange={handleGuildChange}
            />
          )}
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
                    {tier.rewardWeight}× rewards
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
                  {selectedGuild && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      <Shield className="w-3 h-3" />
                      {getGuildIdentity(selectedGuild.name).shortName}
                    </span>
                  )}
                </div>

                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                  {reputation.toLocaleString()}
                  <span className="text-base text-muted-foreground font-medium ml-1.5">/ 2,000</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {nextTier
                    ? `${(nextTier.minReputation - reputation).toLocaleString()} pts to ${nextTier.minReputation.toLocaleString()} (${nextTier.rewardWeight}×)`
                    : `You're at the top tier — ${tier.rewardWeight}× rewards.`}
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

interface ReputationGuildSwitcherProps {
  guilds: Array<{ id: string; name: string }>;
  value: string | undefined;
  onChange: (guildId: string | undefined) => void;
}

/**
 * Guild scope selector for the Reputation page. Mirrors the
 * MarketplaceGuildSwitcher visual pattern but adds an "All guilds" option so
 * the page can default to the global / aggregate view.
 */
function ReputationGuildSwitcher({ guilds, value, onChange }: ReputationGuildSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);

  const selectedGuild = guilds.find((g) => g.id === value);
  const selectedIdentity = selectedGuild ? getGuildIdentity(selectedGuild.name) : null;

  const handleSelect = (id: string | undefined) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "group flex items-center gap-2.5 cursor-pointer pl-1.5 pr-3 py-1.5",
          "rounded-xl border bg-card/40 backdrop-blur-md text-left",
          "transition-all duration-200",
          "hover:bg-card/60",
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
          "dark:bg-white/[0.04] dark:hover:bg-white/[0.07]",
          open
            ? "border-primary/45 ring-2 ring-primary/15"
            : "border-border/60 hover:border-primary/40 dark:border-white/[0.08]"
        )}
      >
        <span
          className={cn(
            "relative flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0",
            "bg-gradient-to-br from-primary/25 via-primary/12 to-primary/5",
            "ring-1 ring-primary/30",
            "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
          )}
        >
          <VettedIcon
            name={selectedIdentity?.iconName ?? "guilds"}
            className={cn("h-4 w-4", selectedIdentity ? "text-primary" : "text-primary/70")}
          />
        </span>

        <span className="flex flex-col items-start leading-none">
          <span className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground/70 uppercase">
            Scope
          </span>
          <span className="mt-0.5 text-sm font-semibold text-foreground tracking-tight">
            {selectedIdentity?.shortName ?? "All guilds"}
          </span>
        </span>

        <ChevronDown
          className={cn(
            "ml-1 h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-primary"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute right-0 top-full mt-2 z-50 w-[20rem] overflow-hidden",
            "rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl",
            "shadow-2xl shadow-black/30",
            "dark:bg-card/85 dark:border-white/[0.08]",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
          )}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/40 dark:border-white/[0.06]">
            <span className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Reputation scope
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/70">
              {guilds.length} {guilds.length === 1 ? "guild" : "guilds"}
            </span>
          </div>

          <div className="p-1.5 max-h-80 overflow-y-auto">
            {/* All guilds (global aggregate) */}
            <GuildScopeOption
              iconName="guilds"
              primary="All guilds"
              secondary="Global aggregate"
              isSelected={value === undefined}
              onSelect={() => handleSelect(undefined)}
            />
            {guilds.map((guild) => {
              const identity = getGuildIdentity(guild.name);
              return (
                <GuildScopeOption
                  key={guild.id}
                  iconName={identity.iconName}
                  primary={identity.shortName}
                  secondary={identity.displayName}
                  isSelected={value === guild.id}
                  onSelect={() => handleSelect(guild.id)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface GuildScopeOptionProps {
  iconName: React.ComponentProps<typeof VettedIcon>["name"];
  primary: string;
  secondary: string;
  isSelected: boolean;
  onSelect: () => void;
}

function GuildScopeOption({
  iconName,
  primary,
  secondary,
  isSelected,
  onSelect,
}: GuildScopeOptionProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onSelect}
      className={cn(
        "group w-full text-left px-2.5 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-150",
        isSelected
          ? "bg-primary/[0.08] dark:bg-primary/[0.10]"
          : "hover:bg-muted/50 dark:hover:bg-white/[0.04]"
      )}
    >
      <span
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 transition-all duration-150",
          isSelected
            ? "bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5 ring-2 ring-primary/45"
            : "bg-gradient-to-br from-primary/15 via-primary/8 to-primary/3 ring-1 ring-border/60 group-hover:ring-primary/35 dark:ring-white/[0.08]"
        )}
      >
        <VettedIcon
          name={iconName}
          className={cn(
            "h-5 w-5 transition-colors",
            isSelected ? "text-primary" : "text-primary/70 group-hover:text-primary"
          )}
        />
      </span>

      <span className="flex-1 min-w-0 flex flex-col">
        <span
          className={cn(
            "text-sm font-semibold leading-tight truncate transition-colors",
            isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
          )}
        >
          {primary}
        </span>
        <span className="mt-0.5 text-[11px] text-muted-foreground/80 truncate">
          {secondary}
        </span>
      </span>

      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0 transition-all",
          isSelected
            ? "bg-primary/15 ring-1 ring-primary/40 opacity-100 scale-100"
            : "opacity-0 scale-75"
        )}
      >
        <Check className="h-3 w-3 text-primary" strokeWidth={3} />
      </span>
    </button>
  );
}

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
