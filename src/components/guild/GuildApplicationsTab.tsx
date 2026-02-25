"use client";

import { useState } from "react";
import {
  FileText,
  Clock,
  Lock,
  Unlock,
  ThumbsUp,
  ThumbsDown,
  Users,
  Timer,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuildApplicationSummary } from "@/types";

const ITEMS_PER_SECTION = 5;

interface GuildApplicationsTabProps {
  applications: {
    pending: GuildApplicationSummary[];
    ongoing: GuildApplicationSummary[];
    closed: GuildApplicationSummary[];
  };
  onStakeApplication: (application: GuildApplicationSummary) => void;
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

export function GuildApplicationsTab({
  applications,
  onStakeApplication,
}: GuildApplicationsTabProps) {
  const [pendingVisible, setPendingVisible] = useState(ITEMS_PER_SECTION);
  const [ongoingVisible, setOngoingVisible] = useState(ITEMS_PER_SECTION);

  return (
    <div className="space-y-8">
      {/* Proposal Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 rounded-2xl border border-amber-400/20 bg-amber-500/[0.06]">
          <p className="text-2xl font-bold text-primary">
            {applications.pending.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Pending</p>
        </div>
        <div className="text-center p-4 rounded-2xl border border-orange-400/20 bg-orange-500/[0.06]">
          <p className="text-2xl font-bold text-orange-200">
            {applications.ongoing.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Ongoing</p>
        </div>
        <div className="text-center p-4 rounded-2xl border border-border bg-muted/50">
          <p className="text-2xl font-bold text-foreground">
            {applications.closed.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Closed</p>
        </div>
      </div>

      {/* Pending Proposals */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Pending Reviews
        </h3>
        {applications.pending.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/50 p-12 text-center">
            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Pending Reviews
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              There are no candidate reviews waiting for your stake. Check back
              later or explore the leaderboard.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.pending.slice(0, pendingVisible).map((application) => {
              const timeInfo = getTimeRemaining(application.votingDeadline);
              const totalReviewers = application.reviewersAssigned || 0;
              const completed = application.reviewsCompleted || 0;

              return (
                <div
                  key={application.id}
                  className="rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-foreground text-base truncate">
                          {application.candidateName}
                        </h4>
                        {application.expertiseLevel && (
                          <span className="shrink-0 px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold rounded-full">
                            {application.expertiseLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {application.candidateEmail}
                      </p>
                      <div className="flex items-center flex-wrap gap-4 text-xs">
                        <span className="flex items-center text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          {new Date(application.submittedAt).toLocaleDateString()}
                        </span>
                        {application.yearsOfExperience && (
                          <span className="text-muted-foreground">
                            {application.yearsOfExperience}y exp
                          </span>
                        )}
                        <span className="flex items-center text-muted-foreground">
                          <Lock className="w-3.5 h-3.5 mr-1.5" />
                          {application.requiredStake} tokens
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
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                            <span>{completed} / {totalReviewers} reviews</span>
                            <span>{Math.round((completed / totalReviewers) * 100)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all"
                              style={{ width: `${Math.round((completed / totalReviewers) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">
                      {application.expertHasStaked ? (
                        <div className="flex items-center px-4 py-2 bg-green-500/10 text-green-400 rounded-xl border border-green-500/20">
                          <Unlock className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">Staked</span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => onStakeApplication(application)}
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
            {applications.pending.length > pendingVisible && (
              <button
                onClick={() => setPendingVisible((v) => v + ITEMS_PER_SECTION)}
                className="w-full py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronDown className="w-4 h-4" />
                Show more ({applications.pending.length - pendingVisible} remaining)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ongoing Reviews */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Ongoing Reviews</h3>
        {applications.ongoing.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No ongoing reviews at the moment
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.ongoing.slice(0, ongoingVisible).map((application) => {
              const timeInfo = getTimeRemaining(application.votingDeadline);
              const totalReviewers = application.reviewersAssigned || 0;
              const completed = application.reviewsCompleted || 0;
              const totalVotes = (application.votesFor ?? 0) + (application.votesAgainst ?? 0);

              return (
                <div
                  key={application.id}
                  className="rounded-2xl border border-primary/20 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-foreground text-base truncate">
                          {application.candidateName}
                        </h4>
                        <span className="shrink-0 px-2.5 py-0.5 bg-orange-500/15 text-orange-300 dark:text-orange-300 border border-orange-400/30 text-xs font-semibold rounded-full">
                          Under Review
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {application.candidateEmail}
                      </p>
                      <div className="flex items-center flex-wrap gap-4 text-xs">
                        <span className="flex items-center text-muted-foreground">
                          <Users className="w-3.5 h-3.5 mr-1.5" />
                          {application.participantCount} participants
                        </span>
                        {totalVotes > 0 && (
                          <>
                            <span className="flex items-center text-green-400">
                              <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                              {application.votesFor}
                            </span>
                            <span className="flex items-center text-red-400">
                              <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
                              {application.votesAgainst}
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
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                            <span>{completed} / {totalReviewers} reviews</span>
                            <span>{Math.round((completed / totalReviewers) * 100)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
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
            {applications.ongoing.length > ongoingVisible && (
              <button
                onClick={() => setOngoingVisible((v) => v + ITEMS_PER_SECTION)}
                className="w-full py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronDown className="w-4 h-4" />
                Show more ({applications.ongoing.length - ongoingVisible} remaining)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
