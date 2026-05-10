"use client";

import { useParams, useRouter } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { guildsApi } from "@/lib/api";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useFetch } from "@/lib/hooks/useFetch";
import { MyStatsHero } from "./stats/MyStatsHero";
import { MyStatsBody } from "./stats/MyStatsBody";
import { MyStatsSidebar } from "./stats/MyStatsSidebar";
import type {
  GuildPersonalStats,
  GuildMyStatsAverages,
  GuildRecentActivity,
  GuildMyStatsData,
} from "@/types";
import type { GuildAverages } from "@/types/api-responses";

type StatusTone = "positive" | "warning" | "negative" | "neutral" | "info" | "pending";

interface BackendAverages {
  memberCount?: number;
  avgReputation?: number;
  avgReviews?: number;
  averageReputation?: number;
  averageReviews?: number;
  averageSuccessRate?: number;
}

interface BackendActivityEntry {
  type: string;
  amount?: number;
  description?: string;
  created_at?: string;
  id?: string;
  title?: string;
  details?: string;
  timestamp?: string;
  outcome?: string;
}

function mapBackendAverages(
  raw: BackendAverages | GuildAverages,
): GuildMyStatsAverages {
  const backend = raw as BackendAverages;
  return {
    averageReputation: backend.avgReputation ?? backend.averageReputation ?? 0,
    averageReviews: backend.avgReviews ?? backend.averageReviews ?? 0,
    averageApprovalRate: 0,
    averageResponseTime: "N/A",
  };
}

function mapBackendActivity(
  entries: BackendActivityEntry[],
): GuildRecentActivity[] {
  return entries.map((entry, idx) => ({
    id: entry.id ?? String(idx),
    type: (entry.type as GuildRecentActivity["type"]) || "review_submitted",
    title: entry.title ?? entry.description ?? entry.type ?? "Activity",
    details:
      entry.details ?? (entry.amount != null ? `Amount: ${entry.amount}` : ""),
    timestamp: entry.timestamp ?? entry.created_at ?? new Date().toISOString(),
    outcome: (entry.outcome as GuildRecentActivity["outcome"]) ?? "neutral",
  }));
}

function reputationTone(reputation: number, max: number): StatusTone {
  const pct = max > 0 ? (reputation / max) * 100 : 0;
  if (pct >= 70) return "positive";
  if (pct >= 40) return "warning";
  if (reputation === 0) return "neutral";
  return "negative";
}

const MAX_REP = 2000;

export default function GuildMyStatsPage() {
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId as string;
  const auth = useAuthContext();
  const candidateId = auth.userId;

  const { data, isLoading, error } = useFetch<GuildMyStatsData>(
    async () => {
      const membership = await guildsApi.checkMembership(candidateId!, guildId);
      const stats: GuildPersonalStats = {
        memberId: candidateId!,
        fullName: "",
        email: "",
        role: (membership.role as GuildPersonalStats["role"]) || "candidate",
        reputation: 0,
        guildReputation: 0,
        joinedAt: membership.joinedAt || "",
        reviewsGiven: 0,
        reviewsReceived: 0,
        approvalRate: 0,
        rejectionRate: 0,
        averageConfidenceLevel: 0,
        endorsementsGiven: 0,
        endorsementsReceived: 0,
        applicationsReviewed: 0,
        candidatesApproved: 0,
        candidatesRejected: 0,
        jobsAppliedTo: 0,
        interviewsReceived: 0,
        offersReceived: 0,
        responseTime: "N/A",
        activityScore: 0,
        contributionScore: 0,
      };

      let guildAverages: GuildMyStatsAverages = {
        averageReputation: 0,
        averageReviews: 0,
        averageApprovalRate: 0,
        averageResponseTime: "N/A",
      };
      try {
        const raw = await guildsApi.getAverages(guildId);
        guildAverages = mapBackendAverages(raw);
      } catch {
        logger.warn("Failed to load guild averages");
      }

      let recentActivity: GuildRecentActivity[] = [];
      try {
        const raw = await guildsApi.getMemberActivity(guildId, candidateId!);
        recentActivity = mapBackendActivity(
          raw as unknown as BackendActivityEntry[],
        );
      } catch {
        logger.warn("Failed to load guild member activity");
      }

      return { stats, guildAverages, recentActivity };
    },
    {
      skip: !guildId || !candidateId,
      onError: (msg) =>
        toast.error(msg || "Failed to load your guild statistics"),
    },
  );

  if (!candidateId) {
    router.push(`/auth/login?redirect=/guilds/${guildId}/my-stats`);
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-44 bg-muted/50 animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-muted/50 animate-pulse rounded-xl" />
          <div className="h-96 bg-muted/50 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <EmptyState
          icon={BarChart3}
          title="Stats unavailable"
          description="Guild statistics will be available once more activity data is collected."
          action={{
            label: "Back to guild",
            onClick: () => router.push(`/guilds/${guildId}`),
          }}
        />
      </div>
    );
  }

  const { stats, guildAverages, recentActivity } = data;
  const isExpert = ["recruit", "craftsman", "master"].includes(stats.role);
  const guildRep = stats.guildReputation || stats.reputation;
  const tone = reputationTone(guildRep, MAX_REP);
  const hasAverages =
    guildAverages.averageReputation > 0 || guildAverages.averageReviews > 0;

  // Guild name comes through query string when navigated from the guild page;
  // fall back to a generic label otherwise.
  const guildName =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("guildName") ||
        "this guild"
      : "this guild";

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Eyebrow + display heading ── */}
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            My standing
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display mt-1.5">
            Your stats in {guildName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
            Track your reputation, contribution score, and activity inside this
            guild.
          </p>
        </div>

        <MyStatsHero
          stats={stats}
          guildAverages={guildAverages}
          guildName={guildName}
          guildRep={guildRep}
          maxRep={MAX_REP}
          hasAverages={hasAverages}
          isExpert={isExpert}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MyStatsBody
              stats={stats}
              guildAverages={guildAverages}
              recentActivity={recentActivity}
              isExpert={isExpert}
              hasAverages={hasAverages}
            />
          </div>
          <MyStatsSidebar
            stats={stats}
            guildRep={guildRep}
            maxRep={MAX_REP}
            tone={tone}
            isExpert={isExpert}
            guildId={guildId}
            onNavigate={(path) => router.push(path)}
          />
        </div>
      </div>
    </div>
  );
}
