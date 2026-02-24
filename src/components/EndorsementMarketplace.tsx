"use client";
import { useState, useEffect, useRef } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { formatEther, keccak256, toBytes } from "viem";
import { sepolia } from "wagmi/chains";
import {
  useVettedToken,
  useEndorsementBidding,
  useGuildStaking,
  useTransactionConfirmation,
  useMyActiveEndorsements,
} from "@/lib/hooks/useVettedContracts";
import { CONTRACT_ADDRESSES } from "@/contracts/abis";
import { apiRequest } from "@/lib/api";
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
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ApplicationsGrid } from "./endorsements/ApplicationsGrid";
import { CandidateDetailsModal } from "./endorsements/CandidateDetailsModal";
import { EndorsementTransactionModal } from "./endorsements/EndorsementTransactionModal";
import { WalletStatusBanner } from "./endorsements/WalletStatusBanner";
import { EndorsementStatsGrid } from "./endorsements/EndorsementStatsGrid";
import { MyActiveEndorsements } from "./endorsements/MyActiveEndorsements";

interface Application {
  application_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_headline: string;
  candidate_wallet: string;
  job_id: string;
  job_title: string;
  company_name: string;
  guild_score: number;
  location: string;
  job_type: string;
  salary_min: number;
  salary_max: number;
  applied_at: string;
  current_bid?: string; // User's current bid on this application
  rank?: number; // User's rank among endorsers (1-3 for top 3)
}

interface UserEndorsement {
  application_id: string;
  candidate_id: string;
  candidate_name: string;
  job_id: string;
  job_title: string;
  company_name: string;
  bid_amount: string;
  rank: number;
  total_endorsers: number;
  created_at: string;
}

interface EndorsementMarketplaceProps {
  guildId: string;
  guildName: string;
  initialApplicationId?: string;
}

