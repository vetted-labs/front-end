"use client";

import { useMemo } from "react";
import { FileText, Check, BarChart3 } from "lucide-react";
import { STAT_ICON, VOTE_COLORS, STATUS_COLORS } from "@/config/colors";
import type { GovernanceProposalDetail } from "@/types";

interface GovernanceStatsProps {
  proposals: GovernanceProposalDetail[];
  voteWeight: number;
}

export function GovernanceStats({ proposals, voteWeight }: GovernanceStatsProps) {
  const stats = useMemo(() => {
    const total = proposals.length;
    const passed = proposals.filter((p) => p.outcome === "passed" || p.status === "passed").length;
    const participated = proposals.filter((p) => p.has_voted).length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const participationRate = total > 0 ? Math.round((participated / total) * 100) : 0;

    // Recent votes for the "Your Recent Votes" section
    const votedProposals = proposals
      .filter((p) => p.has_voted)
      .slice(0, 5);

    return { total, passed, participated, passRate, participationRate, votedProposals };
  }, [proposals]);

  // Ring circle math
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - stats.participationRate / 100);

  return (
    <div className="space-y-10 mb-16">
      {/* ─── Stats Grid ─── */}
      <div>
        <div className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight mb-5">
          Governance Overview
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Participation Ring */}
          <div className="relative rounded-2xl border border-border bg-card p-7 text-center overflow-hidden">
            <div className="absolute inset-0 bg-transparent pointer-events-none" />
            <div className="relative w-16 h-16 mx-auto mb-2.5">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-muted/30"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="text-primary -rotate-90 origin-center transition-[stroke-dashoffset] duration-1000"
                />
                <text
                  x="32"
                  y="32"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-foreground font-mono text-sm font-bold"
                >
                  {stats.participationRate}%
                </text>
              </svg>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Your Participation</p>
            <p className="text-xs text-primary font-medium mt-1.5">Last 12 months</p>
          </div>

          {/* Total Proposals */}
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            value={stats.total.toString()}
            label="Total Proposals"
            sub={`${stats.passed} passed`}
          />

          {/* Pass Rate */}
          <StatCard
            icon={<Check className="w-5 h-5" />}
            value={`${stats.passRate}%`}
            label="Protocol Pass Rate"
            sub="Overall"
          />

          {/* Total Voting Power */}
          <StatCard
            icon={<BarChart3 className="w-5 h-5" />}
            value={`${voteWeight.toFixed(1)}x`}
            label="Your Voting Power"
            sub="Merit-weighted"
          />
        </div>
      </div>

      {/* ─── Your Recent Votes ─── */}
      {stats.votedProposals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight">
              Your Recent Votes
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium font-mono ${STATUS_COLORS.positive.badge}`}>
              {stats.participated}/{stats.total} votes cast
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {stats.votedProposals.map((p) => {
              const voteType = p.my_vote as "for" | "against" | "abstain" | undefined;
              const isPassed = p.outcome === "passed" || p.status === "passed";
              const isRejected = p.outcome === "rejected" || p.status === "rejected";
              const isActive = p.status === "active" && !p.finalized;

              // Did the vote match the outcome?
              const matchedOutcome =
                (voteType === "for" && isPassed) || (voteType === "against" && isRejected);

              return (
                <div
                  key={p.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] items-center gap-3 sm:gap-4 px-5 py-3.5 rounded-xl border border-border bg-card hover:border-border transition-colors"
                >
                  <p className="text-sm font-medium truncate">
                    #{p.id.slice(0, 6)} {p.title}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${
                      voteType === "for"
                        ? STATUS_COLORS.positive.badge
                        : voteType === "against"
                          ? STATUS_COLORS.negative.badge
                          : STATUS_COLORS.neutral.badge
                    }`}
                  >
                    {voteType ? voteType.charAt(0).toUpperCase() + voteType.slice(1) : "Voted"}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      isActive
                        ? "text-muted-foreground"
                        : matchedOutcome
                          ? STATUS_COLORS.positive.text
                          : STATUS_COLORS.negative.text
                    }`}
                  >
                    {isActive
                      ? "In progress"
                      : isPassed
                        ? "Passed"
                        : isRejected
                          ? "Failed"
                          : p.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card helper ─── */
function StatCard({
  icon,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-7 text-center overflow-hidden">
      <div className="absolute inset-0 bg-transparent pointer-events-none" />
      <div className={`w-11 h-11 rounded-xl ${STAT_ICON.bg} border border-primary/25 flex items-center justify-center mx-auto mb-3.5 ${STAT_ICON.text}`}>
        {icon}
      </div>
      <p className="font-mono text-3xl font-bold text-foreground mb-1">{value}</p>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-xs text-primary font-medium mt-1.5">{sub}</p>
    </div>
  );
}
