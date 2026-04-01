"use client";

import { useState, useEffect } from "react";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { expertApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { Shield } from "lucide-react";
import { Skeleton, SkeletonStatCard } from "@/components/ui/skeleton";
import { DataSection } from "@/lib/motion";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { useAuthContext } from "@/hooks/useAuthContext";
import { toast } from "sonner";
import { REPUTATION_DECAY_CYCLE_DAYS } from "@/config/constants";
import { STATUS_COLORS } from "@/config/colors";
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

function getDaysUntilDecay(recentActivity: Array<{ timestamp: string }> | undefined): number | null {
  if (!recentActivity?.length) return 0;
  const timestamps = recentActivity
    .map((a) => new Date(a.timestamp).getTime())
    .filter((t) => !isNaN(t));
  if (timestamps.length === 0) return 0;
  const mostRecent = Math.max(...timestamps);
  const decayDate = mostRecent + REPUTATION_DECAY_CYCLE_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((decayDate - Date.now()) / (24 * 60 * 60 * 1000)));
}

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

  const reputation = profile?.reputation ?? 0;
  const daysUntilDecay = getDaysUntilDecay(profile?.recentActivity);

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Hero Score Section */}
      <DataSection
        isLoading={loading}
        skeleton={
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex gap-4">
              <Skeleton className="h-7 w-28 rounded-lg" />
            </div>
            <div className="flex items-center gap-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        }
      >
        <>
          <ReputationScoreHero
            reputation={reputation}
            totalGains={totalGains}
            alignedCount={alignedCount}
            deviationCount={deviationCount}
            reviewCount={profile?.reviewCount ?? 0}
          />
          <div className={`mt-2 text-sm ${daysUntilDecay !== null && daysUntilDecay === 0 ? STATUS_COLORS.warning.text : "text-muted-foreground"}`}>
            {daysUntilDecay !== null && daysUntilDecay > 0
              ? `Next decay check in ${daysUntilDecay} days`
              : "Inactivity decay may apply — review or vote to reset the timer"}
          </div>
        </>
      </DataSection>

      <div className="space-y-14 mt-14">
        {/* Breakdown Cards */}
        <DataSection
          isLoading={loading}
          skeleton={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonStatCard key={i} />
              ))}
            </div>
          }
        >
          <ReputationBreakdownCards
            reputation={reputation}
            totalGains={totalGains}
            totalLosses={totalLosses}
            alignedCount={alignedCount}
            deviationCount={deviationCount}
          />
        </DataSection>

        {/* Tier Progression Tower */}
        <DataSection
          isLoading={loading}
          skeleton={
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <Skeleton className="h-5 w-48 mb-2" />
              <div className="flex gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            </div>
          }
        >
          <RewardTierTower reputation={reputation} />
        </DataSection>

        {/* Score History Chart */}
        <DataSection
          isLoading={loading}
          skeleton={
            <div className="rounded-xl border border-border bg-card p-6">
              <Skeleton className="h-5 w-40 mb-4" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          }
        >
          <ReputationScoreChart timeline={timeline} reputation={reputation} />
        </DataSection>

        {/* How It Works — fully static, always rendered */}
        <HowReputationWorks />

        {/* Recent Impact Timeline */}
        <DataSection
          isLoading={loading}
          skeleton={
            <div className="space-y-3">
              <Skeleton className="h-6 w-48 mb-2" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border/40">
                  <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-md" />
                </div>
              ))}
            </div>
          }
        >
          <ReputationTimeline
            timeline={timeline}
            pagination={pagination}
            page={page}
            onPageChange={setPage}
          />
        </DataSection>
      </div>
      </div>
    </div>
  );
}
