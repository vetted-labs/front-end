"use client";
import { useState, useEffect, useRef } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { formatEther, parseEther } from "viem";
import { sepolia } from "wagmi/chains";
import Link from "next/link";
import {
  useVettedToken,
  useEndorsementBidding,
  useExpertStaking,
  useTransactionConfirmation,
  useUserEndorsements,
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  TrendingUp,
  Users,
  Award,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { ApplicationsGrid } from "./endorsements/ApplicationsGrid";
import { CandidateDetailsModal } from "./endorsements/CandidateDetailsModal";
import { EndorsementTransactionModal } from "./endorsements/EndorsementTransactionModal";

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
}

export function EndorsementMarketplace({ guildId, guildName }: EndorsementMarketplaceProps) {
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

  const { balance, endorsementAllowance, approve, refetchBalance, refetchEndorsementAllowance } = useVettedToken();
  const { placeBid, minimumBid } = useEndorsementBidding();
  const { stakeInfo, minimumStake } = useExpertStaking();
  const { data: txReceipt, isLoading: txPending, isSuccess: txSuccess } = useTransactionConfirmation(txHash);

  // Use backend API to get user's endorsements (more reliable than blockchain)
  const { endorsements: allUserEndorsements, isLoading: endorsementsLoading, refetch: refetchEndorsements } = useMyActiveEndorsements();

  // Filter endorsements for current guild
  const userEndorsements = allUserEndorsements.filter((e: any) => e.guild?.id === guildId);

  // Debug logging for balance
  useEffect(() => {
    if (address) {
      console.log('[Balance Debug] Wallet Address:', address);
      console.log('[Balance Debug] Raw Balance:', balance);
      console.log('[Balance Debug] Formatted Balance:', balance ? formatEther(balance) : 'N/A');
      console.log('[Balance Debug] Token Contract:', CONTRACT_ADDRESSES.TOKEN);
    }
  }, [balance, address]);

  // Load applications
  useEffect(() => {
    const abortController = new AbortController();

    if (guildId && address) {
      console.log('[useEffect] Triggering loadApplications with:', { guildId, address });
      loadApplications(abortController.signal);
    } else {
      console.warn('[useEffect] Missing guildId or address:', { guildId, address });
      setLoading(false);
      // Clear applications when wallet disconnects
      setApplications([]);
    }

    return () => {
      console.log('[useEffect] Cleanup: Aborting pending requests');
      abortController.abort();
    };
  }, [guildId, address]);

  // Handle transaction success
  useEffect(() => {
    if (txSuccess && txReceipt) {
      console.log("Transaction confirmed!", { approving, endorsing, txHash });

      if (approving && selectedApp) {
        // Approval confirmed, now place the bid
        console.log("Approval confirmed, now placing bid...");
        setApproving(false);
        refetchEndorsementAllowance();

        // Small delay to ensure allowance is updated
        setTimeout(() => {
          handlePlaceBid(selectedApp, bidAmount);
        }, 1000);
      } else if (endorsing) {
        // Bid confirmed successfully
        console.log('Bid transaction confirmed!');
        setTxStep('success');
        toast.success("Endorsement confirmed! Rewards will be distributed on candidate hire.");

        setEndorsing(false);
        setBidAmount("");

        // Keep modal open to show success with transaction details
        // User can close manually

        // Reload data with delay to ensure blockchain state is updated
        setTimeout(() => {
          console.log('Reloading data after successful bid...');
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
      console.log('[loadApplications] Starting load...');
      console.log('[loadApplications] Guild ID:', guildId);
      console.log('[loadApplications] Expert Address:', address);

      if (!guildId || !address) {
        console.warn('[loadApplications] Missing required params:', { guildId, address });
        setLoading(false);
        return;
      }

      console.log('[loadApplications] Making API request...');
      const response: any = await apiRequest(
        `/api/blockchain/endorsements/applications/${guildId}?expert_address=${address}`,
        { signal }
      );

      // Check if request was aborted
      if (signal?.aborted) {
        console.log('[loadApplications] Request was aborted, skipping state update');
        return;
      }

      // Detailed response inspection
      console.log('[loadApplications] Response type:', typeof response);
      console.log('[loadApplications] Response keys:', Object.keys(response || {}));
      console.log('[loadApplications] Full response:', response);
      console.log('[loadApplications] response.success:', response?.success);
      console.log('[loadApplications] response.data:', response?.data);
      console.log('[loadApplications] response.data length:', response?.data?.length);

      // Handle different response formats
      let applicationsData = [];

      if (response?.success && response?.data) {
        // Standard format: { success: true, data: [...] }
        applicationsData = response.data;
        console.log('[loadApplications] ✅ Using response.data format');
      } else if (Array.isArray(response)) {
        // Direct array format
        applicationsData = response;
        console.log('[loadApplications] ✅ Using direct array format');
      } else if (response?.data && Array.isArray(response.data)) {
        // Nested data without success flag
        applicationsData = response.data;
        console.log('[loadApplications] ✅ Using nested data format');
      } else {
        console.error('[loadApplications] ❌ Unexpected response format');
        console.error('[loadApplications] Response:', JSON.stringify(response, null, 2));
        toast.error("Invalid response format from server");
        setLoading(false);
        return;
      }

      console.log('[loadApplications] Setting', applicationsData.length, 'applications');
      setApplications(applicationsData);

    } catch (error: any) {
      // Don't show errors for aborted requests
      if (error.name === 'AbortError' || signal?.aborted) {
        console.log('[loadApplications] Request aborted');
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

      console.log("Placing bid...", { jobId: app.job_id, candidateId: app.candidate_id, amount });

      const hash = await placeBid(app.job_id, app.candidate_id, amount);
      setBidTxHash(hash); // Track bid hash separately
      setTxHash(hash); // For useTransactionConfirmation hook

      console.log("Bid placed, transaction hash:", hash);
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
    console.log("handleEndorse called", { bidAmount, app });

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
    console.log("Minimum bid check:", { bidAmount, minBid });

    if (!app.current_bid && parseFloat(bidAmount) < parseFloat(minBid)) {
      toast.error(`Minimum bid is ${minBid} VETD`);
      return;
    }

    // Check balance
    const currentBalance = balance ? formatEther(balance) : "0";
    console.log("Balance check:", { currentBalance, bidAmount });

    if (parseFloat(currentBalance) < parseFloat(bidAmount)) {
      toast.error(`Insufficient VETD balance. You have ${parseFloat(currentBalance).toFixed(2)} VETD but need ${bidAmount} VETD`);
      return;
    }

    try {
      setEndorsing(true);

      // Check allowance
      const currentAllowance = endorsementAllowance ? formatEther(endorsementAllowance) : "0";
      console.log("Allowance check:", { currentAllowance, bidAmount });

      if (parseFloat(currentAllowance) < parseFloat(bidAmount)) {
        console.log("Need approval, starting approval transaction...");
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
    console.log('Manually refreshing data...');
    loadApplications(); // No signal needed for manual refresh
    refetchEndorsements();
    refetchBalance();
    refetchEndorsementAllowance();
    toast.success('Data refreshed');
  };

  return (
    <div className="space-y-6">
      {/* Backend Wallet Test Mode Indicator */}
      {isBackendWallet && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="p-4 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                Test Mode
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                You're connected with the backend test wallet ({BACKEND_WALLET.substring(0, 6)}...{BACKEND_WALLET.substring(38)}). Use this for development testing only.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wrong Network Warning */}
      {!isOnSepolia && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="p-4 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                Wrong Network Detected
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                Your wallet is connected to <strong>{chain?.name || "Unknown Network"}</strong>.
                Please switch to <strong>Sepolia Testnet</strong> to endorse applications.
              </p>
              <Button
                onClick={() => switchChain({ chainId: sepolia.id })}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Switch to Sepolia Testnet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Wallet Info */}
      {address && (
        <Card className="border-border bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Connected Wallet: </span>
                <code className="text-primary font-mono">{address.substring(0, 6)}...{address.substring(38)}</code>
              </div>
              <Badge variant="outline" className="ml-2">
                {chain?.name || 'Unknown Network'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header Stats */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Endorsement Dashboard</h2>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Your VETD Balance</p>
                  <button
                    onClick={() => {
                      console.log('Manually refreshing balance...');
                      refetchBalance();
                      toast.success('Balance refreshed');
                    }}
                    className="p-1 hover:bg-muted rounded"
                    title="Refresh balance"
                  >
                    <RefreshCw className="w-3 h-3 text-muted-foreground hover:text-primary" />
                  </button>
                </div>
                {!address ? (
                  <p className="text-lg text-muted-foreground">Connect Wallet</p>
                ) : balance === undefined ? (
                  <p className="text-lg text-muted-foreground">Loading...</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold break-all">
                      {parseFloat(formatEther(balance)).toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2
                      })}
                    </p>
                    {parseFloat(formatEther(balance)) > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                        {formatEther(balance)} VETD
                      </p>
                    )}
                  </>
                )}
              </div>
              <Coins className="w-8 h-8 text-primary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Staked Amount</p>
                <p className="text-2xl font-bold">{userStake}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Endorsements</p>
                <p className="text-2xl font-bold">{userEndorsements.length}</p>
              </div>
              <Award className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Applications</p>
                <p className="text-2xl font-bold">{applications.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Minimum Bid</p>
                <p className="text-2xl font-bold">
                  {minimumBid ? formatEther(minimumBid) : "1"}
                </p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Endorsements Section */}
      <Card className="border-border bg-gradient-to-r from-primary/5 to-purple/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                My Active Endorsements
              </CardTitle>
              <CardDescription>
                {userEndorsements.length > 0
                  ? `You have ${userEndorsements.length} active endorsement${userEndorsements.length !== 1 ? 's' : ''} in ${guildName}`
                  : allUserEndorsements.length > 0
                  ? `You have ${allUserEndorsements.length} endorsement${allUserEndorsements.length !== 1 ? 's' : ''} in other guilds`
                  : `No active endorsements yet. Endorse candidates below to get started.`
                }
              </CardDescription>
            </div>
            {allUserEndorsements.length > 0 && (
              <Link href="/expert/endorsements/history">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  View All ({allUserEndorsements.length})
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {userEndorsements.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                You haven't endorsed any candidates in {guildName} yet
              </p>
              {allUserEndorsements.length > 0 ? (
                <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
                  <p className="text-xs text-muted-foreground mb-2">
                    You have {allUserEndorsements.length} endorsement{allUserEndorsements.length !== 1 ? 's' : ''} in other guilds:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {Array.from(new Set(allUserEndorsements.map((e: any) => e.guild?.name).filter(Boolean))).map((guildName: any) => (
                      <span key={guildName} className="text-xs px-2 py-1 bg-primary/10 rounded-full">
                        {guildName}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Browse applications below and endorse candidates you believe will succeed
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {userEndorsements.map((endorsement: any) => (
                <div
                  key={endorsement.application?.id || endorsement.endorsementId}
                  onClick={() => {
                    // Build application object from endorsement data
                    // The modal expects snake_case flat structure
                    const applicationForModal = {
                      // IDs
                      application_id: endorsement.application?.id,
                      candidate_id: endorsement.candidate?.id,
                      job_id: endorsement.job?.id,
                      company_id: endorsement.job?.companyId,

                      // Candidate info (flat snake_case from nested camelCase)
                      candidate_name: endorsement.candidate?.name,
                      candidate_email: endorsement.candidate?.email,
                      candidate_headline: endorsement.candidate?.headline,
                      candidate_profile_picture_url: endorsement.candidate?.profilePicture,
                      candidate_bio: endorsement.candidate?.bio || '',
                      candidate_wallet: endorsement.candidate?.walletAddress,

                      // Job info
                      job_title: endorsement.job?.title,
                      job_description: endorsement.job?.description,
                      company_name: endorsement.job?.companyName,
                      company_logo: endorsement.job?.companyLogo,
                      location: endorsement.job?.location,
                      job_type: endorsement.job?.jobType,
                      salary_min: endorsement.job?.salaryMin,
                      salary_max: endorsement.job?.salaryMax,
                      salary_currency: endorsement.job?.salaryCurrency,

                      // Application details
                      status: endorsement.application?.status,
                      applied_at: endorsement.application?.appliedAt,
                      cover_letter: endorsement.application?.coverLetter,
                      screening_answers: endorsement.application?.screeningAnswers,

                      // Guild info
                      guild_score: endorsement.guildScore,

                      // Current bid and rank info
                      current_bid: endorsement.stakeAmount,
                      rank: endorsement.blockchainData?.rank || 0,

                      // Additional fields that might be used
                      requirements: endorsement.job?.requirements || [],
                      job_skills: endorsement.job?.skills || [],
                      experience_level: endorsement.candidate?.experienceLevel,
                      linkedin: endorsement.candidate?.linkedin,
                      github: endorsement.candidate?.github,
                      resume_url: endorsement.candidate?.resumeUrl,
                    };

                    setSelectedApp(applicationForModal);
                    setDetailsModalOpen(true);
                  }}
                  className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:border-primary/50 hover:shadow-md cursor-pointer transition-all group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold group-hover:text-primary transition-colors">
                        {endorsement.candidate?.name}
                      </h4>
                      {endorsement.blockchainData?.rank > 0 && endorsement.blockchainData?.rank <= 3 && (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
                          🏆 Rank #{endorsement.blockchainData.rank}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {endorsement.job?.title} at {endorsement.job?.companyName}
                    </p>
                    <p className="text-sm font-medium text-primary mt-1">
                      Your Bid: {parseFloat(endorsement.stakeAmount || '0').toFixed(2)} VETD
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm text-muted-foreground">
                      {endorsement.blockchainData?.rank > 0 && (
                        <p>Rank #{endorsement.blockchainData.rank}</p>
                      )}
                      <p className="text-xs mt-1">
                        {endorsement.createdAt
                          ? new Date(endorsement.createdAt).toLocaleDateString()
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applications List */}
      <Card className="border-border">
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
