"use client";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Users,
  Star,
  Activity,
  ChevronUp,
  ChevronDown,
  Filter,
  DollarSign,
  Coins,
} from "lucide-react";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";
import { expertApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { truncateAddress } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types";

interface ReputationLeaderboardProps {
  guildId?: string;
  currentExpertId?: string;
}

export function ReputationLeaderboard({
  guildId,
  currentExpertId,
}: ReputationLeaderboardProps) {
  const [viewMode, setViewMode] = useState<"global" | "guild">(
    guildId ? "guild" : "global"
  );

  const { data: leaderboard, isLoading, error, refetch } = useFetch<LeaderboardEntry[]>(
    () => {
      const params = guildId && viewMode === "guild"
        ? { guildId, limit: 50 }
        : { limit: 50 };
      return expertApi.getLeaderboard(params);
    },
  );

  // Re-fetch when viewMode changes (useFetch only auto-runs on mount)
  useEffect(() => {
    refetch();
  }, [viewMode]);

  const entries = leaderboard ?? [];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-muted-foreground" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return null;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white";
    if (rank === 2) return "bg-gradient-to-br from-slate-300 to-slate-500 text-white";
    if (rank === 3) return "bg-gradient-to-br from-amber-500 to-amber-700 text-white";
    return "bg-muted text-card-foreground";
  };

  const calculateConsensusRate = (approvals: number, rejections: number) => {
    const total = approvals + rejections;
    if (total === 0) return 0;
    // Simplified consensus rate based on participation
    return Math.round((Math.min(approvals, rejections) / total) * 100);
  };

  if (isLoading) {
    return null;
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
        <p className="text-destructive">{error}</p>
        <Button onClick={refetch} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-500" />
            Earnings Leaderboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Top performing experts ranked by total earnings
          </p>
        </div>

        {guildId && (
          <div className="flex gap-2">
            <Button
              variant={viewMode === "global" ? "primary" : "outline"}
              onClick={() => setViewMode("global")}
            >
              Global
            </Button>
            <Button
              variant={viewMode === "guild" ? "primary" : "outline"}
              onClick={() => setViewMode("guild")}
            >
              Guild Only
            </Button>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border dark:bg-card/60 dark:backdrop-blur-xl dark:border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Experts</p>
          <p className="text-2xl font-bold text-foreground">{entries.length}</p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border dark:bg-card/60 dark:backdrop-blur-xl dark:border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Avg Reviews</p>
          <p className="text-2xl font-bold text-foreground">
            {entries.length > 0
              ? Math.round(
                  entries.reduce((sum, e) => sum + e.totalReviews, 0) / entries.length
                )
              : 0}
          </p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border dark:bg-card/60 dark:backdrop-blur-xl dark:border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Coins className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Top Earnings</p>
          <p className="text-2xl font-bold text-foreground">
            ${(entries[0]?.totalEarnings || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border dark:bg-card/60 dark:backdrop-blur-xl dark:border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
          <p className="text-2xl font-bold text-foreground">
            ${entries.length > 0
              ? Math.round(
                  entries.reduce((sum, e) => sum + (e.totalEarnings || 0), 0)
                ).toLocaleString()
              : 0}
          </p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden dark:bg-card/60 dark:backdrop-blur-xl dark:border-white/[0.06] dark:shadow-lg dark:shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border dark:bg-white/[0.03]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Expert
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Earnings
                </th>
                {!guildId && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Guilds
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Reviews
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Consensus
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr
                  key={entry.expertId}
                  className={`hover:bg-muted transition-colors ${
                    entry.expertId === currentExpertId ? "bg-primary/10" : ""
                  }`}
                >
                  {/* Rank */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getRankIcon(entry.rank)}
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${getRankBadgeColor(
                          entry.rank
                        )}`}
                      >
                        {entry.rank}
                      </div>
                    </div>
                  </td>

                  {/* Expert */}
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {entry.fullName}
                        {entry.expertId === currentExpertId && (
                          <span className="px-2 py-0.5 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 text-xs font-semibold rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {truncateAddress(entry.walletAddress)}
                      </div>
                      {entry.role && (
                        <div className="text-xs text-muted-foreground capitalize mt-1">
                          {entry.role} {entry.guildName && `• ${entry.guildName}`}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Earnings */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className="text-lg font-bold text-foreground">
                        ${(entry.totalEarnings || 0).toLocaleString()}
                      </span>
                      {entry.rank <= 10 && (
                        <ChevronUp className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </td>

                  {/* Guilds (global view only) */}
                  {!guildId && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground font-medium">{entry.guildCount || 0}</span>
                      </div>
                    </td>
                  )}

                  {/* Reviews */}
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-semibold text-foreground">
                        {entry.totalReviews}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.approvals} / {entry.rejections}
                      </div>
                    </div>
                  </td>

                  {/* Consensus Rate */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-muted rounded-full h-2 max-w-[100px]">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                          style={{
                            width: `${calculateConsensusRate(entry.approvals, entry.rejections)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {calculateConsensusRate(entry.approvals, entry.rejections)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {entries.length === 0 && (
          <EmptyState
            icon={Trophy}
            title="No experts found"
            description="Check back later for leaderboard entries."
            className="py-12"
          />
        )}
      </div>
    </div>
  );
}
