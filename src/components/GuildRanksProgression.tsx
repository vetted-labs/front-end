"use client";
import { ReactElement } from "react";
import { Shield, Target, Award, Crown, Sparkles } from "lucide-react";

interface Rank {
  level: number;
  name: string;
  icon: ReactElement;
  description: string;
  requirements: string[];
  color: string;
  bgGradient: string;
}

const GUILD_RANKS: Rank[] = [
  {
    level: 1,
    name: "Recruit",
    icon: <Shield className="w-8 h-8" />,
    description: "Entry-level guild member who has passed initial vetting",
    requirements: [
      "Successfully pass guild proposal review",
      "Receive 1+ approval from guild members",
      "Complete profile verification",
    ],
    color: "text-muted-foreground",
    bgGradient: "from-slate-100 to-slate-200",
  },
  {
    level: 2,
    name: "Apprentice",
    icon: <Target className="w-8 h-8" />,
    description: "Active participant building reputation through reviews",
    requirements: [
      "Complete 10+ proposal reviews",
      "Maintain 70%+ consensus alignment",
      "Build reputation score to 50+",
    ],
    color: "text-blue-600",
    bgGradient: "from-blue-100 to-blue-200",
  },
  {
    level: 3,
    name: "Craftsman",
    icon: <Award className="w-8 h-8" />,
    description: "Trusted reviewer eligible to endorse candidates",
    requirements: [
      "Complete 50+ reviews with good alignment",
      "Maintain 75%+ consensus rate",
      "Reputation score 150+",
      "Successfully endorse 5+ candidates",
    ],
    color: "text-primary",
    bgGradient: "from-violet-100 to-violet-200",
  },
  {
    level: 4,
    name: "Officer",
    icon: <Crown className="w-8 h-8" />,
    description: "Senior guild member overseeing governance",
    requirements: [
      "Complete 100+ reviews",
      "Maintain 80%+ consensus rate",
      "Reputation score 300+",
      "Participate in guild governance",
      "Mentor 3+ lower-rank members",
    ],
    color: "text-amber-600",
    bgGradient: "from-amber-100 to-amber-200",
  },
  {
    level: 5,
    name: "Guild Master",
    icon: <Sparkles className="w-10 h-10" />,
    description: "Elected leader representing the guild in platform governance",
    requirements: [
      "Elected by guild members",
      "200+ successful reviews",
      "85%+ consensus rate",
      "Reputation score 500+",
      "Proven leadership and contribution",
    ],
    color: "text-purple-600",
    bgGradient: "from-purple-100 via-fuchsia-100 to-pink-100",
  },
];

interface GuildRanksProgressionProps {
  currentRank?: string;
  reputation?: number;
  reviewCount?: number;
  consensusRate?: number;
}

