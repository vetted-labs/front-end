"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { expertApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { Shield } from "lucide-react";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { toast } from "sonner";
import type {
  ReputationTimelineEntry,
  ExpertProfile,
  PaginationInfo,
} from "@/types";

import { ReputationScoreCards } from "./ReputationScoreCards";
import { RewardTierCard } from "./RewardTierCard";
import { HowReputationWorks } from "./HowReputationWorks";
import { ReputationTimeline } from "./ReputationTimeline";

interface ReputationTimelineResponse {
  items?: ReputationTimelineEntry[];
  pagination?: PaginationInfo;
  data?: {
    items?: ReputationTimelineEntry[];
    pagination?: PaginationInfo;
  };
}

export default function ReputationPage() {
  const { address } = useAccount();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [timeline, setTimeline] = useState<ReputationTimelineEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);

  const { isLoading: loading, refetch } = useFetch(
    async () => {
      if (!address) return null;
      const [profileRes, timelineRes] = await Promise.all([
        expertApi.getProfile(address),
        expertApi.getReputationTimeline(address, { page, limit: 15 }) as Promise<ReputationTimelineResponse>,
      ]);
      return { profileRes, timelineRes };
    },
    {
      skip: !address,
      onSuccess: (result) => {
        if (!result) return;
        setProfile(result.profileRes as ExpertProfile);
        const tData = result.timelineRes.data ?? result.timelineRes;
        setTimeline(tData.items || []);
        setPagination(tData.pagination || null);
      },
      onError: () => {
        toast.error("Failed to load reputation data");
      },
    }
  );

  // Refetch when page changes
  useEffect(() => {
    if (address) {
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
        <WalletRequiredState
          icon={Shield}
          message="Connect your wallet to view reputation"
        />
      </div>
    );
  }

  if (loading) {
    return null;
  }

  const reputation = profile?.reputation ?? 0;

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
        <ReputationScoreCards
          reputation={reputation}
          totalGains={totalGains}
          totalLosses={totalLosses}
          alignedCount={alignedCount}
          deviationCount={deviationCount}
        />

        {/* Reward Tier */}
        <RewardTierCard reputation={reputation} />

        {/* How It Works */}
        <HowReputationWorks />

        {/* Timeline */}
        <ReputationTimeline
          timeline={timeline}
          pagination={pagination}
          page={page}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
