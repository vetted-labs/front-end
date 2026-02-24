"use client";

import { Trophy, ChevronUp, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";

interface LeaderboardExpert {
  id: string;
  name: string;
  role: "recruit" | "apprentice" | "craftsman" | "officer" | "master";
  reputation: number;
  totalReviews: number;
  accuracy: number;
  totalEarnings: number;
  rank: number;
  rankChange?: number; // Positive = moved up, negative = moved down
  reputationChange?: number; // Change in reputation this period
}

interface GuildLeaderboardTabProps {
  leaderboardData: {
    topExperts: LeaderboardExpert[];
    currentUser: LeaderboardExpert | null;
  };
  leaderboardPeriod: "all" | "month" | "week";
  onPeriodChange: (period: "all" | "month" | "week") => void;
}

export function GuildLeaderboardTab({
  leaderboardData,
  leaderboardPeriod,
  onPeriodChange,
}: GuildLeaderboardTabProps) {
  // Helper function to render rank change indicator
  const renderRankChange = (rankChange?: number) => {
    if (!rankChange || rankChange === 0) return null;

    const isImproving = rankChange > 0;
    const Icon = isImproving ? ChevronUp : ChevronDown;
    const color = isImproving ? "text-green-600" : "text-red-600";

    return (
      <span className={`inline-flex items-center ml-1 ${color}`} title={`${isImproving ? 'Up' : 'Down'} ${Math.abs(rankChange)} ${Math.abs(rankChange) === 1 ? 'position' : 'positions'}`}>
        <Icon className="w-3 h-3" />
      </span>
    );
  };

  // Helper function to render reputation change
  const renderReputationChange = (reputationChange?: number) => {
    if (!reputationChange || reputationChange === 0) return null;

    const isPositive = reputationChange > 0;
    const color = isPositive ? "text-green-600" : "text-red-600";
    const sign = isPositive ? "+" : "";

    return (
      <span className={`text-xs ml-2 ${color} font-medium`}>
        ({sign}{reputationChange})
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Top Experts</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Showing {leaderboardData.topExperts.length} top performing experts
          </p>
        </div>
        <select
          value={leaderboardPeriod}
          onChange={(e) =>
            onPeriodChange(e.target.value as "all" | "month" | "week")
          }
          className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">All Time</option>
          <option value="month">This Month</option>
          <option value="week">This Week</option>
        </select>
      </div>

      {/* Leaderboard Table */}
      {leaderboardData.topExperts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Leaderboard Data
          </h3>
          <p className="text-sm text-muted-foreground">
            Start reviewing candidates and endorsing applications to appear on
            the leaderboard.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Rank
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Expert
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Reputation
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Reviews
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Accuracy
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Earnings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.topExperts.map((expert, index) => (
                    <tr
                      key={expert.id}
                      className="border-t border-border hover:bg-muted/30 transition-colors"
                    >
                      {/* Rank with medal icons for top 3 and rank change indicators */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {index === 0 && <span className="text-xl">🥇</span>}
                          {index === 1 && <span className="text-xl">🥈</span>}
                          {index === 2 && <span className="text-xl">🥉</span>}
                          {index > 2 && (
                            <span className="text-foreground font-medium text-sm">
                              #{index + 1}
                            </span>
                          )}
                          {index < 10 && renderRankChange(expert.rankChange)}
                        </div>
                      </td>

                      {/* Expert Info - Condensed */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {expert.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {expert.name}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {expert.role}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Stats - Condensed */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center">
                          <span className="font-semibold text-foreground text-sm">
                            {expert.reputation}
                          </span>
                          {renderReputationChange(expert.reputationChange)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-muted-foreground text-sm">
                          {expert.totalReviews}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-foreground text-sm">{expert.accuracy}%</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-semibold text-foreground text-sm">
                          ${expert.totalEarnings.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Current User Position (if not in top list) */}
          {leaderboardData.currentUser &&
            leaderboardData.currentUser.rank > leaderboardData.topExperts.length && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Your Position
                </p>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold text-foreground">
                        #{leaderboardData.currentUser.rank}
                      </span>
                      {renderRankChange(leaderboardData.currentUser.rankChange)}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {leaderboardData.currentUser.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <span className="text-foreground font-medium">
                        {leaderboardData.currentUser.name}
                      </span>
                      <p className="text-xs text-muted-foreground capitalize">
                        {leaderboardData.currentUser.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Reputation:{" "}
                      <strong className="text-foreground">
                        {leaderboardData.currentUser.reputation}
                      </strong>
                      {renderReputationChange(leaderboardData.currentUser.reputationChange)}
                    </span>
                    <span className="text-muted-foreground">
                      Earnings:{" "}
                      <strong className="text-foreground">
                        ${leaderboardData.currentUser.totalEarnings.toLocaleString()}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
}
