"use client";

import { useState, useEffect } from "react";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { expertApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { Shield, Loader2 } from "lucide-react";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { useAuthContext } from "@/hooks/useAuthContext";
import { toast } from "sonner";
import type {
  ReputationTimelineEntry,
  ReputationTimelineResponse,
  ExpertProfile,
  PaginationInfo,
} from "@/types";

import { ReputationScoreHero } from "./ReputationScoreHero";
import { ReputationBreakdownCards } from "./ReputationBreakdownCards";
import { RewardTierTower } from "./RewardTierTower";
import { ReputationScoreChart } from "./ReputationScoreChart";
import { HowReputationWorks } from "./HowReputationWorks";
import { ReputationTimeline } from "./ReputationTimeline";

export default function ReputationPage() {
  const { address: wagmiAddress } = useExpertAccount();
  const auth = useAuthContext();
  const address = wagmiAddress || auth.walletAddress;
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
        setProfile(result.profileRes);
        const tData = result.timelineRes.data ?? result.timelineRes;
        setTimeline(tData.items || []);
        setPagination(tData.pagination || null);
      },
      onError: () => {
        toast.error("Failed to load reputation data");
      },
    }
  );

  // eslint-disable-next-line no-restricted-syntax -- triggers re-fetch on page change (useFetch doesn't support custom deps)
  useEffect(() => {
    if (address) {
      refetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch is stable, only re-run on page/address change
  }, [page, address]);

  // eslint-disable-next-line no-restricted-syntax -- subscribing to custom DOM event for cross-component state refresh
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("vetted:reputation-refresh", handler);
    return () => window.removeEventListener("vetted:reputation-refresh", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch is stable
  }, []);

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
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-label="Loading reputation data">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const reputation = profile?.reputation ?? 0;

  return (
    <div className="min-h-full animate-page-enter">
      {/* Hero Score Section */}
      <ReputationScoreHero
        reputation={reputation}
        totalGains={totalGains}
        alignedCount={alignedCount}
        deviationCount={deviationCount}
        reviewCount={profile?.reviewCount ?? 0}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-20">
        {/* Breakdown Cards */}
        <ReputationBreakdownCards
          reputation={reputation}
          totalGains={totalGains}
          totalLosses={totalLosses}
          alignedCount={alignedCount}
          deviationCount={deviationCount}
        />

        {/* Tier Progression Tower */}
        <RewardTierTower reputation={reputation} />

        {/* Score History Chart */}
        <ReputationScoreChart timeline={timeline} reputation={reputation} />

        {/* How It Works */}
        <HowReputationWorks />

        {/* Recent Impact Timeline */}
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
