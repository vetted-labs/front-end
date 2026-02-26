"use client";

import { useState, useCallback } from "react";
import {
  guildApplicationsApi,
  expertApi,
  blockchainApi,
  commitRevealApi,
  candidateApi,
} from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { toast } from "sonner";
import type {
  GuildApplication,
  VoteHistoryItem,
  CandidateProfile,
  ExpertProfile,
  StakeBalance,
} from "@/types";

type CommitRevealPhaseType = "direct" | "commit" | "reveal" | "finalized";

export interface CommitRevealPhase {
  phase: CommitRevealPhaseType;
  commitDeadline?: string;
  revealDeadline?: string;
  commitCount?: number;
  revealCount?: number;
  totalExpected?: number;
  userCommitted?: boolean;
  userRevealed?: boolean;
}

interface VotingApplicationData {
  application: GuildApplication | null;
  expertData: ExpertProfile | null;
  candidateProfile: CandidateProfile | null;
  stakingStatus: StakeBalance | null;
  crPhase: CommitRevealPhase | null;
  voteHistory: VoteHistoryItem[];
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

  /* -- initial data fetching (cascade) -- */
  const { data: initialData, isLoading: loading } = useFetch(
    async () => {
      // 1. Fetch expert profile + staking status + CR phase in parallel (independent calls)
      const [expert, staking, phase] = await Promise.all([
        address
          ? expertApi.getProfile(address).catch(() => null)
          : Promise.resolve(null),
        address
          ? blockchainApi.getStakeBalance(address).catch(() => null)
          : Promise.resolve(null),
        commitRevealApi.getPhaseStatus(applicationId).catch(() => null),
      ]);

      // 2. Fetch application details (depends on expert ID for vote context)
      const app = await guildApplicationsApi.getDetails(
        applicationId,
        expert?.id
      );

      // 3. Fetch candidate profile + vote history in parallel (depend on application)
      const [candidate, votes] = await Promise.all([
        app.candidate_id
          ? candidateApi.getById(app.candidate_id).catch(() => null)
          : Promise.resolve(null),
        app.finalized
          ? guildApplicationsApi.getVotes(applicationId).catch(() => [])
          : Promise.resolve([]),
      ]);

      return { expert, staking, phase, app, candidate, votes };
    },
    {
      onSuccess: (result) => {
        if (!result) return;
        setApplication(result.app);
        setCrPhase(result.phase as CommitRevealPhase | null);
        setVoteHistory(result.votes);
      },
      onError: (error) => {
        toast.error(error || "Failed to load application");
      },
    }
  );

  const expertData = initialData?.expert ?? null;
  const candidateProfile = initialData?.candidate ?? null;
  const stakingStatus = initialData?.staking ?? null;

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
      setApplication(response);
      if (response.finalized) {
        const votes = await guildApplicationsApi
          .getVotes(applicationId)
          .catch(() => []);
        setVoteHistory(votes);
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load application"
      );
    }
  }, [applicationId, expertData?.id]);

  return {
    application,
    expertData,
    candidateProfile,
    stakingStatus,
    crPhase,
    voteHistory,
    loading,
    loadPhaseStatus,
    loadApplication,
  };
}
