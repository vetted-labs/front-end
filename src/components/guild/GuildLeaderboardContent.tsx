"use client";

import {
  Trophy,
  Star,
  Target,
  FileText,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { getRoleBadgeColor } from "@/lib/guildHelpers";
import { STATUS_COLORS, STAT_ICON } from "@/config/colors";
import type { GuildLeaderboardEntry } from "@/types";

interface GuildLeaderboardContentProps {
  leaderboard: GuildLeaderboardEntry[];
  onNavigate: (path: string) => void;
}

export function GuildLeaderboardContent({ leaderboard, onNavigate }: GuildLeaderboardContentProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Guild Leaderboard</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Trophy className={`w-4 h-4 ${STATUS_COLORS.warning.icon}`} />
          <span>Top {leaderboard.length} Experts</span>
        </div>
      </div>

      {leaderboard.length > 0 ? (
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <button
              key={entry.memberId}
              onClick={() => {
                if (entry.role !== 'candidate' && entry.walletAddress) {
                  onNavigate(`/experts/${entry.walletAddress}`);
                }
              }}
              className={`w-full bg-card border rounded-xl p-6 hover:border-primary/50 hover:shadow-md transition-all text-left ${
                entry.role !== 'candidate' && entry.walletAddress ? 'cursor-pointer' : 'cursor-default'
              } ${
                index < 3 ? `border-2 ${STATUS_COLORS.warning.border} bg-warning/5` : "border-border"
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Rank Badge */}
                <div className="flex-shrink-0">
                  {index === 0 ? (
                    <div className="w-14 h-14 rounded-full bg-rank-master flex items-center justify-center shadow-sm">
                      <Trophy className="w-7 h-7 text-white" />
                    </div>
                  ) : index === 1 ? (
                    <div className="w-14 h-14 rounded-full bg-rank-recruit flex items-center justify-center shadow-sm">
                      <Trophy className="w-7 h-7 text-white" />
                    </div>
                  ) : index === 2 ? (
                    <div className="w-14 h-14 rounded-full bg-rank-craftsman flex items-center justify-center shadow-sm">
                      <Trophy className="w-7 h-7 text-white" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                      <span className="text-xl font-bold text-foreground">#{entry.rank}</span>
                    </div>
                  )}
                </div>

                {/* Member Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-xl text-foreground">{entry.fullName}</h3>
                    <span
                      className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${getRoleBadgeColor(
                        entry.role
                      )}`}
                    >
                      {entry.role.toUpperCase()}
                    </span>
                    {entry.trend && (
                      <div className="flex items-center gap-2">
                        {entry.trend === "up" ? (
                          <TrendingUp className={`w-4 h-4 ${STATUS_COLORS.positive.icon}`} />
                        ) : entry.trend === "down" ? (
                          <TrendingUp className={`w-4 h-4 ${STATUS_COLORS.negative.icon} rotate-180`} />
                        ) : null}
                        {entry.previousRank && (
                          <span className="text-xs text-muted-foreground">
                            {entry.previousRank > entry.rank
                              ? `+${entry.previousRank - entry.rank}`
                              : entry.previousRank < entry.rank
                              ? `-${entry.rank - entry.previousRank}`
                              : "\u2014"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Star className={`w-4 h-4 ${STATUS_COLORS.warning.icon} fill-current`} />
                      <div>
                        <p className="text-sm font-bold text-foreground">{entry.reputation}</p>
                        <p className="text-xs text-muted-foreground">Reputation</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-bold text-foreground">{entry.contributionScore}</p>
                        <p className="text-xs text-muted-foreground">Earnings</p>
                      </div>
                    </div>
                    {entry.totalReviews !== undefined && (
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 ${STAT_ICON.text}`} />
                        <div>
                          <p className="text-sm font-bold text-foreground">{entry.totalReviews}</p>
                          <p className="text-xs text-muted-foreground">Reviews</p>
                        </div>
                      </div>
                    )}
                    {entry.successRate !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`w-4 h-4 ${STATUS_COLORS.positive.icon}`} />
                        <div>
                          <p className="text-sm font-bold text-foreground">{entry.successRate}%</p>
                          <p className="text-xs text-muted-foreground">Success Rate</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reputation Change Badge */}
                  {entry.reputationChange && (
                    <div className="mt-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                          entry.reputationChange.startsWith("+")
                            ? STATUS_COLORS.positive.badge
                            : entry.reputationChange.startsWith("-")
                            ? STATUS_COLORS.negative.badge
                            : STATUS_COLORS.neutral.badge
                        }`}
                      >
                        {entry.reputationChange} this month
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Trophy className="w-20 h-20 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-sm font-medium text-muted-foreground mb-2">No leaderboard data available</p>
          <p className="text-sm text-muted-foreground">
            Rankings will appear as members earn reputation
          </p>
        </div>
      )}

    </div>
  );
}
