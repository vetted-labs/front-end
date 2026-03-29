"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSwitchChain } from "wagmi";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { formatEther } from "viem";
import { hashToBytes32 } from "@/lib/blockchain";
import { sepolia } from "wagmi/chains";
import {
  useGuildStaking,
  useMyActiveEndorsements,
} from "@/lib/hooks/useVettedContracts";
import { useEndorsementTransaction } from "@/lib/hooks/useEndorsementTransaction";
import type { EndorsableApplication } from "@/lib/hooks/useEndorsementTransaction";
import { blockchainApi } from "@/lib/api";
import { usePaginatedFetch } from "@/lib/hooks/usePaginatedFetch";
import type { EndorsementApplication, GuildRecord } from "@/types";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Coins,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { ApplicationsGrid } from "./endorsements/ApplicationsGrid";
import { PaginationNav } from "@/components/ui/pagination-nav";

const CandidateDetailsModal = dynamic(
  () => import("./endorsements/CandidateDetailsModal").then(m => ({ default: m.CandidateDetailsModal })),
  { ssr: false }
);
const EndorsementTransactionModal = dynamic(
  () => import("./endorsements/EndorsementTransactionModal").then(m => ({ default: m.EndorsementTransactionModal })),
  { ssr: false }
);
import { EndorsementHeader } from "./endorsements/EndorsementHeader";
import { MyActiveEndorsements } from "./endorsements/MyActiveEndorsements";
import { STATUS_COLORS } from "@/config/colors";
import { SkeletonCard, Skeleton } from "@/components/ui/skeleton";
import { DataSection } from "@/lib/motion";

interface EndorsementMarketplaceProps {
  guildId: string;
  guildName: string;
  blockchainGuildId?: `0x${string}`;
  initialApplicationId?: string;
  guilds: GuildRecord[];
  selectedGuildId: string | undefined;
  onGuildChange: (guildId: string) => void;
}

