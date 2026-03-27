"use client";

import { useMemo } from "react";
import { Check, Users, ChevronRight } from "lucide-react";
import { VOTE_COLORS, STATUS_COLORS } from "@/config/colors";
import type { GovernanceProposalDetail } from "@/types";

interface LiveVoteBannerProps {
  proposal: GovernanceProposalDetail;
  voteWeight: number;
  onClick: () => void;
}

export function LiveVoteBanner({ proposal, voteWeight, onClick }: LiveVoteBannerProps) {
  const totalVotes = proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
  const forPct = totalVotes > 0 ? (proposal.votes_for / totalVotes) * 100 : 0;
  const againstPct = totalVotes > 0 ? (proposal.votes_against / totalVotes) * 100 : 0;
  const quorumPct = proposal.quorum_required > 0
    ? Math.min((proposal.total_voting_power / proposal.quorum_required) * 100, 100)
    : 0;
  // Parse countdown
  const countdown = useMemo(() => {
    const diff = new Date(proposal.voting_deadline).getTime() - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return { days: d, hours: h, minutes: m };
  }, [proposal.voting_deadline]);

  const initials = (proposal.proposer_name || "??")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mb-8 relative">
      {/* Animated pulsing border */}
      <div className="absolute -inset-[2px] rounded-[22px] bg-border opacity-70 -z-10" />

      <div
        onClick={onClick}
        className="relative rounded-2xl bg-card p-7 sm:p-9 overflow-hidden cursor-pointer"
      >
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-border" />

        {/* Live tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-negative/10 border border-negative/20 text-xs font-bold text-negative uppercase tracking-wider mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-negative animate-pulse" />
          Live Vote
        </div>

        {/* Header: Title + Countdown */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-sm font-medium text-primary mb-1">
              #{proposal.id.slice(0, 8)}
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight leading-tight mb-2.5">
              {proposal.title}
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
                {initials}
              </span>
              Proposed by{" "}
              <span className="font-medium text-foreground">
                {proposal.proposer_name || "Unknown"}
              </span>
            </div>
          </div>

          {/* Countdown */}
          {countdown && (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                Time Remaining
              </p>
              <div className="flex gap-1.5">
                {[
                  { val: countdown.days, label: "Days" },
                  { val: String(countdown.hours).padStart(2, "0"), label: "Hrs" },
                  { val: String(countdown.minutes).padStart(2, "0"), label: "Min" },
                ].map((unit) => (
                  <div
                    key={unit.label}
                    className="flex flex-col items-center bg-muted/50 border border-border rounded-lg px-3 py-2 min-w-[50px]"
                  >
                    <span className="font-mono text-xl font-bold text-foreground leading-none">
                      {unit.val}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                      {unit.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Vote bar */}
        <div className="mb-5">
          <div className="flex justify-between mb-2.5">
            <div className={`flex items-center gap-2 text-sm font-medium ${VOTE_COLORS.for.text}`}>
              <span className="font-mono text-xl">{forPct.toFixed(0)}%</span> For
              <span className="font-mono text-xs font-normal text-muted-foreground">
                ({proposal.votes_for.toLocaleString()} votes)
              </span>
            </div>
            <div className={`flex items-center gap-2 text-sm font-medium ${VOTE_COLORS.against.text}`}>
              Against <span className="font-mono text-xl">{againstPct.toFixed(0)}%</span>
              <span className="font-mono text-xs font-normal text-muted-foreground">
                ({proposal.votes_against.toLocaleString()} votes)
              </span>
            </div>
          </div>
          <div className="w-full h-10 rounded-lg bg-muted/30 overflow-hidden flex relative">
            <div
              className="h-full bg-gradient-to-r from-positive/25 to-positive rounded-l-lg relative flex items-center justify-center transition-all duration-1000"
              style={{ width: `${forPct}%` }}
            >
              {forPct > 0 && (
                <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-white rounded-sm" />
              )}
            </div>
            <div
              className="h-full flex-1 bg-gradient-to-r from-negative to-negative/25 rounded-r-lg"
            />
          </div>
        </div>

        {/* Quorum bar */}
        <div className="flex items-center gap-4 mb-6">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
            <Users className="w-3.5 h-3.5" />
            Quorum
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000"
              style={{ width: `${quorumPct}%` }}
            />
          </div>
          <span className="font-mono text-xs font-medium text-primary whitespace-nowrap">
            {quorumPct.toFixed(0)}% reached
          </span>
        </div>

        {/* CTA area */}
        {proposal.has_voted ? (
          <div className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium ${STATUS_COLORS.positive.badge}`}>
            <Check className="w-4 h-4" />
            You voted {proposal.my_vote ? proposal.my_vote.charAt(0).toUpperCase() + proposal.my_vote.slice(1) : ""}
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-muted-foreground bg-muted/30 border border-border">
              <ChevronRight className="w-3.5 h-3.5 text-primary" />
              Click to cast your vote ({voteWeight.toFixed(1)}x power)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
