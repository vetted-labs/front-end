"use client";

import { guildAppealApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { AppealSubmissionForm } from "@/components/guild/AppealSubmissionForm";
import { AppealStatusBanner } from "@/components/guild/AppealStatusBanner";
import type { GuildApplicationAppeal } from "@/types";

interface ApplicationFinalizationDisplayProps {
  application: {
    id: string;
    finalized: boolean;
    outcome?: "approved" | "rejected";
    status?: string;
    consensus_score?: number;
    vote_count?: number;
    assigned_reviewer_count?: number;
    guild_id?: string;
    guild_name?: string;
    candidate_name?: string;
    iqr?: {
      median: number;
      q1: number;
      q3: number;
      iqr: number;
      includedCount: number;
      excludedCount: number;
    };
  };
  myVote?: {
    score: number;
    alignment_distance?: number;
    reputation_change?: number;
    reward_amount?: number;
    slashing_tier?: string;
    slash_percent?: number;
  };
  /** Wallet address of the expert viewing (enables appeal functionality) */
  wallet?: string;
  compact?: boolean;
}

export function ApplicationFinalizationDisplay({
  application,
  myVote,
  wallet,
  compact = false,
}: ApplicationFinalizationDisplayProps) {
  // Derive outcome from status if outcome isn't set explicitly
  const outcome = application.outcome
    ?? (application.status === "approved" ? "approved" : application.status === "rejected" ? "rejected" : undefined);

  const { data: appeal, isLoading: appealLoading, refetch: refetchAppeal } = useFetch<GuildApplicationAppeal | null>(
    () => guildAppealApi.getAppealByApplication(application.id),
    { skip: !application.finalized || outcome !== "rejected" }
  );
  const appealLoaded = !appealLoading;

  if (!application.finalized) {
    return null;
  }

  const isApproved = outcome === "approved";
  const consensusScore = application.consensus_score || 0;
  const voteCount = application.vote_count || 0;

  if (compact) {
    return (
      <div className={`border-l-4 ${isApproved ? "border-l-green-500" : "border-l-red-500"} bg-card border border-border rounded-xl p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`font-bold ${isApproved ? "text-green-500" : "text-red-500"}`}>
              {isApproved ? "Approved" : "Rejected"}
            </p>
            <p className="text-sm text-muted-foreground">
              Consensus: {consensusScore.toFixed(1)}/100
            </p>
          </div>
          {myVote && myVote.alignment_distance !== undefined && (
            <div className="text-right">
              <p className={`text-sm font-medium ${myVote.alignment_distance < 10 ? "text-green-500" : "text-red-500"}`}>
                {myVote.alignment_distance < 10 ? "High" : "Low"} Alignment
              </p>
              {myVote.reputation_change !== undefined && (
                <p className="text-sm text-muted-foreground">
                  {myVote.reputation_change > 0 ? "+" : ""}{myVote.reputation_change} Rep
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const alignmentColor = myVote?.alignment_distance !== undefined
    ? myVote.alignment_distance < 10
      ? "text-green-500"
      : myVote.alignment_distance > 20
      ? "text-red-500"
      : "text-amber-500"
    : "";

  const alignmentText = myVote?.alignment_distance !== undefined
    ? myVote.alignment_distance < 10
      ? "High alignment \u2014 your score was close to the consensus. You\u2019ve earned reputation and VETD rewards."
      : myVote.alignment_distance > 20
      ? "Low alignment \u2014 your score diverged significantly from the consensus. This may result in a reputation penalty."
      : "Moderate alignment \u2014 your score was somewhat close to the consensus. Minor reputation impact."
    : "";

  return (
    <div className="space-y-6">
      {/* Outcome Banner */}
      <div className={`border-l-4 ${isApproved ? "border-l-green-500" : "border-l-red-500"} bg-card border border-border rounded-xl p-6`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold mb-1">
              Application {isApproved ? "Approved" : "Rejected"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Voting concluded &middot; {voteCount} reviewers
            </p>
            {application.iqr && (
              <p className="text-sm text-muted-foreground mt-1">
                Median {application.iqr.median.toFixed(1)} &middot; Q1&ndash;Q3 {application.iqr.q1.toFixed(1)}&ndash;{application.iqr.q3.toFixed(1)} &middot; IQR {application.iqr.iqr.toFixed(1)}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-4xl font-bold tabular-nums">{consensusScore.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">/ 100</p>
          </div>
        </div>
      </div>

      {/* Appeal Section (rejected applications) */}
      {!isApproved && appealLoaded && (
        <>
          {appeal ? (
            <AppealStatusBanner appeal={appeal} />
          ) : wallet ? (
            <AppealSubmissionForm
              applicationId={application.id}
              applicationType="proposal"
              applicationName={application.candidate_name ?? "Unknown Candidate"}
              guildName={application.guild_name ?? ""}
              guildId={application.guild_id}
              wallet={wallet}
              onSuccess={() => {
                refetchAppeal();
              }}
            />
          ) : null}
        </>
      )}

      {/* My Performance */}
      {myVote && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Your Performance
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between items-baseline">
              <dt className="text-sm text-muted-foreground">Score</dt>
              <dd className="text-base font-semibold tabular-nums">{myVote.score}/100</dd>
            </div>
            {myVote.alignment_distance !== undefined && (
              <div className="flex justify-between items-baseline">
                <dt className="text-sm text-muted-foreground">Alignment</dt>
                <dd className="text-base font-semibold tabular-nums">
                  {myVote.alignment_distance.toFixed(1)}
                  {myVote.alignment_distance < 10 ? " \u2713" : myVote.alignment_distance > 20 ? " \u2717" : ""}
                </dd>
              </div>
            )}
            {myVote.reputation_change !== undefined && (
              <div className="flex justify-between items-baseline">
                <dt className="text-sm text-muted-foreground">Rep Change</dt>
                <dd className={`text-base font-semibold tabular-nums ${
                  myVote.reputation_change > 0 ? "text-green-500" : myVote.reputation_change < 0 ? "text-red-500" : ""
                }`}>
                  {myVote.reputation_change > 0 ? "+" : ""}{myVote.reputation_change}
                </dd>
              </div>
            )}
            {myVote.reward_amount !== undefined && myVote.reward_amount > 0 && (
              <div className="flex justify-between items-baseline">
                <dt className="text-sm text-muted-foreground">Reward</dt>
                <dd className="text-base font-semibold tabular-nums">{myVote.reward_amount.toFixed(2)} VETD</dd>
              </div>
            )}
            {myVote.slashing_tier && (
              <div className="flex justify-between items-baseline">
                <dt className="text-sm text-muted-foreground">Tier</dt>
                <dd className={`text-base font-semibold ${
                  myVote.slashing_tier === "aligned" ? "text-green-500"
                    : myVote.slashing_tier === "mild" ? "text-amber-500"
                    : myVote.slashing_tier === "moderate" ? "text-orange-500"
                    : "text-red-500"
                }`}>
                  {myVote.slashing_tier}
                  {myVote.slash_percent !== undefined && myVote.slash_percent > 0 && (
                    <span className="text-sm text-red-500 ml-2">-{myVote.slash_percent}%</span>
                  )}
                </dd>
              </div>
            )}
          </dl>
          {/* Alignment explanation */}
          {myVote.alignment_distance !== undefined && (
            <p className={`text-sm mt-4 ${alignmentColor}`}>{alignmentText}</p>
          )}
        </div>
      )}
    </div>
  );
}
