"use client";
import { useState, useEffect } from "react";
import { useAccount, useSwitchChain, usePublicClient } from "wagmi";
import { formatEther, maxUint256 } from "viem";
import { sepolia } from "wagmi/chains";
import { X, AlertTriangle, TrendingUp, TrendingDown, ChevronDown, Wallet, Lock, Shield } from "lucide-react";
import Image from "next/image";
import { useVettedToken, useGuildStaking, useTransactionConfirmation } from "@/lib/hooks/useVettedContracts";
import { CONTRACT_ADDRESSES } from "@/contracts/abis";
import { blockchainApi, guildsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
  const publicClient = usePublicClient();
  const [actionMode, setActionMode] = useState<ActionMode>("stake");
  const [stakeAmount, setStakeAmount] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [step, setStep] = useState<"input" | "transaction">("input");

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

  // Whether guild is locked (opened from a specific guild page)
  const isGuildLocked = !!preselectedGuildId;

  // Fetch guilds for selection
  useEffect(() => {
    if (!isOpen || !address) return;

    const fetchGuilds = async () => {
      setIsLoadingGuilds(true);
      try {
        // Always fetch all guilds so the full list is available
        const allData = await guildsApi.getAll();
        const allGuilds = Array.isArray(allData) ? allData : [];
        const guildOptions: GuildOption[] = allGuilds
          .filter((g) => g.blockchainGuildId)
          .map((g) => ({
            id: g.id,
            name: g.name,
            blockchainGuildId: g.blockchainGuildId as `0x${string}`,
          }));
        setGuilds(guildOptions);

        // Auto-select preselected guild
        if (preselectedGuildId) {
          const preselected = guildOptions.find(g => g.id === preselectedGuildId);
          if (preselected) setSelectedGuild(preselected);
        }
      } catch (error) {
        // Silently fail - user can still manually select guilds
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
    if (txConfirmed && txHash && step === "transaction") {
      setTxStatus("success");
      refetchBalance();
      refetchStake();
      refetchAllowance();
      // Sync stake to database in the background — don't call onSuccess yet.
      // onSuccess (which refreshes the parent page) is deferred to when the
      // user dismisses the success screen so they can see the confirmation.
      if (address && selectedGuild) {
        blockchainApi.syncStake(address, selectedGuild.blockchainGuildId)
          .catch((err) => {
            console.error("Failed to sync stake to database:", err);
          });
      }
    }
  }, [txConfirmed, txHash, step]);

  // Handle transaction errors
  useEffect(() => {
    if (txError && txHash && step === "transaction") {
      const errorMessage = (txErrorDetails as { shortMessage?: string })?.shortMessage ||
                          (txErrorDetails instanceof Error ? txErrorDetails.message : null) ||
                          "Transaction failed on blockchain";

      setTxStatus("error");
      setTxErrorMessage(errorMessage);
      console.error("Transaction error:", txErrorDetails);
    }
  }, [txError, txHash, step, txErrorDetails]);

  const isUserRejection = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message : "";
    return message.includes("User rejected") || message.includes("User denied");
  };

  /**
   * Unified stake handler — if approval is needed, approves with MaxUint256
   * first (one-time unlimited), waits for confirmation, then stakes.
   * The user sees a single TransactionModal the whole time.
   */
  const handleStake = async () => {
    if (!selectedGuild) {
      toast.error("Please select a guild to stake for");
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error("Please enter a valid stake amount");
      return;
    }

    const walletBalance = balance !== undefined ? parseFloat(formatEther(balance)) : 0;
    if (walletBalance < parseFloat(stakeAmount)) {
      toast.error(`Insufficient balance. You have ${formatTokenAmount(walletBalance)} VETD`);
      return;
    }

    // Show the transaction modal immediately
    setStep("transaction");
    setCurrentTxAmount(stakeAmount);
    setCurrentTxAction("stake");
    setShowTxModal(true);
    setTxStatus("pending");

    try {
      const currentAllowanceVal = allowance !== undefined ? parseFloat(formatEther(allowance)) : 0;

      // If approval needed, approve for MaxUint256 (one-time unlimited)
      if (currentAllowanceVal < parseFloat(stakeAmount)) {
        const approveHash = await approve(CONTRACT_ADDRESSES.STAKING as `0x${string}`, formatEther(maxUint256));

        // Wait for approval to confirm on-chain before staking
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
        refetchAllowance();
      }

      // Now stake
      const hash = await stake(selectedGuild.blockchainGuildId, stakeAmount);
      setTxHash(hash);
    } catch (error: unknown) {
      console.error("Staking error:", error);

      if (isUserRejection(error)) {
        toast.error("Transaction rejected");
        setShowTxModal(false);
      } else {
        const shortMessage = (error as { shortMessage?: string })?.shortMessage;
        setTxStatus("error");
        setTxErrorMessage(shortMessage || (error instanceof Error ? error.message : "Transaction failed"));
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
    } catch (error: unknown) {
      console.error("Withdrawal error:", error);

      if (isUserRejection(error)) {
        toast.error("Transaction rejected by user");
        setShowTxModal(false);
      } else {
        const shortMessage = (error as { shortMessage?: string })?.shortMessage;
        setTxStatus("error");
        setTxErrorMessage(shortMessage || (error instanceof Error ? error.message : "Failed to withdraw tokens"));
      }

      setStep("input");
    }
  };

  const handleClose = () => {
    if (step !== "transaction") {
      onClose();
    }
  };

  const handleTxModalClose = () => {
    const wasSuccess = txStatus === "success";
    setShowTxModal(false);
    setTxHash(null);
    setTxStatus("pending");
    setTxErrorMessage("");

    if (wasSuccess) {
      // Reset input state, notify the parent to refresh, then close
      setStep("input");
      setStakeAmount("");
      onSuccess?.();
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentBalance =
    balance !== undefined && isOnSepolia ? parseFloat(formatEther(balance)) : null;
  const currentStake =
    stakeInfo !== undefined && isOnSepolia ? parseFloat(formatEther(stakeInfo[0])) : null;
  const minStake = minimumStake ? parseFloat(formatEther(minimumStake)) : 10;
  const currentAllowance = allowance !== undefined ? parseFloat(formatEther(allowance)) : 0;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg animate-in fade-in duration-200">
      <div
        className="relative max-w-[460px] w-full mx-4 max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 bg-card/80 backdrop-blur-2xl border border-white/[0.08] dark:bg-card/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="relative overflow-hidden px-6 pt-5 pb-6">
          {/* Decorative background glow */}
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-orange-500/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-600/10 rounded-full blur-[60px] pointer-events-none" />

          {/* Top row: logo + title left, close button right */}
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full opacity-20 blur-lg" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Image
                    src="/Vetted-orange.png"
                    alt="Vetted"
                    width={24}
                    height={24}
                    className="w-6 h-6 object-contain"
                  />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground leading-tight">Manage Staking</h2>
                <p className="text-xs text-muted-foreground">Stake VETD per guild to unlock reviewing</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={step === "transaction"}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/[0.06] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="px-6 pt-6 pb-6 space-y-4">
          {/* Wrong Network Warning */}
          {!isOnSepolia && (
            <div className="p-3.5 bg-yellow-500/[0.08] border border-yellow-500/20 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-yellow-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-yellow-200">Wrong Network</p>
                <p className="text-xs text-yellow-300/60 mt-0.5">Switch to Sepolia Testnet to continue.</p>
              </div>
              <Button
                onClick={() => switchChain({ chainId: sepolia.id })}
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs rounded-lg shadow-sm flex-shrink-0"
              >
                Switch
              </Button>
            </div>
          )}

          {/* Contract Paused Warning */}
          {isPaused && isOnSepolia && (
            <div className="p-3.5 bg-red-500/[0.08] border border-red-500/20 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-200">Staking Paused</p>
                <p className="text-xs text-red-300/60 mt-0.5">Contract is paused. Try again later.</p>
              </div>
            </div>
          )}

          {(
            <>
              {/* ── Action Mode Toggle ── */}
              <div className="flex p-1 bg-white/[0.04] dark:bg-white/[0.03] rounded-2xl border border-white/[0.06]">
                <button
                  onClick={() => setActionMode("stake")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    actionMode === "stake"
                      ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Stake
                </button>
                <button
                  onClick={() => setActionMode("withdraw")}
                  disabled={!currentStake || currentStake === 0}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    actionMode === "withdraw"
                      ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/30"
                      : "text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  Withdraw
                </button>
              </div>

              {/* ── Guild Selector ── */}
              <div className="relative">
                {isGuildLocked ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-orange-400" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{selectedGuild?.name || "Loading..."}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowGuildDropdown(!showGuildDropdown)}
                    disabled={isLoadingGuilds || step !== "input"}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.06] transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                      <ChevronDown className={`w-4 h-4 text-orange-400 transition-transform duration-200 ${showGuildDropdown ? "rotate-180" : ""}`} />
                    </div>
                    <span className={`text-sm flex-1 ${selectedGuild ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {isLoadingGuilds
                        ? "Loading guilds..."
                        : selectedGuild
                        ? selectedGuild.name
                        : "Choose a guild..."}
                    </span>
                  </button>
                )}

                {!isGuildLocked && showGuildDropdown && guilds.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 rounded-2xl shadow-2xl border border-white/[0.08] bg-card/95 backdrop-blur-2xl max-h-48 overflow-y-auto">
                    {guilds.map((guild) => (
                      <button
                        key={guild.id}
                        onClick={() => {
                          setSelectedGuild(guild);
                          setShowGuildDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 transition-all text-sm first:rounded-t-2xl last:rounded-b-2xl ${
                          selectedGuild?.id === guild.id
                            ? "bg-orange-500/15 text-orange-400 font-medium"
                            : "text-foreground hover:bg-white/[0.06]"
                        }`}
                      >
                        {guild.name}
                      </button>
                    ))}
                  </div>
                )}
                {!isGuildLocked && guilds.length === 0 && !isLoadingGuilds && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    No guilds available. Join a guild first.
                  </p>
                )}
              </div>

              {/* ── Amount Input Panel ── */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-4">
                {/* Amount input */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">
                      {actionMode === "stake" ? "You stake" : "You withdraw"}
                    </span>
                    <button
                      onClick={handleMaxClick}
                      className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      disabled={step === "transaction"}
                      className="flex-1 bg-transparent text-3xl font-bold text-foreground placeholder:text-muted-foreground/30 outline-none tabular-nums min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">V</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">VETD</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    {actionMode === "stake"
                      ? `Min. ${formatTokenAmount(minStake)} VETD`
                      : `Available: ${formatTokenAmount(currentStake)} VETD`}
                  </p>
                </div>

                {/* Divider */}
                <div className="h-px bg-white/[0.06]" />

                {/* Balance row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Wallet</p>
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        {formatTokenAmount(currentBalance)} <span className="text-muted-foreground font-normal">{balanceLabel}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div>
                      <p className="text-xs text-orange-400/70 text-right">
                        {selectedGuild ? `Staked` : "Staked"}
                      </p>
                      <p className="text-sm font-semibold text-orange-400 tabular-nums text-right">
                        {selectedGuild ? formatTokenAmount(currentStake) : "—"} <span className="text-orange-400/50 font-normal">{selectedGuild ? stakeLabel : ""}</span>
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-orange-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Approval notice ── */}
              {actionMode === "stake" && needsApproval && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/[0.06] border border-orange-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
                  <p className="text-xs text-orange-300/70">
                    Token approval required (one-time, automatic)
                  </p>
                </div>
              )}

              {/* ── Action Button ── */}
              <Button
                onClick={actionMode === "stake" ? handleStake : handleWithdraw}
                disabled={
                  !isOnSepolia ||
                  isPaused ||
                  step === "transaction" ||
                  !stakeAmount ||
                  parseFloat(stakeAmount) <= 0 ||
                  !selectedGuild
                }
                className="w-full h-[3.25rem] bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 hover:from-orange-500 hover:via-orange-400 hover:to-orange-500 text-white shadow-xl shadow-orange-500/25 hover:shadow-orange-400/35 transition-all duration-300 rounded-2xl font-bold text-[15px]"
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

              {/* ── Footer hint ── */}
              <p className="text-center text-xs text-muted-foreground/50">
                {actionMode === "stake"
                  ? "Stake per guild to join reviewer pools and earn rewards."
                  : "Withdraw your staked tokens back to your wallet."}
              </p>
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
        guildName={selectedGuild?.name}
      />
    </div>
  );
}
