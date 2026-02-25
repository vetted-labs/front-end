"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { expertApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";

import { formatTimeAgo, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Activity,
  Target,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import type {
  ReputationTimelineEntry,
  ReputationTierConfig,
  ExpertProfile,
  PaginationInfo,
} from "@/types";

const tierConfig: Record<string, ReputationTierConfig> = {
  aligned: {
    label: "Aligned",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    border: "border-emerald-500/20 dark:border-emerald-500/25",
  },
  mild_deviation: {
    label: "Mild Deviation",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    border: "border-amber-500/20 dark:border-amber-500/25",
  },
  moderate_deviation: {
    label: "Moderate Deviation",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10 dark:bg-orange-500/15",
    border: "border-orange-500/20 dark:border-orange-500/25",
  },
  severe_deviation: {
    label: "Severe Deviation",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10 dark:bg-red-500/15",
    border: "border-red-500/20 dark:border-red-500/25",
  },
  vote_with_majority: {
    label: "Majority Vote",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    border: "border-blue-500/20 dark:border-blue-500/25",
  },
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function ReputationPage() {
  const { address } = useAccount();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [timeline, setTimeline] = useState<ReputationTimelineEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const { isLoading: loading, refetch } = useFetch(
    async () => {
      if (!address) return null;
      const [profileRes, timelineRes] = await Promise.all([
        expertApi.getProfile(address),
        expertApi.getReputationTimeline(address, { page, limit: 15 }),
      ]);
      return { profileRes, timelineRes };
    },
    {
      skip: !address,
      onSuccess: (result) => {
        if (!result) return;
        setProfile(result.profileRes as ExpertProfile);
        const tData = ((result.timelineRes as unknown) as Record<string, unknown>).data ?? result.timelineRes;
        const typedData = tData as Record<string, unknown>;
        setTimeline((typedData.items as ReputationTimelineEntry[]) || []);
        setPagination((typedData.pagination as PaginationInfo) || null);
      },
      onError: () => {
        toast.error("Failed to load reputation data");
      },
    }
  );

  // Refetch when page changes
  useEffect(() => {
    if (address && page > 1) {
      refetch();
    }
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute stats from timeline
  const totalGains = timeline.filter((e) => e.change_amount > 0).reduce((s, e) => s + e.change_amount, 0);
  const totalLosses = timeline.filter((e) => e.change_amount < 0).reduce((s, e) => s + e.change_amount, 0);
  const alignedCount = timeline.filter((e) => e.reason === "aligned").length;
  const deviationCount = timeline.filter((e) => e.reason?.includes("deviation")).length;

  if (!address) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <Card className="max-w-md w-full text-center">
          <div className="p-12">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">Connect your wallet to view reputation.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reputation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your reputation score and history across all guilds
          </p>
        </div>

        {/* Score Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card hover>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</p>
                <p className="text-2xl font-bold tabular-nums">{profile?.reputation ?? 0}</p>
              </div>
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gained</p>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">+{totalGains}</p>
              </div>
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lost</p>
                <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">{totalLosses || 0}</p>
              </div>
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alignment</p>
                <p className="text-2xl font-bold tabular-nums">
                  {alignedCount + deviationCount > 0
                    ? Math.round((alignedCount / (alignedCount + deviationCount)) * 100)
                    : 100}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* How It Works */}
        <Card padding="none">
          <button
            onClick={() => setShowHowItWorks((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">How Reputation Works</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                showHowItWorks ? "rotate-180" : ""
              }`}
            />
          </button>

          {showHowItWorks && (
            <div className="px-5 pb-5 border-t border-border/40">
              <div className="grid sm:grid-cols-2 gap-6 pt-4">
                {/* What is Reputation */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    What is Reputation?
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Reputation measures how consistently your reviews align with expert consensus. It determines your rank within guilds, your eligibility for higher-tier reviews, and your share of VETD rewards.
                  </p>
                </div>

                {/* How You Earn It */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    How You Earn (or Lose) It
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    After a review is finalized, your score is compared to the guild consensus. The closer your score, the more reputation you earn. Large deviations result in reputation penalties (slashing).
                  </p>
                </div>

                {/* Event Types */}
                <div className="sm:col-span-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Event Types
                  </h4>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <div className="flex items-start gap-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Aligned</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Your scored vote was close to the consensus after a full application review with finalization. Earns reputation + VETD rewards.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10 px-3 py-2.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Majority Vote</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Your approve/reject vote on a guild application matched the majority outcome. Earns a flat reputation bonus.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 px-3 py-2.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Mild / Moderate / Severe Deviation</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Your score deviated from consensus. The further away, the larger the reputation penalty. Severe deviations also reduce staked VETD.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scoring */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Alignment Scoring
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    After a review, the consensus score is calculated using IQR-based filtering (statistical outlier removal). Your &quot;distance&quot; is how far your score was from this consensus. Lower distance = better alignment.
                  </p>
                </div>

                {/* Ranks */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Guild Ranks
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Reputation unlocks guild ranks: Recruit, Apprentice (50+), Craftsman (150+), Officer (300+), and Guild Master (500+). Higher ranks require more reviews and better consensus alignment rates.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Timeline */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold tracking-tight">Timeline</h2>
            {pagination && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {pagination.total} events
              </span>
            )}
          </div>

          {timeline.length === 0 ? (
            <Card className="text-center">
              <div className="py-16">
                <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No reputation changes yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Your history will appear here after proposals are finalized.
                </p>
              </div>
            </Card>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[23px] top-0 bottom-0 w-px bg-border/60 dark:bg-white/[0.06]" />

              <div className="space-y-1">
                {timeline.map((entry, i) => {
                  const tier = tierConfig[entry.reason] || tierConfig.aligned;
                  const isPositive = entry.change_amount >= 0;
                  const isProposalVote = entry.vote_score !== null;

                  return (
                    <div key={i} className="relative pl-14 group">
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-[16px] top-[20px] w-[15px] h-[15px] rounded-full border-2 border-background z-10 ${
                          isPositive
                            ? "bg-emerald-500 shadow-sm shadow-emerald-500/30"
                            : "bg-red-500 shadow-sm shadow-red-500/30"
                        }`}
                      />

                      <Card
                        padding="none"
                        hover
                        className="transition-all"
                      >
                        <div className="p-4 sm:p-5">
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${
                                  isPositive
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {isPositive ? (
                                  <ArrowUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5" />
                                )}
                                {isPositive ? "+" : ""}
                                {entry.change_amount}
                              </span>

                              <span
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${tier.bg} ${tier.color} ${tier.border}`}
                              >
                                {tier.label}
                              </span>

                              {entry.guild_name && (
                                <Badge variant="outline" className="text-[11px] font-normal">
                                  {entry.guild_name}
                                </Badge>
                              )}
                            </div>

                            <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap tabular-nums flex-shrink-0">
                              {formatTimeAgo(entry.created_at)}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-sm text-muted-foreground mt-2">{entry.description}</p>

                          {/* Candidate info */}
                          {entry.candidate_name && (
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              Candidate: <span className="text-foreground/80">{entry.candidate_name}</span>
                              {entry.outcome && (
                                <>
                                  {" \u00B7 "}
                                  <span
                                    className={
                                      entry.outcome === "approved"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-red-500 dark:text-red-400"
                                    }
                                  >
                                    {entry.outcome}
                                  </span>
                                </>
                              )}
                            </p>
                          )}

                          {/* Vote details grid */}
                          {isProposalVote && (
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="rounded-lg bg-muted/50 dark:bg-white/[0.03] px-3 py-2">
                                <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Your Vote</p>
                                <p className="text-sm font-semibold tabular-nums mt-0.5">{entry.vote_score}</p>
                              </div>
                              <div className="rounded-lg bg-muted/50 dark:bg-white/[0.03] px-3 py-2">
                                <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Consensus</p>
                                <p className="text-sm font-semibold tabular-nums mt-0.5">{Number(entry.consensus_score).toFixed(1)}</p>
                              </div>
                              <div className="rounded-lg bg-muted/50 dark:bg-white/[0.03] px-3 py-2">
                                <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Distance</p>
                                <p className="text-sm font-semibold tabular-nums mt-0.5">{Number(entry.alignment_distance).toFixed(1)}</p>
                              </div>
                              {entry.reward_amount !== null && Number(entry.reward_amount) > 0 && (
                                <div className="rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/15 px-3 py-2">
                                  <p className="text-[10px] font-medium text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-wider">Reward</p>
                                  <p className="text-sm font-semibold tabular-nums mt-0.5 text-emerald-600 dark:text-emerald-400">
                                    +{Number(entry.reward_amount).toFixed(2)}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Full date on hover */}
                          <p className="text-[10px] text-muted-foreground/40 mt-2 tabular-nums">
                            {formatDate(entry.created_at)} at {formatTime(entry.created_at)}
                          </p>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <span className="text-xs text-muted-foreground tabular-nums">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
