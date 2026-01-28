"use client";

import {
  FileText,
  Clock,
  Lock,
  Unlock,
  ThumbsUp,
  ThumbsDown,
  Users,
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
}

interface GuildProposalsTabProps {
  proposals: {
    pending: Proposal[];
    ongoing: Proposal[];
    closed: Proposal[];
  };
  onStakeProposal: (proposal: Proposal) => void;
}

export function GuildProposalsTab({
  proposals,
  onStakeProposal,
}: GuildProposalsTabProps) {
  return (
    <div className="space-y-6">
      {/* Proposal Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/50">
          <p className="text-2xl font-bold text-foreground">
            {proposals.pending.length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Pending</p>
        </div>
        <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/30">
          <p className="text-2xl font-bold text-foreground">
            {proposals.ongoing.length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Ongoing</p>
        </div>
        <div className="text-center p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
          <p className="text-2xl font-bold text-foreground">
            {proposals.closed.length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Closed</p>
        </div>
      </div>

      {/* Pending Proposals */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Pending Reviews - Stake to Participate
        </h3>
        {proposals.pending.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Pending Reviews
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              There are no candidate reviews waiting for your stake. Check back
              later or explore the leaderboard to see top performers.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.pending.map((proposal) => (
              <div
                key={proposal.id}
                className="border border-border rounded-lg p-4 hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">
                      {proposal.candidateName}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {proposal.candidateEmail}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(proposal.submittedAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center">
                        <Lock className="w-3 h-3 mr-1" />
                        Required: {proposal.requiredStake} tokens
                      </span>
                    </div>
                  </div>
                  {proposal.expertHasStaked ? (
                    <div className="flex items-center px-4 py-2 bg-green-500/10 text-green-700 dark:text-green-300 rounded-lg border border-green-500/20">
                      <Unlock className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Staked</span>
                    </div>
                  ) : (
                    <Button onClick={() => onStakeProposal(proposal)}>
                      <Lock className="w-4 h-4 mr-2" />
                      Stake to Participate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ongoing Reviews */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Ongoing Reviews</h3>
        {proposals.ongoing.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No ongoing reviews at the moment
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.ongoing.map((proposal) => (
              <div
                key={proposal.id}
                className="border border-blue-200 bg-blue-50 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">
                      {proposal.candidateName}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {proposal.candidateEmail}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        {proposal.participantCount} participants
                      </span>
                      <span className="flex items-center text-green-600">
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        {proposal.votesFor}
                      </span>
                      <span className="flex items-center text-destructive">
                        <ThumbsDown className="w-3 h-3 mr-1" />
                        {proposal.votesAgainst}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-blue-700 font-medium">Under Review</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
