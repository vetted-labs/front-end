"use client";

import {
  FileText,
  Clock,
  Lock,
  Unlock,
  ThumbsUp,
  ThumbsDown,
  Users,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Proposal {
  id: string;
  candidateName: string;
  candidateEmail: string;
  submittedAt: string;
  status: "pending" | "ongoing" | "closed";
  requiredStake: number;
  participantCount: number;
  votesFor: number;
  votesAgainst: number;
  expertHasStaked: boolean;
  votingDeadline?: string;
  reviewersAssigned?: number;
  reviewsCompleted?: number;
  expertiseLevel?: string;
  yearsOfExperience?: number;
}

interface GuildProposalsTabProps {
  proposals: {
    pending: Proposal[];
    ongoing: Proposal[];
    closed: Proposal[];
  };
  onStakeProposal: (proposal: Proposal) => void;
}

function getTimeRemaining(deadline?: string) {
  if (!deadline) return null;
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const diff = end - now;
  if (diff <= 0) return { label: "Expired", color: "text-red-400", urgency: "red" as const };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 3) return { label: `${days}d ${hours}h`, color: "text-green-400", urgency: "green" as const };
  if (days >= 1) return { label: `${days}d ${hours}h`, color: "text-amber-400", urgency: "amber" as const };
  return { label: `${hours}h`, color: "text-red-400", urgency: "red" as const };
}

export function GuildProposalsTab({
  proposals,
  onStakeProposal,
}: GuildProposalsTabProps) {
  return (
    <div className="space-y-8">
      {/* Proposal Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 rounded-2xl border border-amber-400/20 bg-amber-500/[0.06]">
          <p className="text-2xl font-bold text-amber-200">
            {proposals.pending.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Pending</p>
        </div>
        <div className="text-center p-4 rounded-2xl border border-orange-400/20 bg-orange-500/[0.06]">
          <p className="text-2xl font-bold text-orange-200">
            {proposals.ongoing.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Ongoing</p>
        </div>
        <div className="text-center p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
          <p className="text-2xl font-bold text-slate-300">
            {proposals.closed.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Closed</p>
        </div>
      </div>

      {/* Pending Proposals */}
      <div>
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          Pending Reviews
        </h3>
        {proposals.pending.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center">
            <div className="w-16 h-16 bg-white/[0.05] rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">
              No Pending Reviews
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              There are no candidate reviews waiting for your stake. Check back
              later or explore the leaderboard.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.pending.map((proposal) => {
              const timeInfo = getTimeRemaining(proposal.votingDeadline);
              const totalReviewers = proposal.reviewersAssigned || 0;
              const completed = proposal.reviewsCompleted || 0;

              return (
                <div
                  key={proposal.id}
                  className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#151824]/90 via-[#101420]/95 to-[#0b0f1b]/95 p-5 transition-all hover:-translate-y-0.5 hover:border-orange-400/40 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-slate-100 text-base truncate">
                          {proposal.candidateName}
                        </h4>
                        {proposal.expertiseLevel && (
                          <span className="shrink-0 px-2.5 py-0.5 bg-amber-500/15 text-amber-200 border border-amber-400/30 text-xs font-semibold rounded-full">
                            {proposal.expertiseLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mb-3">
                        {proposal.candidateEmail}
                      </p>
                      <div className="flex items-center flex-wrap gap-4 text-xs">
                        <span className="flex items-center text-slate-400">
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          {new Date(proposal.submittedAt).toLocaleDateString()}
                        </span>
                        {proposal.yearsOfExperience && (
                          <span className="text-slate-400">
                            {proposal.yearsOfExperience}y exp
                          </span>
                        )}
                        <span className="flex items-center text-slate-400">
                          <Lock className="w-3.5 h-3.5 mr-1.5" />
                          {proposal.requiredStake} tokens
                        </span>
                        {timeInfo && (
                          <span className={`flex items-center ${timeInfo.color}`}>
                            <Timer className="w-3.5 h-3.5 mr-1.5" />
                            {timeInfo.label}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      {totalReviewers > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                            <span>{completed} / {totalReviewers} reviews</span>
                            <span>{Math.round((completed / totalReviewers) * 100)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all"
                              style={{ width: `${Math.round((completed / totalReviewers) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">
                      {proposal.expertHasStaked ? (
                        <div className="flex items-center px-4 py-2 bg-green-500/10 text-green-400 rounded-xl border border-green-500/20">
                          <Unlock className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">Staked</span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => onStakeProposal(proposal)}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-0"
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Stake to Participate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ongoing Reviews */}
      <div>
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Ongoing Reviews</h3>
        {proposals.ongoing.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-sm text-slate-400">
              No ongoing reviews at the moment
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.ongoing.map((proposal) => {
              const timeInfo = getTimeRemaining(proposal.votingDeadline);
              const totalReviewers = proposal.reviewersAssigned || 0;
              const completed = proposal.reviewsCompleted || 0;
              const totalVotes = proposal.votesFor + proposal.votesAgainst;

              return (
                <div
                  key={proposal.id}
                  className="rounded-2xl border border-orange-400/20 bg-gradient-to-b from-[#151824]/90 via-[#101420]/95 to-[#0b0f1b]/95 p-5 transition-all hover:-translate-y-0.5 hover:border-orange-400/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-slate-100 text-base truncate">
                          {proposal.candidateName}
                        </h4>
                        <span className="shrink-0 px-2.5 py-0.5 bg-orange-500/15 text-orange-300 border border-orange-400/30 text-xs font-semibold rounded-full">
                          Under Review
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-3">
                        {proposal.candidateEmail}
                      </p>
                      <div className="flex items-center flex-wrap gap-4 text-xs">
                        <span className="flex items-center text-slate-400">
                          <Users className="w-3.5 h-3.5 mr-1.5" />
                          {proposal.participantCount} participants
                        </span>
                        {totalVotes > 0 && (
                          <>
                            <span className="flex items-center text-green-400">
                              <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                              {proposal.votesFor}
                            </span>
                            <span className="flex items-center text-red-400">
                              <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
                              {proposal.votesAgainst}
                            </span>
                          </>
                        )}
                        {timeInfo && (
                          <span className={`flex items-center ${timeInfo.color}`}>
                            <Timer className="w-3.5 h-3.5 mr-1.5" />
                            {timeInfo.label}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      {totalReviewers > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                            <span>{completed} / {totalReviewers} reviews</span>
                            <span>{Math.round((completed / totalReviewers) * 100)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all"
                              style={{ width: `${Math.round((completed / totalReviewers) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
