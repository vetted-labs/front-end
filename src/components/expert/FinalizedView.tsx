"use client";

import { ApplicationFinalizationDisplay } from "@/components/ApplicationFinalizationDisplay";
import { StructuredApplicationDisplay } from "@/components/StructuredApplicationDisplay";
import type { ComponentType } from "react";
import type { GuildApplication, VoteHistoryItem, CandidateProfile } from "@/types";

interface CandidateProfileSectionProps {
  profile: CandidateProfile;
  candidateId?: string;
}

interface FinalizedViewProps {
  application: GuildApplication;
  voteHistory: VoteHistoryItem[];
  candidateProfile: CandidateProfile | null;
  wallet: string | undefined;
  CandidateProfileSection: ComponentType<CandidateProfileSectionProps>;
}

export function FinalizedView({
  application,
  voteHistory,
  candidateProfile,
  wallet,
  CandidateProfileSection,
}: FinalizedViewProps) {
  return (
    <div className="space-y-12">
      {/* Outcome banner + performance */}
      <ApplicationFinalizationDisplay
        application={application}
        myVote={
          application.my_vote_score !== undefined
            ? {
                score: application.my_vote_score,
                alignment_distance: application.alignment_distance,
                reputation_change: application.my_reputation_change,
                reward_amount: application.my_reward_amount,
              }
            : undefined
        }
        wallet={wallet}
        compact={false}
      />

      {/* Vote History */}
      {voteHistory.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
            Vote History
          </h3>
          <div className="space-y-3">
            {voteHistory.map((vote) => (
              <div
                key={vote.id}
                className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {vote.expert_name || `${vote.expert_id.slice(0, 8)}...`}
                  </p>
                  {vote.comment && (
                    <p className="text-sm text-muted-foreground mt-1 italic">
                      &quot;{vote.comment}&quot;
                    </p>
                  )}
                  {vote.alignment_distance !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Alignment: {vote.alignment_distance.toFixed(1)}
                      {vote.alignment_distance < 10
                        ? " \u2713"
                        : vote.alignment_distance > 20
                          ? " \u2717"
                          : ""}
                      {vote.reputation_change !== undefined && (
                        <>
                          {" "}
                          &middot; Rep:{" "}
                          {vote.reputation_change > 0 ? "+" : ""}
                          {vote.reputation_change}
                        </>
                      )}
                      {(vote.reward_amount ?? 0) > 0 && (
                        <>
                          {" "}
                          &middot; Reward: {vote.reward_amount!.toFixed(2)} VETD
                        </>
                      )}
                    </p>
                  )}
                </div>
                <p className="text-base font-semibold tabular-nums shrink-0">
                  {vote.score}/100
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Application content -- below results */}
      <div>
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Application
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Candidate profile section in finalized view */}
        {candidateProfile && (
          <div className="mb-10">
            <CandidateProfileSection
              profile={candidateProfile}
              candidateId={application.candidate_id}
            />
          </div>
        )}

        <StructuredApplicationDisplay
          application={application}
          compact={false}
          showHeader={false}
        />
      </div>
    </div>
  );
}
