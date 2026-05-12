"use client";

import { useState, useCallback } from "react";
import {
  guildApplicationsApi,
  expertApi,
  blockchainApi,
  commitRevealApi,
  candidateApi,
  extractApiError,
} from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { toast } from "sonner";
import type {
  GuildApplication,
  VoteHistoryItem,
  CandidateProfile,
  ExpertProfile,
  GuildStakeInfo,
} from "@/types";

type CommitRevealPhaseType = "direct" | "commit" | "finalized";

export interface CommitRevealPhase {
  phase: CommitRevealPhaseType;
  commitDeadline?: string;
  commitCount?: number;
  totalExpected?: number;
  userCommitted?: boolean;
  blockchainSessionId?: string;
  blockchainSessionCreated?: boolean;
}

interface VotingApplicationData {
  application: GuildApplication | null;
  expertData: ExpertProfile | null;
  candidateProfile: CandidateProfile | null;
  isStakedInGuild: boolean;
  crPhase: CommitRevealPhase | null;
  voteHistory: VoteHistoryItem[];
  votesError: string | null;
  loading: boolean;
  loadPhaseStatus: () => Promise<void>;
  loadApplication: () => Promise<void>;
}

export function useVotingApplicationData(
  applicationId: string,
  address: string | undefined
): VotingApplicationData {
  // State for data that gets refreshed after user actions (commit/reveal/vote)
  const [application, setApplication] = useState<GuildApplication | null>(null);
  const [crPhase, setCrPhase] = useState<CommitRevealPhase | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteHistoryItem[]>([]);
  const [votesError, setVotesError] = useState<string | null>(null);

  /* -- initial data fetching (cascade) -- */
  const { data: initialData, isLoading: loading } = useFetch(
    async () => {
      // 1. Fetch expert profile + guild stakes + CR phase in parallel (independent calls)
      const [expert, guildStakes, phase] = await Promise.all([
        address
          ? expertApi.getProfile(address).catch(() => null)
          : Promise.resolve(null),
        address
          ? blockchainApi.getExpertGuildStakes(address).catch((): GuildStakeInfo[] => [])
          : Promise.resolve([] as GuildStakeInfo[]),
        commitRevealApi.getPhaseStatus(applicationId).catch(() => null),
      ]);

      // 2. Fetch application details (depends on expert ID for vote context)
      const app = await guildApplicationsApi.getDetails(
        applicationId,
        expert?.id
      );

      // 3. Fetch candidate profile + vote history in parallel (depend on application)
      const shouldFetchVotes = app.status === "approved" || app.status === "rejected";
      const [candidate, votesResult] = await Promise.all([
        app.candidateId
          ? candidateApi.getById(app.candidateId).catch(() => null)
          : Promise.resolve(null),
        shouldFetchVotes
          ? guildApplicationsApi
              .getVotes(applicationId)
              .then((votes) => ({ votes, error: null as string | null }))
              .catch((err: unknown) => ({
                votes: [] as VoteHistoryItem[],
                error: extractApiError(err, "Couldn't load vote history"),
              }))
          : Promise.resolve({ votes: [] as VoteHistoryItem[], error: null as string | null }),
      ]);

      return { expert, guildStakes, phase, app, candidate, votesResult };
    },
    {
      onSuccess: (result) => {
        if (!result) return;
        setApplication(result.app as unknown as GuildApplication);
        setCrPhase(result.phase as CommitRevealPhase | null);
        setVoteHistory(result.votesResult.votes);
        setVotesError(result.votesResult.error);
        if (result.votesResult.error) {
          toast.error(result.votesResult.error);
        }
      },
      onError: (error) => {
        toast.error(error || "Failed to load application");
      },
    }
  );

  const expertData = initialData?.expert ?? null;
  const candidateProfile = initialData?.candidate ?? null;

  // Derive per-guild staking status
  const isStakedInGuild = (() => {
    if (!application || !initialData?.guildStakes) return false;
    return initialData.guildStakes.some(
      (s) => s.guildId === application.guild_id && parseFloat(s.stakedAmount) > 0
    );
  })();

  /* -- reload helpers for user-triggered refreshes -- */
  const loadPhaseStatus = useCallback(async () => {
    try {
      const response = await commitRevealApi.getPhaseStatus(applicationId);
      setCrPhase(response as CommitRevealPhase);
    } catch {
      /* not commit-reveal */
    }
  }, [applicationId]);

  const loadApplication = useCallback(async () => {
    try {
      const response = await guildApplicationsApi.getDetails(
        applicationId,
        expertData?.id
      );
      setApplication(response as unknown as GuildApplication);
      if (response.status === "approved" || response.status === "rejected") {
        try {
          const votes = await guildApplicationsApi.getVotes(applicationId);
          setVoteHistory(votes);
          setVotesError(null);
        } catch (votesErr: unknown) {
          const message = extractApiError(votesErr, "Couldn't load vote history");
          setVotesError(message);
          toast.error(message);
        }
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load application"
      );
    }
  }, [applicationId, expertData]);

  return {
    application,
    expertData,
    candidateProfile,
    isStakedInGuild,
    crPhase,
    voteHistory,
    votesError,
    loading,
    loadPhaseStatus,
    loadApplication,
  };
}
