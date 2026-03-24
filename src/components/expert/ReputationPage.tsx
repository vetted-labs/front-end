"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { expertApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { Shield, Loader2, HelpCircle, ChevronUp, ChevronDown } from "lucide-react";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { useAuthContext } from "@/hooks/useAuthContext";
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
  const { address: wagmiAddress } = useAccount();
  const auth = useAuthContext();
  const address = wagmiAddress || auth.walletAddress;
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [timeline, setTimeline] = useState<ReputationTimelineEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [showExplainer, setShowExplainer] = useState(false);

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
  }, [page, address, refetch]);

  // eslint-disable-next-line no-restricted-syntax -- subscribing to custom DOM event for cross-component state refresh
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("vetted:reputation-refresh", handler);
    return () => window.removeEventListener("vetted:reputation-refresh", handler);
  }, [refetch]);

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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
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

        {/* Reputation Calculation Explainer */}
        <div className="rounded-lg border bg-muted/30 p-3 mb-6">
          <button
            onClick={() => setShowExplainer(!showExplainer)}
            className="flex items-center gap-2 text-sm font-medium w-full text-left"
            aria-expanded={showExplainer}
          >
            <HelpCircle className="h-4 w-4 text-primary" />
            How is reputation calculated?
            {showExplainer ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </button>
          {showExplainer && (
            <div className="mt-3 pl-6 space-y-2 text-sm text-muted-foreground">
              <p>Your reputation score changes based on your actions:</p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-mono text-xs">+1</span>
                  <span>Vote aligned with majority consensus</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-mono text-xs">+2</span>
                  <span>Successful endorsement (candidate hired)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-600 font-mono text-xs">-2</span>
                  <span>Vote against majority consensus</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-600 font-mono text-xs">-2</span>
                  <span>Poor endorsement outcome</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-600 font-mono text-xs">-1</span>
                  <span>Inactivity (missed review deadlines)</span>
                </li>
              </ul>
              <p className="text-xs mt-2">Note: Actual values may vary. Check with your guild for specific scoring rules.</p>
            </div>
          )}
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