export function EndorsementMarketplace({ guildId, guildName, initialApplicationId }: EndorsementMarketplaceProps) {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [approving, setApproving] = useState(false);
  const [endorsing, setEndorsing] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // Transaction state management
  const [txStep, setTxStep] = useState<'idle' | 'approving' | 'bidding' | 'success' | 'error'>('idle');
  const [txError, setTxError] = useState<string | null>(null);
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | undefined>();
  const [bidTxHash, setBidTxHash] = useState<`0x${string}` | undefined>();

  // Track whether we've already auto-opened the modal for initialApplicationId
  const hasAutoOpened = useRef(false);

  const { balance, endorsementAllowance, approve, refetchBalance, refetchEndorsementAllowance } = useVettedToken();
  const { placeBid, minimumBid } = useEndorsementBidding();
  const blockchainGuildId = guildId ? keccak256(toBytes(guildId)) as `0x${string}` : undefined;
  const { stakeInfo, minimumStake } = useGuildStaking(blockchainGuildId);
  const { data: txReceipt, isLoading: txPending, isSuccess: txSuccess } = useTransactionConfirmation(txHash);

  // Use backend API to get user's endorsements (more reliable than blockchain)
  const { endorsements: allUserEndorsements, isLoading: endorsementsLoading, refetch: refetchEndorsements } = useMyActiveEndorsements();

  // Filter endorsements for current guild
  const userEndorsements = allUserEndorsements.filter((e: any) => e.guild?.id === guildId);

  // Debug logging for balance
  useEffect(() => {
    if (address) {
    }
  }, [balance, address]);

  // Load applications
  useEffect(() => {
    const abortController = new AbortController();

    if (guildId && address) {
      loadApplications(abortController.signal);
    } else {
      setLoading(false);
      // Clear applications when wallet disconnects
      setApplications([]);
    }

    return () => {
      abortController.abort();
    };
  }, [guildId, address]);

  // Auto-open endorsement modal when navigated with ?applicationId=
  useEffect(() => {
    if (
      initialApplicationId &&
      !hasAutoOpened.current &&
      applications.length > 0 &&
      !loading
    ) {
      const targetApp = applications.find(
        (app) => app.application_id === initialApplicationId
      );
      if (targetApp) {
        hasAutoOpened.current = true;
        setSelectedApp(targetApp);
        setTransactionModalOpen(true);
      }
    }
  }, [initialApplicationId, applications, loading]);

  // Handle transaction success
  useEffect(() => {
    if (txSuccess && txReceipt) {

      if (approving && selectedApp) {
        // Approval confirmed, now place the bid
        setApproving(false);
        refetchEndorsementAllowance();

        // Small delay to ensure allowance is updated
        setTimeout(() => {
          handlePlaceBid(selectedApp, bidAmount);
        }, 1000);
      } else if (endorsing) {
        // Bid confirmed successfully
        setTxStep('success');
        toast.success("Endorsement confirmed! Rewards will be distributed on candidate hire.");

        setEndorsing(false);
        setBidAmount("");

        // Keep modal open to show success with transaction details
        // User can close manually

        // Reload data with delay to ensure blockchain state is updated
        setTimeout(() => {
          loadApplications();
          refetchEndorsements();
          refetchBalance();
          refetchEndorsementAllowance();
        }, 2000);
      }
    }
  }, [txSuccess, txReceipt, approving, endorsing]);

  const loadApplications = async (signal?: AbortSignal) => {
    try {
      setLoading(true);

      // Enhanced logging

      if (!guildId || !address) {
        setLoading(false);
        return;
      }

      const response: any = await apiRequest(
        `/api/blockchain/endorsements/applications/${guildId}?expert_address=${address}`,
        { signal }
      );

      // Check if request was aborted
      if (signal?.aborted) {
        return;
      }

      // apiRequest auto-unwraps { success, data } envelopes,
      // so response IS the data directly (an array of applications).
      const applicationsData = Array.isArray(response) ? response : [];

      setApplications(applicationsData);

    } catch (error: any) {
      // Don't show errors for aborted requests
      if (error.name === 'AbortError' || signal?.aborted) {
        return;
      }

      console.error("[loadApplications] ❌ Exception caught:", error);
      console.error("[loadApplications] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      toast.error(error.message || "Failed to load applications");
    } finally {
      // Only update loading state if not aborted
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const handleApprove = async (amount: string) => {
    try {
      setTxStep('approving');
      setApproving(true);
      setTxError(null);

      const hash = await approve(CONTRACT_ADDRESSES.ENDORSEMENT as `0x${string}`, amount);
      setApprovalTxHash(hash); // Track approval hash separately
      setTxHash(hash); // For useTransactionConfirmation hook

      toast.success("Approval submitted! Waiting for confirmation...");
    } catch (error: any) {
      console.error("Approval error:", error);
      setTxStep('error');
      setTxError(error.message || "Failed to approve tokens");
      toast.error(error.message || "Failed to approve tokens");
      setApproving(false);
      setEndorsing(false);
    }
  };

  const handlePlaceBid = async (app: Application, amount: string) => {
    try {
      setTxStep('bidding');
      setEndorsing(true);
      setTxError(null);


      const hash = await placeBid(app.job_id, app.candidate_id, amount);
      setBidTxHash(hash); // Track bid hash separately
      setTxHash(hash); // For useTransactionConfirmation hook

      toast.success("Endorsement submitted! Waiting for confirmation...");
    } catch (error: any) {
      console.error("Endorsement error:", error);
      setTxStep('error');

      let errorMsg = "Failed to place endorsement";

      // Check for InvalidJob error
      if (error.message?.includes("InvalidJob")) {
        errorMsg = "This job needs blockchain initialization. Please contact support.";
        setTxError(errorMsg);
        toast.error(errorMsg, { duration: 5000 });

        // Don't attempt auto-fix, just show error
        // The migration script should have created all jobs
      } else if (error.message?.includes("gas")) {
        errorMsg = "Transaction failed: Please ensure you have sufficient balance.";
        setTxError(errorMsg);
        toast.error(errorMsg);
      } else if (error.shortMessage) {
        errorMsg = error.shortMessage;
        setTxError(errorMsg);
        toast.error(errorMsg);
      } else if (error.message) {
        errorMsg = error.message;
        setTxError(errorMsg);
        toast.error(errorMsg);
      } else {
        setTxError(errorMsg);
        toast.error(errorMsg);
      }

      setEndorsing(false);
      setApproving(false);
    }
  };

  const handleEndorse = async (app: Application) => {

    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      toast.error("Please enter a valid bid amount");
      return;
    }

    // If user already has a bid, ensure new bid is higher
    if (app.current_bid && parseFloat(bidAmount) <= parseFloat(app.current_bid)) {
      toast.error(`New bid must be higher than your current bid of ${parseFloat(app.current_bid).toFixed(2)} VETD`);
      return;
    }

    const minBid = minimumBid ? formatEther(minimumBid) : "1";

    if (!app.current_bid && parseFloat(bidAmount) < parseFloat(minBid)) {
      toast.error(`Minimum bid is ${minBid} VETD`);
      return;
    }

    // Check balance
    const currentBalance = balance ? formatEther(balance) : "0";

    if (parseFloat(currentBalance) < parseFloat(bidAmount)) {
      toast.error(`Insufficient VETD balance. You have ${parseFloat(currentBalance).toFixed(2)} VETD but need ${bidAmount} VETD`);
      return;
    }

    try {
      setEndorsing(true);

      // Check allowance
      const currentAllowance = endorsementAllowance ? formatEther(endorsementAllowance) : "0";

      if (parseFloat(currentAllowance) < parseFloat(bidAmount)) {
        toast.info("Step 1/2: Approving tokens for endorsement...");
        await handleApprove(bidAmount);
        // After approval, the useEffect will automatically call handlePlaceBid
        return;
      }

      // Place bid directly if already approved
      await handlePlaceBid(app, bidAmount);
    } catch (error: any) {
      console.error("Endorsement error:", error);
      toast.error(error.message || "Failed to start endorsement");
      setEndorsing(false);
    }
  };

  // Handler to open details modal
  const handleViewDetails = (application: Application) => {
    setSelectedApp(application);
    setDetailsModalOpen(true);
  };

  // Handler to open transaction modal directly (quick endorse)
  const handleQuickEndorse = (application: Application) => {
    setSelectedApp(application);
    setTransactionModalOpen(true);
  };

  // Handler to endorse from details modal
  const handleEndorseFromDetails = (application: Application) => {
    setDetailsModalOpen(false);
    setSelectedApp(application);
    setTransactionModalOpen(true);
  };

  // Handler to open endorsement details
  const handleViewEndorsementDetails = (endorsement: UserEndorsement) => {
    // Find the matching application from the applications array
    const matchingApp = applications.find(
      app => app.application_id === endorsement.application_id
    );

    if (matchingApp) {
      setSelectedApp(matchingApp);
      setDetailsModalOpen(true);
    } else {
      toast.error("Application details not found");
    }
  };

  // Handler to place endorsement (called by transaction modal)
  const handlePlaceEndorsement = async (app: Application, amount: string) => {
    // If user already has a bid, ensure new bid is higher
    if (app.current_bid && parseFloat(amount) <= parseFloat(app.current_bid)) {
      throw new Error(`New bid must be higher than your current bid of ${parseFloat(app.current_bid).toFixed(2)} VETD`);
    }

    const minBid = minimumBid ? formatEther(minimumBid) : "1";

    if (!app.current_bid && parseFloat(amount) < parseFloat(minBid)) {
      throw new Error(`Minimum bid is ${minBid} VETD`);
    }

    // Check balance
    const currentBalance = balance ? formatEther(balance) : "0";

    if (parseFloat(currentBalance) < parseFloat(amount)) {
      throw new Error(`Insufficient VETD balance. You have ${parseFloat(currentBalance).toFixed(2)} VETD but need ${amount} VETD`);
    }

    setEndorsing(true);

    try {
      // Check allowance
      const currentAllowance = endorsementAllowance ? formatEther(endorsementAllowance) : "0";

      if (parseFloat(currentAllowance) < parseFloat(amount)) {
        toast.info("Step 1/2: Approving tokens for endorsement...");
        await handleApprove(amount);
        // After approval, the useEffect will automatically call handlePlaceBid
        return;
      }

      // Place bid directly if already approved
      await handlePlaceBid(app, amount);
    } catch (error: any) {
      setEndorsing(false);
      throw error;
    }
  };

  const formatSalary = (min: number, max: number) => {
    return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
  };

  if (!isConnected) {
    return (
      <Card className="border-border">
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
  const shortAddress = address ? `${address.substring(0, 6)}...${address.substring(38)}` : '';
  const formattedBalance = balance
    ? parseFloat(formatEther(balance)).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : null;

  if (!meetsMinimumStake) {
    return (
      <Card className="border-border">
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
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
  // This prevents infinite spinner when wallet is not connected
  if ((loading || endorsementsLoading) && address) {
    return (
      <Card className="border-border">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground mb-2">Loading applications for {guildName}...</p>
          <p className="text-xs text-muted-foreground">This may take a few seconds</p>
        </CardContent>
      </Card>
    );
  }

  const isOnSepolia = chain?.id === sepolia.id;

  // Backend test wallet address (from .env)
  const BACKEND_WALLET = "0x8E65c02633C89c80b8F1D1E8EdEd926A15e1C3f0";
  const isBackendWallet = address?.toLowerCase() === BACKEND_WALLET.toLowerCase();

  // Handler for refresh button
  const handleRefresh = () => {
    loadApplications(); // No signal needed for manual refresh
    refetchEndorsements();
    refetchBalance();
    refetchEndorsementAllowance();
    toast.success('Data refreshed');
  };

  return (
    <div className="space-y-6">
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
        <h2 className="text-2xl font-bold font-display flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          Endorsement Dashboard
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <EndorsementStatsGrid
        formattedBalance={balance !== undefined ? parseFloat(formatEther(balance)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : null}
        rawBalance={balance !== undefined ? formatEther(balance) : null}
        showRawBalance={balance !== undefined && parseFloat(formatEther(balance)) > 0}
        hasAddress={!!address}
        balanceLoading={balance === undefined}
        userStake={userStake}
        userEndorsementsCount={userEndorsements.length}
        applicationsCount={applications.length}
        minimumBid={minimumBid ? formatEther(minimumBid) : "1"}
        onRefreshBalance={refetchBalance}
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
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Applications in {guildName}
          </CardTitle>
          <CardDescription>
            Endorse candidates you believe will succeed. Top 3 endorsers earn rewards when candidate is hired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicationsGrid
            applications={applications}
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
        onClose={() => {
          // Only allow closing if not in progress
          if (txStep !== 'approving' && txStep !== 'bidding') {
            setTransactionModalOpen(false);
            setSelectedApp(null);
            setBidAmount("");
            setTxStep('idle');
            setTxError(null);
            setApprovalTxHash(undefined);
            setBidTxHash(undefined);
          }
        }}
        userBalance={balance ? formatEther(balance) : "0"}
        userStake={userStake}
        minimumBid={minimumBid ? formatEther(minimumBid) : "1"}
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