export function GuildRanksProgression({
  currentRank = "recruit",
  reputation = 0,
  reviewCount = 0,
  consensusRate = 0,
}: GuildRanksProgressionProps) {
  const currentRankIndex = GUILD_RANKS.findIndex(
    (r) => r.name.toLowerCase() === currentRank.toLowerCase()
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-full mb-4">
          <Sparkles className="w-4 h-4 text-primary mr-2" />
          <span className="text-sm font-medium text-primary">
            Guild Progression System
          </span>
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Advance Your Guild Rank
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Build reputation, contribute to the guild, and climb the ranks from Recruit to Guild Master.
        </p>
      </div>

      {/* Current Status Card */}
      {currentRankIndex >= 0 && (
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-8 border border-violet-200 mb-12">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary mb-1">Your Current Rank</p>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                {GUILD_RANKS[currentRankIndex].name}
              </h2>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reputation</p>
                  <p className="text-2xl font-bold text-primary">{reputation}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reviews</p>
                  <p className="text-2xl font-bold text-primary">{reviewCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Consensus Rate</p>
                  <p className="text-2xl font-bold text-primary">{consensusRate}%</p>
                </div>
              </div>
            </div>
            <div
              className={`w-24 h-24 bg-gradient-to-br ${GUILD_RANKS[currentRankIndex].bgGradient} rounded-2xl flex items-center justify-center ${GUILD_RANKS[currentRankIndex].color} shadow-lg`}
            >
              {GUILD_RANKS[currentRankIndex].icon}
            </div>
          </div>

          {/* Progress to next rank */}
          {currentRankIndex < GUILD_RANKS.length - 1 && (
            <div className="mt-6 pt-6 border-t border-violet-200">
              <p className="text-sm font-medium text-card-foreground mb-3">
                Next: {GUILD_RANKS[currentRankIndex + 1].name}
              </p>
              <div className="flex gap-2">
                {GUILD_RANKS[currentRankIndex + 1].requirements.map((req, i) => (
                  <div
                    key={i}
                    className="flex-1 px-3 py-2 bg-card rounded-lg border border-violet-200 text-xs text-muted-foreground"
                  >
                    {req}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rank Timeline */}
      <div className="relative">
        {/* Connecting Line */}
        <div className="absolute left-[60px] top-0 bottom-0 w-1 bg-gradient-to-b from-slate-200 via-violet-200 to-purple-300 hidden md:block" />

        {/* Rank Cards */}
        <div className="space-y-8">
          {GUILD_RANKS.map((rank, index) => {
            const isCurrentRank = index === currentRankIndex;
            const isPastRank = index < currentRankIndex;
            const isFutureRank = index > currentRankIndex;

            return (
              <div key={rank.name} className="relative">
                {/* Timeline Dot */}
                <div
                  className={`absolute left-[42px] w-10 h-10 rounded-full hidden md:flex items-center justify-center z-10 ${
                    isCurrentRank
                      ? "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg ring-4 ring-violet-100"
                      : isPastRank
                      ? "bg-gradient-to-br from-green-400 to-emerald-500 shadow-md"
                      : "bg-slate-300"
                  }`}
                >
                  <span className="text-white text-sm font-bold">{rank.level}</span>
                </div>

                {/* Rank Card */}
                <div
                  className={`md:ml-32 rounded-2xl p-6 transition-all ${
                    isCurrentRank
                      ? "bg-gradient-to-br from-white to-violet-50 border-2 border-violet-300 shadow-lg scale-105"
                      : isPastRank
                      ? "bg-gradient-to-br from-white to-green-50 border border-green-200 opacity-75"
                      : "bg-card border border-border"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-16 h-16 bg-gradient-to-br ${rank.bgGradient} rounded-xl flex items-center justify-center ${rank.color} shadow-md`}
                      >
                        {rank.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-2xl font-bold text-foreground">{rank.name}</h3>
                          {isCurrentRank && (
                            <span className="px-2 py-1 bg-violet-100 text-primary text-xs font-semibold rounded-full">
                              Current
                            </span>
                          )}
                          {isPastRank && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                              Achieved
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1">{rank.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Requirements */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-card-foreground mb-2">Requirements:</p>
                    {rank.requirements.map((req, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isPastRank
                              ? "bg-green-500"
                              : isCurrentRank
                              ? "bg-violet-300"
                              : "bg-muted"
                          }`}
                        >
                          {isPastRank && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <p
                          className={`text-sm ${
                            isPastRank
                              ? "text-green-700 line-through"
                              : isCurrentRank
                              ? "text-card-foreground font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {req}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Special Guild Master Badge */}
                  {rank.level === 5 && (
                    <div className="mt-4 pt-4 border-t border-purple-200">
                      <div className="flex items-center gap-2 text-purple-600">
                        <Sparkles className="w-5 h-5" />
                        <p className="text-sm font-semibold">
                          Ultimate Achievement: Elected by your guild peers
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-12 text-center bg-gradient-to-r from-primary to-indigo-600 rounded-2xl p-8 text-white">
        <Sparkles className="w-12 h-12 mx-auto mb-4" />
        <h3 className="text-2xl font-bold mb-2">Ready to Advance?</h3>
        <p className="text-violet-100 mb-6">
          Start reviewing proposals, build your reputation, and climb the ranks!
        </p>
        <button className="px-8 py-3 bg-card text-primary rounded-lg font-semibold hover:bg-primary/10 transition-all shadow-lg">
          Start Reviewing
        </button>
      </div>
    </div>
  );
}
