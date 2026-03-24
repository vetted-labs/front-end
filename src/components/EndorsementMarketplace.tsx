"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useSwitchChain } from "wagmi";
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
import type { EndorsementApplication } from "@/types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Coins,
  Users,
  AlertCircle,
  Sparkles,
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
import { WalletStatusBanner } from "./endorsements/WalletStatusBanner";
import { EndorsementStatsGrid } from "./endorsements/EndorsementStatsGrid";
import { MyActiveEndorsements } from "./endorsements/MyActiveEndorsements";

interface EndorsementMarketplaceProps {
  guildId: string;
  guildName: string;
  blockchainGuildId?: `0x${string}`;
  initialApplicationId?: string;
}

export function EndorsementMarketplace({ guildId, guildName, blockchainGuildId: blockchainGuildIdProp, initialApplicationId }: EndorsementMarketplaceProps) {
  const { address, isConnected, chain } = useAccount();
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

  // Auto-open endorsement modal when navigated with ?applicationId=
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

  // Auto-refresh wallet/endorsement data when user returns to the tab
  // (applications already re-fetch when guildId changes via useFetch)
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
      <Card className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md">
        <CardContent className="p-12 text-center">
          <Coins className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
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

  // Only show loading on initial load — never unmount mid-transaction.
  // useFetch/usePaginatedFetch set isLoading=true on refetch too, which would
  // destroy in-flight transaction state (txHash, txStep, etc.) if we returned null.
  if ((loading || endorsementsLoading) && address && !transactionModalOpen && txStep === "idle") {
    return null;
  }

  const isOnSepolia = chain?.id === sepolia.id;
  const BACKEND_WALLET = process.env.NEXT_PUBLIC_BACKEND_WALLET || "0x5b3141560e335f813047CFCB5D209fc8312B80c5";
  const isBackendWallet = address?.toLowerCase() === BACKEND_WALLET.toLowerCase();

  return (
    <div className="min-h-screen space-y-6 animate-page-enter">
      <WalletStatusBanner
        isBackendWallet={isBackendWallet}
        backendWalletAddress={BACKEND_WALLET}
        isOnSepolia={isOnSepolia}
        chainName={chain?.name}
        address={address!}
        shortAddress={shortAddress}
        formattedBalance={formattedBalance}
        onSwitchToSepolia={() => switchChain({ chainId: sepolia.id })}
      />

      {!meetsMinimumStake && (
        <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-muted-foreground">
              You need to stake at least <strong className="text-foreground">{requiredStake} VETD</strong> in this guild to endorse applications.
              Current stake: {parseFloat(userStake).toFixed(2)} VETD
            </p>
          </CardContent>
        </Card>
      )}

      {/* Header Stats */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Endorsement Dashboard
        </h2>
      </div>

      <EndorsementStatsGrid
        userStake={userStake}
        userEndorsementsCount={userEndorsements.length}
        applicationsCount={applicationsTotalItems}
        minimumBid={minimumBidFormatted}
      />

      <MyActiveEndorsements
        userEndorsements={userEndorsements}
        allUserEndorsements={allUserEndorsements}
        guildName={guildName}
        onSelectEndorsement={(applicationForModal) => {
          setSelectedApp(applicationForModal);
          setDetailsModalOpen(true);
        }}
      />

      {/* Applications List */}
      <Card className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Users className="w-4 h-4" />
            Applications in {guildName}
          </CardTitle>
          <CardDescription>
            Endorse candidates you believe will succeed. Top 3 endorsers earn rewards when candidate is hired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicationsGrid
            applications={applications ?? []}
            loading={loading}
            onSelectApplication={handleViewDetails}
            onQuickEndorse={meetsMinimumStake ? handleQuickEndorse : undefined}
          />
          <PaginationNav
            page={applicationsPage}
            totalPages={applicationsTotalPages}
            onPageChange={setApplicationsPage}
            className="mt-6"
          />
        </CardContent>
      </Card>

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
