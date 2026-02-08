"use client";
import { useState, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { formatEther, keccak256, toBytes } from "viem";
import { sepolia } from "wagmi/chains";
import { X, Coins, AlertTriangle, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { useVettedToken, useGuildStaking, useTransactionConfirmation } from "@/lib/hooks/useVettedContracts";
import { CONTRACT_ADDRESSES } from "@/contracts/abis";
import { blockchainApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { TransactionModal } from "./TransactionModal";

interface GuildOption {
  id: string;
  name: string;
  blockchainGuildId: `0x${string}`;
}

interface StakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedGuildId?: string;
}

type ActionMode = "stake" | "withdraw";

export function StakingModal({ isOpen, onClose, onSuccess, preselectedGuildId }: StakingModalProps) {
  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [actionMode, setActionMode] = useState<ActionMode>("stake");
  const [stakeAmount, setStakeAmount] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [step, setStep] = useState<"input" | "approving" | "transaction">("input");

  // Guild selection
  const [guilds, setGuilds] = useState<GuildOption[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<GuildOption | null>(null);
  const [isLoadingGuilds, setIsLoadingGuilds] = useState(false);
  const [showGuildDropdown, setShowGuildDropdown] = useState(false);

  // Transaction modal state
  const [showTxModal, setShowTxModal] = useState(false);
  const [txStatus, setTxStatus] = useState<"pending" | "success" | "error">("pending");
  const [txErrorMessage, setTxErrorMessage] = useState<string>("");
  const [currentTxAmount, setCurrentTxAmount] = useState<string>("");
  const [currentTxAction, setCurrentTxAction] = useState<ActionMode>("stake");

  // Contract hooks - use per-guild staking
  const { balance, allowance, approve, mint, refetchBalance, refetchAllowance } = useVettedToken();
  const { stakeInfo, minimumStake, isPaused, stake, requestUnstake, refetchStake, guildTotalStaked } = useGuildStaking(selectedGuild?.blockchainGuildId);
  const { isSuccess: txConfirmed, isError: txError, error: txErrorDetails } = useTransactionConfirmation(txHash || undefined);

  const isOnSepolia = chain?.id === sepolia.id;
  const formatTokenAmount = (value: number | null, fractionDigits: number = 2) => {
    if (value === null || Number.isNaN(value)) return "—";
    return value.toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  };

  // Fetch user's guild memberships
  useEffect(() => {
    if (!isOpen || !address) return;

    const fetchGuilds = async () => {
      setIsLoadingGuilds(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        // Fetch guilds the expert is a member of
        const response = await fetch(`${apiUrl}/api/blockchain/staking/guilds/${address}`);

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            const guildOptions: GuildOption[] = data.data.map((g: any) => ({
              id: g.guildId,
              name: g.guildName,
              blockchainGuildId: g.blockchainGuildId as `0x${string}`,
            }));
            setGuilds(guildOptions);

            // If we have a preselected guild, select it
            if (preselectedGuildId) {
              const preselected = guildOptions.find(g => g.id === preselectedGuildId);
              if (preselected) setSelectedGuild(preselected);
            }
            return;
          }
        }

        // Fallback: fetch all guilds and let user pick
        const allGuildsResponse = await fetch(`${apiUrl}/api/guilds`);
        if (allGuildsResponse.ok) {
          const allData = await allGuildsResponse.json();
          const allGuilds = Array.isArray(allData) ? allData : (allData.data || []);
          const guildOptions: GuildOption[] = allGuilds.map((g: any) => ({
            id: g.id,
            name: g.name,
            blockchainGuildId: keccak256(toBytes(g.id)) as `0x${string}`,
          }));
          setGuilds(guildOptions);

          if (preselectedGuildId) {
            const preselected = guildOptions.find(g => g.id === preselectedGuildId);
            if (preselected) setSelectedGuild(preselected);
          }
        }
      } catch (error) {
        console.error('Failed to fetch guilds:', error);
      } finally {
        setIsLoadingGuilds(false);
      }
    };

    fetchGuilds();
  }, [isOpen, address, preselectedGuildId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStakeAmount("");
      setStep("input");
      setTxHash(null);
      setIsApproving(false);
      setActionMode("stake");
      setShowTxModal(false);
      setTxStatus("pending");
      setTxErrorMessage("");
      setSelectedGuild(null);
      setShowGuildDropdown(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && address) {
      refetchBalance();
      refetchStake();
      refetchAllowance();
    }
  }, [isOpen, address, selectedGuild]);

  // Handle transaction confirmation
  useEffect(() => {
    if (txConfirmed && txHash) {
      if (step === "approving") {
        toast.success("Approval confirmed! Starting transaction...");
        setIsApproving(false);
        setTxHash(null);
        setShowTxModal(false);
        refetchAllowance();
        handleStakeAfterApproval();
      } else if (step === "transaction") {
        setTxStatus("success");
        refetchBalance();
        refetchStake();
        // Sync stake to database so dashboard reflects the update
        if (address && selectedGuild) {
          blockchainApi.syncStake(address, selectedGuild.blockchainGuildId).catch(() => {});
        }
        onSuccess?.();
        setStep("input");
        setStakeAmount("");
      }
    }
  }, [txConfirmed, txHash, step]);

  // Handle transaction errors
  useEffect(() => {
    if (txError && txHash) {
      const errorMessage = (txErrorDetails as any)?.shortMessage ||
                          (txErrorDetails as any)?.message ||
                          "Transaction failed on blockchain";

      if (step === "approving") {
        toast.error(`Approval failed: ${errorMessage}`);
        setIsApproving(false);
        setShowTxModal(false);
        setStep("input");
        setTxHash(null);
      } else if (step === "transaction") {
        setTxStatus("error");
        setTxErrorMessage(errorMessage);
      }

      console.error("Transaction error:", txErrorDetails);
    }
  }, [txError, txHash, step, txErrorDetails]);

  const handleStakeAfterApproval = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0 || !selectedGuild) return;

    try {
      setStep("transaction");
      setCurrentTxAmount(stakeAmount);
      setCurrentTxAction(actionMode);
      setShowTxModal(true);
      setTxStatus("pending");

      const hash = actionMode === "stake"
        ? await stake(selectedGuild.blockchainGuildId, stakeAmount)
        : await requestUnstake(selectedGuild.blockchainGuildId, stakeAmount);

      setTxHash(hash);
    } catch (error: any) {
      console.error("Transaction error:", error);

      if (error.message?.includes("User rejected") || error.message?.includes("User denied")) {
        toast.error("Transaction rejected by user");
        setShowTxModal(false);
      } else {
        setTxStatus("error");
        setTxErrorMessage(error.shortMessage || error.message || "Transaction failed");
      }

      setStep("input");
    }
  };

  const handleStake = async () => {
    if (!selectedGuild) {
      toast.error("Please select a guild to stake for");
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error("Please enter a valid stake amount");
      return;
    }

    const currentBalance = balance ? parseFloat(formatEther(balance)) : 0;
    if (currentBalance < parseFloat(stakeAmount)) {
      toast.error(`Insufficient balance. You have ${formatTokenAmount(currentBalance)} VETD`);
      return;
    }

    const currentAllowance = allowance ? parseFloat(formatEther(allowance)) : 0;

    if (currentAllowance < parseFloat(stakeAmount)) {
      try {
        setIsApproving(true);
        setStep("approving");
        setShowTxModal(true);
        setTxStatus("pending");
        setCurrentTxAmount(stakeAmount);
        setCurrentTxAction("stake");

        const hash = await approve(CONTRACT_ADDRESSES.STAKING as `0x${string}`, stakeAmount);
        setTxHash(hash);
      } catch (error: any) {
        console.error("Approval error:", error);

        if (error.message?.includes("User rejected") || error.message?.includes("User denied")) {
          toast.error("Transaction rejected by user");
          setShowTxModal(false);
        } else {
          toast.error(error.shortMessage || error.message || "Failed to approve tokens");
          setShowTxModal(false);
        }

        setIsApproving(false);
        setStep("input");
        setTxHash(null);
      }
      return;
    }

    try {
      setStep("transaction");
      setCurrentTxAmount(stakeAmount);
      setCurrentTxAction("stake");
      setShowTxModal(true);
      setTxStatus("pending");

      const hash = await stake(selectedGuild.blockchainGuildId, stakeAmount);
      setTxHash(hash);
    } catch (error: any) {
      console.error("Staking error:", error);

      if (error.message?.includes("User rejected") || error.message?.includes("User denied")) {
        toast.error("Transaction rejected by user");
        setShowTxModal(false);
      } else {
        setTxStatus("error");
        setTxErrorMessage(error.shortMessage || error.message || "Failed to stake tokens");
      }

      setStep("input");
    }
  };

  const handleMaxClick = () => {
    if (actionMode === "stake" && balance) {
      setStakeAmount(parseFloat(formatEther(balance)).toFixed(2));
    } else if (actionMode === "withdraw" && stakeInfo) {
      setStakeAmount(parseFloat(formatEther(stakeInfo[0])).toFixed(2));
    }
  };

  const handleWithdraw = async () => {
    if (!selectedGuild) {
      toast.error("Please select a guild to withdraw from");
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error("Please enter a valid withdrawal amount");
      return;
    }

    const currentStake = stakeInfo ? parseFloat(formatEther(stakeInfo[0])) : 0;
    if (currentStake < parseFloat(stakeAmount)) {
      toast.error(
        `Insufficient staked balance. You have ${formatTokenAmount(currentStake)} VETD staked`
      );
      return;
    }

    try {
      setStep("transaction");
      setCurrentTxAmount(stakeAmount);
      setCurrentTxAction("withdraw");
      setShowTxModal(true);
      setTxStatus("pending");

      const hash = await requestUnstake(selectedGuild.blockchainGuildId, stakeAmount);
      setTxHash(hash);
    } catch (error: any) {
      console.error("Withdrawal error:", error);

      if (error.message?.includes("User rejected") || error.message?.includes("User denied")) {
        toast.error("Transaction rejected by user");
        setShowTxModal(false);
      } else {
        setTxStatus("error");
        setTxErrorMessage(error.shortMessage || error.message || "Failed to withdraw tokens");
      }

      setStep("input");
    }
  };

  const handleClose = () => {
    if (step !== "approving" && step !== "transaction") {
      onClose();
    }
  };

  const handleTxModalClose = () => {
    const wasSuccess = txStatus === "success";
    setShowTxModal(false);
    setTxHash(null);
    setTxStatus("pending");
    setTxErrorMessage("");

    // On success, close the entire staking modal and return to the page
    if (wasSuccess) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentBalance =
    balance && isOnSepolia ? parseFloat(formatEther(balance)) : null;
  const currentStake =
    stakeInfo && isOnSepolia ? parseFloat(formatEther(stakeInfo[0])) : null;
  const minStake = minimumStake ? parseFloat(formatEther(minimumStake)) : 10;
  const currentAllowance = allowance ? parseFloat(formatEther(allowance)) : 0;
  const needsApproval = currentAllowance < parseFloat(stakeAmount || "0");
  const balanceLabel = !isOnSepolia
    ? "Switch to Sepolia"
    : balance === undefined
    ? "Loading..."
    : "VETD";
  const stakeLabel = !isOnSepolia
    ? "Switch to Sepolia"
    : stakeInfo === undefined
    ? "Loading..."
    : "VETD";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="bg-card/95 rounded-3xl shadow-2xl border border-border/60 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto backdrop-blur-sm">
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-600 via-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                Manage Staking
              </h2>
              <p className="text-xs text-muted-foreground">Stake VETD per guild to unlock reviewing</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={step === "approving" || step === "transaction"}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Wrong Network Warning */}
          {!isOnSepolia && (
            <div className="p-4 bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-start gap-3 backdrop-blur-sm">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                  Wrong Network
                </p>
                <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-3">
                  Please switch to Sepolia Testnet to stake tokens.
                </p>
                <Button
                  onClick={() => switchChain({ chainId: sepolia.id })}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg"
                >
                  Switch to Sepolia
                </Button>
              </div>
            </div>
          )}

          {/* Contract Paused Warning */}
          {isPaused && isOnSepolia && (
            <div className="p-4 bg-gradient-to-r from-red-500/10 via-red-500/5 to-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 backdrop-blur-sm">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">
                  Staking Paused
                </p>
                <p className="text-xs text-red-800 dark:text-red-300">
                  The staking contract is currently paused. Please try again later or contact support.
                </p>
              </div>
            </div>
          )}

          {/* Input State */}
          {(
            <>
              {/* Guild Selector */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Select Guild
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowGuildDropdown(!showGuildDropdown)}
                    disabled={isLoadingGuilds || step !== "input"}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border/50 bg-background hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className={selectedGuild ? "text-foreground" : "text-muted-foreground"}>
                      {isLoadingGuilds
                        ? "Loading guilds..."
                        : selectedGuild
                        ? selectedGuild.name
                        : "Choose a guild to stake for..."}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {showGuildDropdown && guilds.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-card border border-border/60 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {guilds.map((guild) => (
                        <button
                          key={guild.id}
                          onClick={() => {
                            setSelectedGuild(guild);
                            setShowGuildDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors text-sm first:rounded-t-xl last:rounded-b-xl ${
                            selectedGuild?.id === guild.id ? "bg-orange-500/10 text-orange-600 font-medium" : "text-foreground"
                          }`}
                        >
                          {guild.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {guilds.length === 0 && !isLoadingGuilds && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    No guilds available. Join a guild first to stake.
                  </p>
                )}
              </div>

              {/* Action Mode Tabs */}
              <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-2xl">
                <button
                  onClick={() => setActionMode("stake")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    actionMode === "stake"
                      ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Stake
                </button>
                <button
                  onClick={() => setActionMode("withdraw")}
                  disabled={!currentStake || currentStake === 0}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    actionMode === "withdraw"
                      ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  Withdraw
                </button>
              </div>

              {/* Current Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative p-5 bg-muted/40 rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Wallet Balance</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {formatTokenAmount(currentBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{balanceLabel}</p>
                </div>
                <div className="relative p-5 bg-orange-500/10 rounded-2xl border border-orange-500/25 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-2">
                    {selectedGuild ? `Staked in ${selectedGuild.name}` : "Staked Balance"}
                  </p>
                  <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400">
                    {selectedGuild ? formatTokenAmount(currentStake) : "—"}
                  </p>
                  <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">
                    {selectedGuild ? stakeLabel : "Select a guild"}
                  </p>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-semibold text-foreground">
                    Amount to {actionMode === "stake" ? "Stake" : "Withdraw"}
                  </label>
                  <button
                    onClick={handleMaxClick}
                    className="px-3 py-1 text-xs font-medium text-orange-600 hover:text-orange-700 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg transition-colors"
                  >
                    Max
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    disabled={step === "approving" || step === "transaction"}
                    className="text-lg h-14 pr-16 rounded-xl border-border/50 focus:border-orange-500/50 focus:ring-orange-500/20"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                    VETD
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {actionMode === "stake"
                    ? `Minimum: ${formatTokenAmount(minStake)} VETD per guild`
                    : `Available: ${formatTokenAmount(currentStake)} VETD`}
                </p>
              </div>

              {/* Action Button */}
              <Button
                onClick={actionMode === "stake" ? handleStake : handleWithdraw}
                disabled={
                  !isOnSepolia ||
                  isPaused ||
                  isApproving ||
                  step === "approving" ||
                  step === "transaction" ||
                  !stakeAmount ||
                  parseFloat(stakeAmount) <= 0 ||
                  !selectedGuild
                }
                className="w-full h-12 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all rounded-xl font-semibold"
              >
                {actionMode === "stake" ? (
                  <>
                    <TrendingUp className="mr-2 h-5 w-5" />
                    {selectedGuild ? `Stake for ${selectedGuild.name}` : "Select a Guild"}
                  </>
                ) : (
                  <>
                    <TrendingDown className="mr-2 h-5 w-5" />
                    {selectedGuild ? `Withdraw from ${selectedGuild.name}` : "Select a Guild"}
                  </>
                )}
              </Button>

              {/* Help Text */}
              <div className="text-center space-y-1">
                {actionMode === "stake" && needsApproval && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You need to approve tokens before staking. This is a one-time approval and will happen automatically.
                  </p>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {actionMode === "stake"
                    ? "Stake per guild to join reviewer pools and earn rewards."
                    : "Withdraw your staked tokens back to your wallet."}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTxModal}
        onClose={handleTxModalClose}
        status={txStatus}
        txHash={txHash || undefined}
        actionType={currentTxAction}
        amount={currentTxAmount}
        errorMessage={txErrorMessage}
      />
    </div>
  );
}
