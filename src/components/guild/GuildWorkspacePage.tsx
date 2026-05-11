"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings, ExternalLink, Star, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { useFetch } from "@/lib/hooks/useFetch";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";
import { fetchAndNormalizeGuildData } from "@/lib/guildDetailHelpers";
import { STORY_LAB_GUILD } from "@/components/expert/story-lab/storyLabFixtures";
import { extractApiError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { getGuildIdentity } from "@/lib/guildIdentity";
import { getGuildIconName } from "@/lib/guildHelpers";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { cn } from "@/lib/utils";
import type {
  ExpertRole,
  GuildDetailData,
  GuildWorkspaceKpis,
  GuildWorkspacePeriodStats,
  GuildWorkspaceStakePosition,
  GuildWorkspaceTab,
} from "@/types";
import { GUILD_WORKSPACE_TABS } from "@/types";
import { GuildKpiTile } from "./GuildKpiTile";
import { GuildQueueTab } from "./GuildQueueTab";
import { GuildMyReviewsTab } from "./GuildMyReviewsTab";
import { GuildGovernanceTab } from "./GuildGovernanceTab";
import { GuildInternalFeedTab } from "./GuildInternalFeedTab";
import { GuildEarningsTab } from "./GuildEarningsTab";
import { GuildMembersTab } from "./GuildMembersTab";
import { GuildLeaderboardTab } from "./GuildLeaderboardTab";

interface GuildWorkspacePageProps {
  guildId: string;
}

interface KpiBundle {
  kpis: GuildWorkspaceKpis;
  stakePosition: GuildWorkspaceStakePosition;
  periodStats: GuildWorkspacePeriodStats;
}

const TABS: Array<{
  id: GuildWorkspaceTab;
  label: string;
  countKey?: "queue" | "active" | "governance" | "feed";
  alert?: boolean;
}> = [
  { id: "queue", label: "Queue", countKey: "queue", alert: true },
  { id: "reviews", label: "My Reviews", countKey: "active" },
  { id: "governance", label: "Governance", countKey: "governance", alert: true },
  { id: "feed", label: "Internal Feed", countKey: "feed" },
  { id: "members", label: "Members" },
  { id: "earnings", label: "Earnings" },
  { id: "leaderboard", label: "Leaderboard" },
];

const ROLE_LABEL: Record<string, string> = {
  recruit: "Recruit",
  apprentice: "Apprentice",
  craftsman: "Craftsman",
  officer: "Senior",
  master: "Master",
};

/**
 * Container for the private member workspace at `/expert/guild/[id]`.
 *
 * IA differs from the public guild page (Surface 1):
 * - Slim header (no banner — they're already in the guild)
 * - 5 KPI tiles (queue / commits / stake / payouts / reputation)
 * - 7 tabs anchored on the daily review queue
 *
 * The Members + Leaderboard tabs reuse the public-mode components for now;
 * Phase 2 owns the redesigned versions and these will inherit them when
 * landed.
 */
export function GuildWorkspacePage({ guildId }: GuildWorkspacePageProps) {
  const { address, isConnected } = useExpertAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isActive: isStoryLabPreview } = useStoryLabContext();
  const isStoryLabSyntheticGuild = isStoryLabPreview && guildId === STORY_LAB_GUILD.id;
  const initialTab: GuildWorkspaceTab = (() => {
    const t = searchParams?.get("tab");
    if (t && (GUILD_WORKSPACE_TABS as readonly string[]).includes(t)) {
      return t as GuildWorkspaceTab;
    }
    return "queue";
  })();
  const [activeTab, setActiveTab] = useState<GuildWorkspaceTab>(initialTab);
  const [guild, setGuild] = useState<GuildDetailData | null>(null);
  const [kpiBundle, setKpiBundle] = useState<KpiBundle | null>(null);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"all" | "month" | "week">("all");

  const { isLoading, error } = useFetch(
    async () => {
      if (!address && !isStoryLabSyntheticGuild) throw new Error("No wallet address");
      const { guild: normalized } = await fetchAndNormalizeGuildData(
        guildId,
        address ?? "0x0000000000000000000000000000000000000000",
      );
      setGuild(normalized);
      return normalized;
    },
    {
      skip: !isStoryLabSyntheticGuild && (!isConnected || !address),
      onError: (msg) => {
        logger.warn("Workspace guild fetch failed", msg);
        toast.error(msg);
      },
    },
  );

  const handleTabChange = (next: GuildWorkspaceTab) => {
    setActiveTab(next);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tab", next);
    router.replace(`/expert/guild/${encodeURIComponent(guildId)}?${params.toString()}`);
  };

  if (!isConnected && !isStoryLabSyntheticGuild) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Alert variant="info">Connect your wallet to open your guild workspace.</Alert>
      </div>
    );
  }

  if (isLoading && !guild) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Alert variant="error">{extractApiError(error, "Failed to load guild")}</Alert>
      </div>
    );
  }

  const identity = getGuildIdentity(guild.name);
  const guildIconName = getGuildIconName(guild.name);
  const role = (guild.expertRole || "recruit").toLowerCase();
  const roleLabel = ROLE_LABEL[role] ?? guild.expertRole;

  const kpis = kpiBundle?.kpis;
  const queueCount = kpis?.queueCount ?? 0;
  const queueUrgent = kpis?.queueUrgentCount ?? 0;
  const governanceUnvoted = 0; // hydrated from governance tab; counts here are best-effort

  const tabBadgeCount = (id: GuildWorkspaceTab): number | undefined => {
    if (id === "queue") return queueCount > 0 ? queueCount : undefined;
    if (id === "reviews") return kpis?.activeCommits;
    if (id === "governance") return governanceUnvoted > 0 ? governanceUnvoted : undefined;
    if (id === "feed") return undefined;
    return undefined;
  };

  return (
    <div className="relative min-h-screen text-foreground">
      <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/expert/dashboard" },
            { label: "My Guilds", href: "/expert/guilds" },
            { label: `${identity.shortName} · Workspace` },
          ]}
        />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-5 sm:px-6 lg:px-8">
        {/* Slim header */}
        <section className="relative mb-5 flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card px-5 py-5">
          <span
            aria-hidden
            className="absolute bottom-0 left-0 top-0 w-[3px]"
            style={{ background: identity.hex }}
          />
          <div
            className={cn(
              "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border",
              identity.classes.bg,
              identity.classes.border
            )}
          >
            <VettedIcon
              name={guildIconName}
              className={cn("h-7 w-7", identity.classes.text)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2.5">
              <h1 className="font-serif text-xl leading-none text-foreground sm:text-[22px]">
                {identity.displayName} · Workspace
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em]",
                  identity.classes.bg,
                  identity.classes.border,
                  identity.classes.text,
                )}
              >
                <BadgeCheck className="h-3 w-3" />
                Member
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-warning/25 bg-warning/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-warning">
                <Star className="h-3 w-3" />
                {roleLabel}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {guild.memberCount || 0} members · {guild.openPositions || 0} open roles
              {kpis && kpis.reputation > 0 && (
                <>
                  {" · "}
                  <span>
                    you reviewed{" "}
                    <strong className="text-foreground">
                      {kpiBundle?.periodStats?.reviews ?? 0} candidates
                    </strong>{" "}
                    this period
                  </span>
                </>
              )}
              {kpiBundle?.periodStats?.consensusRate != null && (
                <>
                  {" · "}
                  <strong className="text-positive">
                    {Math.round(kpiBundle.periodStats.consensusRate)}% consensus rate
                  </strong>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Link
              href={`/guilds/${encodeURIComponent(guildId)}`}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View public page
            </Link>
            <Link
              href="/expert/profile"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground transition-colors hover:bg-muted"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Link>
          </div>
        </section>

        {/* KPI strip */}
        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <GuildKpiTile
            label="Your queue"
            value={queueCount}
            sub={
              queueUrgent > 0
                ? `${queueUrgent} due in <24h`
                : queueCount > 0
                  ? "open work"
                  : "all clear"
            }
            tone={queueUrgent > 0 ? "urgent" : "default"}
          />
          <GuildKpiTile
            label="Active commits"
            value={kpis?.activeCommits ?? 0}
            sub={
              kpis
                ? `${kpis.awaitingReveal ?? 0} awaiting reveal · ${kpis.revealOpen ?? 0} reveal open`
                : "—"
            }
          />
          <GuildKpiTile
            label="Stake locked"
            value={(kpis?.stakeLockedVetd ?? 0).toLocaleString()}
            sub={
              kpis?.stakeLockedReviewCount != null
                ? `VETD across ${kpis.stakeLockedReviewCount} reviews`
                : "VETD"
            }
          />
          <GuildKpiTile
            label="Pending payouts"
            value={`$${kpis?.pendingPayoutsUsd ?? 0}`}
            sub={
              kpis?.pendingPayoutReviewCount != null
                ? `${kpis.pendingPayoutReviewCount} reviews · paid on consensus`
                : "paid on consensus"
            }
            subTone="positive"
          />
          <GuildKpiTile
            label="Reputation"
            value={(kpis?.reputation ?? guild.reputation ?? 0).toLocaleString()}
            sub={
              kpis
                ? `${kpis.reputationDelta >= 0 ? "+" : ""}${kpis.reputationDelta} this 30d${kpis.rank ? ` · rank ${kpis.rank}${kpis.totalMembers ? ` of ${kpis.totalMembers}` : ""}` : ""}`
                : "this guild"
            }
            subTone="positive"
          />
        </div>

        {/* Tabs */}
        <div className="mb-5 flex items-center justify-between border-b border-border">
          <div className="flex flex-wrap gap-0.5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tabBadgeCount(tab.id);
              const isAlert =
                tab.alert && ((tab.id === "queue" && queueUrgent > 0) || tab.id === "governance");
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "-mb-px flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm transition-colors sm:px-4",
                    isActive
                      ? "border-primary font-semibold text-foreground"
                      : "border-transparent font-medium text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                  {count != null && count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                        isAlert
                          ? "bg-primary text-primary-foreground"
                          : isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Updated just now · auto-refresh on
          </span>
        </div>

        {/* Tab panels */}
        <div role="tabpanel">
          {activeTab === "queue" && (
            <GuildQueueTab
              guildId={guildId}
              walletAddress={address}
              onKpisLoaded={(bundle) => setKpiBundle(bundle)}
            />
          )}
          {activeTab === "reviews" && (
            <GuildMyReviewsTab guildId={guildId} walletAddress={address} />
          )}
          {activeTab === "governance" && (
            <GuildGovernanceTab guildId={guildId} walletAddress={address} />
          )}
          {activeTab === "feed" && (
            <GuildInternalFeedTab
              guildId={guildId}
              membershipRole={guild.expertRole as ExpertRole}
            />
          )}
          {activeTab === "members" && (
            <GuildMembersTab
              experts={guild.experts || []}
              candidates={guild.candidates || []}
              expertsCount={guild.experts?.length || 0}
              candidatesCount={guild.candidates?.length || guild.candidateCount || 0}
            />
          )}
          {activeTab === "earnings" && <GuildEarningsTab earnings={guild.earnings} />}
          {activeTab === "leaderboard" && (
            <GuildLeaderboardTab
              leaderboardData={{ topExperts: [], currentUser: null }}
              leaderboardPeriod={leaderboardPeriod}
              onPeriodChange={setLeaderboardPeriod}
            />
          )}
        </div>
      </div>
    </div>
  );
}
