"use client";
import { useState, useEffect, useRef } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { formatEther, keccak256, toBytes } from "viem";
import { sepolia } from "wagmi/chains";
import {
  useGuildStaking,
  useMyActiveEndorsements,
} from "@/lib/hooks/useVettedContracts";
import { useEndorsementTransaction } from "@/lib/hooks/useEndorsementTransaction";
import type { EndorsableApplication } from "@/lib/hooks/useEndorsementTransaction";
import { apiRequest } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
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
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { ApplicationsGrid } from "./endorsements/ApplicationsGrid";

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
  initialApplicationId?: string;
}

export function EndorsementMarketplace({ guildId, guildName, initialApplicationId }: EndorsementMarketplaceProps) {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [selectedApp, setSelectedApp] = useState<EndorsementApplication | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);

  // Track whether we've already auto-opened the modal for initialApplicationId
  const hasAutoOpened = useRef(false);

  // Use backend API to get user's endorsements (more reliable than blockchain)
  const { endorsements: allUserEndorsements, isLoading: endorsementsLoading, refetch: refetchEndorsements } = useMyActiveEndorsements();

  // Load applications via useFetch
  const { data: applications, isLoading: loading, refetch: reloadApplications } = useFetch<EndorsementApplication[]>(
    async () => {
      if (!guildId || !address) return [];
      const response = await apiRequest<EndorsementApplication[]>(
        `/api/blockchain/endorsements/applications/${guildId}?expert_address=${address}`
      );
      return Array.isArray(response) ? response : [];
    },
    {
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

  const blockchainGuildId = guildId ? keccak256(toBytes(guildId)) as `0x${string}` : undefined;
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

  const handleRefresh = () => {
    reloadApplications();
    refetchEndorsements();
    refetchTokenData();
    toast.success("Data refreshed");
  };

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

  if (!meetsMinimumStake) {
    return (
      <Card className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md">
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
          <h3 className="text-lg font-semibold mb-2">Insufficient Stake</h3>
          <p className="text-muted-foreground mb-2">
            You need to stake at least {requiredStake} VETD tokens before you can endorse applications
          </p>
          <p className="text-sm text-muted-foreground">
            Current stake: {parseFloat(userStake).toFixed(2)} VETD
          </p>
        </CardContent>
      </Card>
    );
  }

  // Only show loading if we have an address and are actually loading
  if ((loading || endorsementsLoading) && address) {
    return null;
  }

  const isOnSepolia = chain?.id === sepolia.id;
  const BACKEND_WALLET = process.env.NEXT_PUBLIC_BACKEND_WALLET || "0x8E65c02633C89c80b8F1D1E8EdEd926A15e1C3f0";
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

      {/* Header Stats */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Endorsement Dashboard
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </Button>
      </div>

      <EndorsementStatsGrid
        userStake={userStake}
        userEndorsementsCount={userEndorsements.length}
        applicationsCount={(applications ?? []).length}
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
            onQuickEndorse={handleQuickEndorse}
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
        onEndorseCandidate={handleEndorseFromDetails}
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
        topBids={[]}
        txStep={txStep}
        txError={txError}
        approvalTxHash={approvalTxHash}
        bidTxHash={bidTxHash}
      />
    </div>
  );
}
