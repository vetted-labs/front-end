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
  Loader2,
  DollarSign,
  Coins,
} from "lucide-react";
import { Button } from "./ui/button";
import { expertApi } from "@/lib/api";

interface LeaderboardEntry {
  rank: number;
  expertId: string;
  fullName: string;
  walletAddress: string;
  reputation: number;
  guildName?: string;
  role?: string;
  guildCount?: number;
  totalEarnings?: number;
  totalReviews: number;
  approvals: number;
  rejections: number;
}

interface ReputationLeaderboardProps {
  guildId?: string;
  currentExpertId?: string;
}

export function ReputationLeaderboard({
  guildId,
  currentExpertId,
}: ReputationLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"global" | "guild">(
    guildId ? "guild" : "global"
  );

  useEffect(() => {
    fetchLeaderboard();
  }, [viewMode, guildId]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = guildId && viewMode === "guild"
        ? { guildId, limit: 50 }
        : { limit: 50 };

      const result: any = await expertApi.getLeaderboard(params);
      setLeaderboard(result.data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

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
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchLeaderboard} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Experts</p>
          <p className="text-2xl font-bold text-foreground">{leaderboard.length}</p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Avg Reviews</p>
          <p className="text-2xl font-bold text-foreground">
            {leaderboard.length > 0
              ? Math.round(
                  leaderboard.reduce((sum, e) => sum + e.totalReviews, 0) / leaderboard.length
                )
              : 0}
          </p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Coins className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Top Earnings</p>
          <p className="text-2xl font-bold text-foreground">
            ${(leaderboard[0]?.totalEarnings || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
          <p className="text-2xl font-bold text-foreground">
            ${leaderboard.length > 0
              ? Math.round(
                  leaderboard.reduce((sum, e) => sum + (e.totalEarnings || 0), 0)
                ).toLocaleString()
              : 0}
          </p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
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
              {leaderboard.map((entry) => (
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
                        {entry.walletAddress.slice(0, 6)}...{entry.walletAddress.slice(-4)}
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

        {leaderboard.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No experts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