export function EndorsementMarketplace({ guildId, guildName, blockchainGuildId: blockchainGuildIdProp, initialApplicationId, guilds, selectedGuildId, onGuildChange }: EndorsementMarketplaceProps) {
  const { address, isConnected, chain } = useExpertAccount();
  const { switchChain } = useSwitchChain();
  const [selectedApp, setSelectedApp] = useState<EndorsementApplication | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);

  // Track whether we've already auto-opened the modal for initialApplicationId
  const hasAutoOpened = useRef(false);

  // Use backend API to get user's endorsements (more reliable than blockchain)
  const { endorsements: allUserEndorsements, isLoading: endorsementsLoading, refetch: refetchEndorsements } = useMyActiveEndorsements();

  // Load applications with server-side pagination
  const APPS_PER_PAGE = 12;
  const fetchApplications = useCallback(
    async (page: number, limit: number) => {
      if (!guildId || !address) return { data: [] as EndorsementApplication[], total: 0 };
      const response = await blockchainApi.getApplicationsForEndorsement(guildId, address, page, limit);
      return { data: response.data ?? [], total: response.total ?? 0 };
    },
    [guildId, address]
  );
  const {
    data: applications,
    isLoading: loading,
    refetch: reloadApplications,
    page: applicationsPage,
    totalPages: applicationsTotalPages,
    totalItems: applicationsTotalItems,
    setPage: setApplicationsPage,
  } = usePaginatedFetch<EndorsementApplication>(
    fetchApplications,
    {
      limit: APPS_PER_PAGE,
      skip: !guildId || !address,
      onError: (error) => {
        toast.error(error || "Failed to load applications");
      },
    }
  );

  // Transaction hook -- encapsulates approval + bid flow, tx tracking, error handling
  const {
    txStep,
    txError,
    approvalTxHash,
    bidTxHash,
    balance,
    minimumBidFormatted,
    submitEndorsement,
    resetTransaction,
    refetchTokenData,
  } = useEndorsementTransaction({
    reloadApplications,
    refetchEndorsements,
  });

  // Use the on-chain guild ID from the API if available; fall back to local hash
  const blockchainGuildId = blockchainGuildIdProp ?? (guildId ? hashToBytes32(guildId) : undefined);
  const { stakeInfo, minimumStake } = useGuildStaking(blockchainGuildId);

  // Filter endorsements for current guild
  const userEndorsements = allUserEndorsements.filter((e) => e.guild?.id === guildId);

  // eslint-disable-next-line no-restricted-syntax -- runtime deps: auto-open modal once applications finish loading with a matching applicationId
  useEffect(() => {
    if (
      initialApplicationId &&
      !hasAutoOpened.current &&
      (applications ?? []).length > 0 &&
      !loading
    ) {
      const targetApp = (applications ?? []).find(
        (app) => app.application_id === initialApplicationId
      );
      if (targetApp) {
        hasAutoOpened.current = true;
        setSelectedApp(targetApp);
        setTransactionModalOpen(true);
      }
    }
  }, [initialApplicationId, applications, loading]);

  // ── Modal handlers ──

  const handleViewDetails = (application: EndorsementApplication) => {
    setSelectedApp(application);
    setDetailsModalOpen(true);
  };

  const handleQuickEndorse = (application: EndorsementApplication) => {
    setSelectedApp(application);
    setTransactionModalOpen(true);
  };

  const handleEndorseFromDetails = (application: EndorsementApplication) => {
    setDetailsModalOpen(false);
    setSelectedApp(application);
    setTransactionModalOpen(true);
  };

  const handleCloseTransactionModal = () => {
    if (txStep !== "approving" && txStep !== "bidding") {
      setTransactionModalOpen(false);
      setSelectedApp(null);
      resetTransaction();
    }
  };

  const handlePlaceEndorsement = async (app: EndorsableApplication, amount: string) => {
    await submitEndorsement(app, amount);
  };

  // eslint-disable-next-line no-restricted-syntax -- DOM visibilitychange subscription with runtime callback deps
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refetchEndorsements();
        refetchTokenData();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetchEndorsements, refetchTokenData]);

  // eslint-disable-next-line no-restricted-syntax -- subscribing to custom DOM event for cross-component state refresh
  useEffect(() => {
    const handler = () => refetchEndorsements();
    window.addEventListener("vetted:endorsement-refresh", handler);
    return () => window.removeEventListener("vetted:endorsement-refresh", handler);
  }, [refetchEndorsements]);

  // ── Early returns ──

  if (!isConnected) {
    return (
      <Card className="rounded-xl border border-border bg-card">
        <CardContent className="p-12 text-center">
          <Coins className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">
            Please connect your wallet to view and endorse applications
          </p>
        </CardContent>
      </Card>
    );
  }

  const userStake = stakeInfo ? formatEther(stakeInfo[0]) : "0";
  const requiredStake = minimumStake ? formatEther(minimumStake) : "0";
  const meetsMinimumStake = parseFloat(userStake) >= parseFloat(requiredStake);
  const shortAddress = address ? `${address.substring(0, 6)}...${address.substring(38)}` : "";
  const formattedBalance = balance
    ? parseFloat(formatEther(balance)).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : null;

  const isOnSepolia = chain?.id === sepolia.id;

  return (
    <div className="min-h-screen space-y-6">
      <EndorsementHeader
        address={address!}
        shortAddress={shortAddress}
        formattedBalance={formattedBalance}
        isOnSepolia={isOnSepolia}
        chainName={chain?.name}
        onSwitchToSepolia={() => switchChain({ chainId: sepolia.id })}
        guilds={guilds}
        selectedGuildId={selectedGuildId}
        onGuildChange={onGuildChange}
        totalEndorsementsCount={allUserEndorsements.length}
        userEndorsementsCount={userEndorsements.length}
        applicationsCount={applicationsTotalItems}
        userStake={userStake}
      />

      {!meetsMinimumStake && (
        <Card className={`rounded-xl border ${STATUS_COLORS.warning.border} ${STATUS_COLORS.warning.bgSubtle}`}>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className={`w-5 h-5 ${STATUS_COLORS.warning.icon} shrink-0`} />
            <p className="text-sm text-muted-foreground">
              You need to stake at least <strong className="text-foreground">{requiredStake} VETD</strong> in this guild to endorse applications.
              Current stake: {parseFloat(userStake).toFixed(2)} VETD
            </p>
          </CardContent>
        </Card>
      )}

      <DataSection
        isLoading={endorsementsLoading}
        skeleton={
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-xl tracking-tight flex items-center gap-3">
                Your Active Endorsements
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              <SkeletonCard className="flex-none w-[340px]" />
              <SkeletonCard className="flex-none w-[340px]" />
            </div>
          </div>
        }
      >
        <MyActiveEndorsements
          userEndorsements={userEndorsements}
          allUserEndorsements={allUserEndorsements}
          guildName={guildName}
          onSelectEndorsement={(applicationForModal) => {
            setSelectedApp(applicationForModal);
            setDetailsModalOpen(true);
          }}
        />
      </DataSection>

      {/* Available Applications */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="font-display font-bold text-xl tracking-tight">
            Available Applications
          </h2>
          <div className="flex items-center gap-3">
            {loading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span className="font-mono text-xs text-muted-foreground">
                <span className="text-muted-foreground font-medium">{applicationsTotalItems}</span> applications
              </span>
            )}
          </div>
        </div>
        <ApplicationsGrid
          applications={applications ?? []}
          loading={loading}
          onSelectApplication={handleViewDetails}
          onQuickEndorse={meetsMinimumStake ? handleQuickEndorse : undefined}
        />
        {!loading && (
          <PaginationNav
            page={applicationsPage}
            totalPages={applicationsTotalPages}
            onPageChange={setApplicationsPage}
            className="mt-6"
          />
        )}
      </div>

      {/* Candidate Details Modal */}
      <CandidateDetailsModal
        application={selectedApp}
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedApp(null);
        }}
        onEndorseCandidate={meetsMinimumStake ? handleEndorseFromDetails : undefined}
      />

      {/* Endorsement Transaction Modal */}
      <EndorsementTransactionModal
        application={selectedApp}
        isOpen={transactionModalOpen}
        onClose={handleCloseTransactionModal}
        userBalance={balance ? formatEther(balance) : "0"}
        userStake={userStake}
        minimumBid={minimumBidFormatted}
        onPlaceEndorsement={handlePlaceEndorsement}
        txStep={txStep}
        txError={txError}
        approvalTxHash={approvalTxHash}
        bidTxHash={bidTxHash}
      />
    </div>
  );
}
