"use client";
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "./ui/Button";

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
      const url = guildId && viewMode === "guild"
        ? `http://localhost:4000/api/experts/reputation/leaderboard?guildId=${guildId}&limit=50`
        : `http://localhost:4000/api/experts/reputation/leaderboard?limit=50`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const result = await response.json();
      setLeaderboard(result.data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return null;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white";
    if (rank === 2) return "bg-gradient-to-br from-slate-300 to-slate-500 text-white";
    if (rank === 3) return "bg-gradient-to-br from-amber-500 to-amber-700 text-white";
    return "bg-slate-100 text-slate-700";
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
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error}</p>
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
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-500" />
            Reputation Leaderboard
          </h2>
          <p className="text-slate-600 mt-1">
            Top performing experts ranked by reputation score
          </p>
        </div>

        {guildId && (
          <div className="flex gap-2">
            <Button
              variant={viewMode === "global" ? "default" : "outline"}
              onClick={() => setViewMode("global")}
            >
              Global
            </Button>
            <Button
              variant={viewMode === "guild" ? "default" : "outline"}
              onClick={() => setViewMode("guild")}
            >
              Guild Only
            </Button>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl p-4 border border-violet-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-violet-600" />
            <p className="text-sm font-medium text-violet-700">Total Experts</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{leaderboard.length}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-green-700">Avg Reviews</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {leaderboard.length > 0
              ? Math.round(
                  leaderboard.reduce((sum, e) => sum + e.totalReviews, 0) / leaderboard.length
                )
              : 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-700">Top Score</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {leaderboard[0]?.reputation || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-700">Avg Reputation</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {leaderboard.length > 0
              ? Math.round(
                  leaderboard.reduce((sum, e) => sum + e.reputation, 0) / leaderboard.length
                )
              : 0}
          </p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Expert
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Reputation
                </th>
                {!guildId && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Guilds
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Reviews
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Consensus
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboard.map((entry) => (
                <tr
                  key={entry.expertId}
                  className={`hover:bg-slate-50 transition-colors ${
                    entry.expertId === currentExpertId ? "bg-violet-50" : ""
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
                      <div className="font-medium text-slate-900 flex items-center gap-2">
                        {entry.fullName}
                        {entry.expertId === currentExpertId && (
                          <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-semibold rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        {entry.walletAddress.slice(0, 6)}...{entry.walletAddress.slice(-4)}
                      </div>
                      {entry.role && (
                        <div className="text-xs text-slate-600 capitalize mt-1">
                          {entry.role} {entry.guildName && `• ${entry.guildName}`}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Reputation */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-lg font-bold text-slate-900">
                        {entry.reputation}
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
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">{entry.guildCount || 0}</span>
                      </div>
                    </td>
                  )}

                  {/* Reviews */}
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-semibold text-slate-900">
                        {entry.totalReviews}
                      </div>
                      <div className="text-xs text-slate-500">
                        {entry.approvals} / {entry.rejections}
                      </div>
                    </div>
                  </td>

                  {/* Consensus Rate */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-slate-100 rounded-full h-2 max-w-[100px]">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                          style={{
                            width: `${calculateConsensusRate(entry.approvals, entry.rejections)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-slate-700">
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
            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No experts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
