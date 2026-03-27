"use client";
import { useState, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { formatEther } from "viem";
import { sepolia } from "wagmi/chains";
import { X, AlertTriangle, TrendingUp, TrendingDown, ChevronDown, Wallet, Shield, ArrowRight } from "lucide-react";
import { useVettedToken, useGuildStaking, useTransactionConfirmation } from "@/lib/hooks/useVettedContracts";
import { usePermitOrApprove } from "@/lib/hooks/usePermitOrApprove";
import { STATUS_COLORS } from "@/config/colors";
import { CONTRACT_ADDRESSES } from "@/contracts/abis";
import { blockchainApi, guildsApi } from "@/lib/api";
import { retryWithBackoff } from "@/lib/utils";
import { useFetch } from "@/lib/hooks/useFetch";
import { logger } from "@/lib/logger";
import { isUserRejection, getTransactionErrorMessage } from "@/lib/blockchain";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TransactionModal } from "./TransactionModal";
import type { StakingGuildOption } from "@/types";

interface StakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedGuildId?: string;
  defaultMode?: ActionMode;
}

type ActionMode = "stake" | "withdraw";

export function StakingModal({ isOpen, onClose, onSuccess, preselectedGuildId, defaultMode }: StakingModalProps) {
  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [actionMode, setActionMode] = useState<ActionMode>(defaultMode || "stake");
  const [stakeAmount, setStakeAmount] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [step, setStep] = useState<"input" | "transaction">("input");

  // Guild selection
  const [selectedGuild, setSelectedGuild] = useState<StakingGuildOption | null>(null);
  const [showGuildDropdown, setShowGuildDropdown] = useState(false);

  // Transaction modal state
  const [showTxModal, setShowTxModal] = useState(false);
  const [txStatus, setTxStatus] = useState<"pending" | "success" | "error">("pending");
  const [txErrorMessage, setTxErrorMessage] = useState<string>("");
  const [currentTxAmount, setCurrentTxAmount] = useState<string>("");
  const [currentTxAction, setCurrentTxAction] = useState<ActionMode>("stake");

  // Fetch guilds via useFetch
  const { data: guilds, isLoading: isLoadingGuilds } = useFetch<StakingGuildOption[]>(
    async () => {
      const allData = await guildsApi.getAll();
      const allGuilds = Array.isArray(allData) ? allData : [];
      return allGuilds
        .filter((g) => g.blockchainGuildId)
        .map((g) => ({
          id: g.id,
          name: g.name,
          blockchainGuildId: g.blockchainGuildId as `0x${string}`,
        }));
    },
    {
      skip: !isOpen || !address,
      onSuccess: (guildOptions) => {
        if (preselectedGuildId) {
          const preselected = guildOptions.find(g => g.id === preselectedGuildId);
          if (preselected) setSelectedGuild(preselected);
        }
      },
      onError: (msg) => toast.error(`Failed to load guilds: ${msg}`),
    }
  );

  // Contract hooks - use per-guild staking
  const { balance, mint, refetchBalance } = useVettedToken();
  const { stakeInfo, minimumStake, isPaused, stakeWithPermit, requestUnstake, refetchStake, guildTotalStaked } = useGuildStaking(selectedGuild?.blockchainGuildId);
  const { executeWithPermit } = usePermitOrApprove();
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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStakeAmount("");
      setStep("input");
      setTxHash(null);
      setActionMode(defaultMode || "stake");
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
    }
  }, [isOpen, address, selectedGuild]);

  // Handle transaction confirmation
  useEffect(() => {
    if (txConfirmed && txHash && step === "transaction") {
      setTxStatus("success");
      refetchBalance();
      refetchStake();
      // Sync stake to database in the background — don't call onSuccess yet.
      // onSuccess (which refreshes the parent page) is deferred to when the
      // user dismisses the success screen so they can see the confirmation.
      if (address && selectedGuild) {
        retryWithBackoff(
          () => blockchainApi.syncStake(address, selectedGuild.blockchainGuildId),
          [2000, 4000, 6000],
          () => toast.warning("Stake confirmed on-chain but server sync delayed."),
        );
      }
    }
  }, [txConfirmed, txHash, step]);

  // Handle transaction errors
  useEffect(() => {
    if (txError && txHash && step === "transaction") {
      const errorMessage = getTransactionErrorMessage(txErrorDetails, "Transaction failed on blockchain");
      setTxStatus("error");
      setTxErrorMessage(errorMessage);
      logger.error("Transaction error", txErrorDetails, { silent: true });
    }
  }, [txError, txHash, step, txErrorDetails]);

  /** Stake via EIP-2612 permit (1 signature + 1 TX). */
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

    setStep("transaction");
    setCurrentTxAmount(stakeAmount);
    setCurrentTxAction("stake");
    setShowTxModal(true);
    setTxStatus("pending");

    try {
      const result = await executeWithPermit(
        CONTRACT_ADDRESSES.STAKING,
        stakeAmount,
        (permit) => stakeWithPermit(
          selectedGuild.blockchainGuildId,
          stakeAmount,
          permit.deadline,
          permit.v,
          permit.r,
          permit.s,
        ),
      );

      setTxHash(result.hash);
    } catch (error: unknown) {
      if (isUserRejection(error)) {
        toast.error("Transaction rejected");
        setShowTxModal(false);
      } else {
        logger.error("Staking error", error, { silent: true });
        setTxStatus("error");
        setTxErrorMessage(getTransactionErrorMessage(error, "Transaction failed"));
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
      logger.error("Withdrawal error", error, { silent: true });

      if (isUserRejection(error)) {
        toast.error("Transaction rejected by user");
        setShowTxModal(false);
      } else {
        setTxStatus("error");
        setTxErrorMessage(getTransactionErrorMessage(error, "Failed to withdraw tokens"));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-modal-backdrop-in">
      {/* Gradient border glow wrapper — matches endorsement modal */}
      <div className="max-w-[480px] w-full mx-4 rounded-xl border border-border p-px animate-modal-scale-in">
        <div
          className="relative w-full max-h-[90vh] flex flex-col overflow-hidden rounded-xl shadow-2xl bg-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="relative flex-shrink-0">
            {/* Decorative glow layer */}
            <div className="absolute inset-0 overflow-hidden rounded-t-3xl pointer-events-none">
              <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/5 rounded-full blur-[100px]" />
            </div>

            {/* Content */}
            <div className="relative px-6 pt-8 pb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground leading-tight">Manage Staking</h2>
                <p className="text-xs text-muted-foreground mt-1">Stake VETD per guild to unlock reviewing</p>
              </div>
              <button
                onClick={handleClose}
                disabled={step === "transaction"}
                aria-label="Close staking modal"
                className="group w-8 h-8 flex items-center justify-center rounded-full bg-muted/30 hover:bg-muted/50 border border-border transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </div>

            {/* Gradient divider */}
            <div className="h-px bg-border" />
          </div>

          {/* ── Content ── */}
          <div className="px-6 pt-5 pb-6 space-y-4 flex-1 overflow-y-auto min-h-0">
            {/* Wrong Network Warning */}
            {!isOnSepolia && (
              <div className={`p-3.5 ${STATUS_COLORS.warning.bgSubtle} border ${STATUS_COLORS.warning.border} rounded-xl flex items-center gap-3`}>
                <div className={`w-9 h-9 rounded-xl ${STATUS_COLORS.warning.bgSubtle} flex items-center justify-center flex-shrink-0`}>
                  <AlertTriangle className={`w-4.5 h-4.5 ${STATUS_COLORS.warning.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${STATUS_COLORS.warning.text}`}>Wrong Network</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Switch to Sepolia Testnet to continue.</p>
                </div>
                <Button
                  onClick={() => switchChain({ chainId: sepolia.id })}
                  size="sm"
                  className={`${STATUS_COLORS.warning.bg} hover:opacity-90 text-white text-xs rounded-lg shadow-sm flex-shrink-0`}
                >
                  Switch
                </Button>
              </div>
            )}

            {/* Contract Paused Warning */}
            {isPaused && isOnSepolia && (
              <div className={`p-3.5 ${STATUS_COLORS.negative.bgSubtle} border ${STATUS_COLORS.negative.border} rounded-xl flex items-center gap-3`}>
                <div className={`w-9 h-9 rounded-xl ${STATUS_COLORS.negative.bgSubtle} flex items-center justify-center flex-shrink-0`}>
                  <AlertTriangle className={`w-4.5 h-4.5 ${STATUS_COLORS.negative.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${STATUS_COLORS.negative.text}`}>Staking Paused</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Contract is paused. Try again later.</p>
                </div>
              </div>
            )}

            {(
              <>
                {/* ── Action Mode Toggle ── */}
                <div className="flex p-1 bg-muted/30 rounded-xl border border-border">
                  <button
                    onClick={() => setActionMode("stake")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                      actionMode === "stake"
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Stake
                  </button>
                  <button
                    onClick={() => setActionMode("withdraw")}
                    disabled={!currentStake || currentStake === 0}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                      actionMode === "withdraw"
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    Withdraw
                  </button>
                </div>

                {/* ── Guild Card (with left accent bar like endorsement candidate card) ── */}
                <div className="relative rounded-xl bg-muted/20 border border-border p-4 flex overflow-hidden">
                  {/* Left accent bar */}
                  <div className="w-0.5 bg-border rounded-full -my-4 -ml-4 mr-4 flex-shrink-0" />
                  {isGuildLocked ? (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold truncate">{selectedGuild?.name || "Loading..."}</h4>
                        <p className="text-xs text-muted-foreground">Guild</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowGuildDropdown(!showGuildDropdown)}
                      disabled={isLoadingGuilds || step !== "input"}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold truncate">
                          {isLoadingGuilds ? "Loading..." : selectedGuild ? selectedGuild.name : "Select guild"}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {selectedGuild ? "Guild" : "Choose a guild to stake for"}
                        </p>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${showGuildDropdown ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>

                {/* Guild dropdown */}
                {!isGuildLocked && showGuildDropdown && guilds && guilds.length > 0 && (
                  <div className="rounded-xl shadow-2xl border border-border bg-card max-h-48 overflow-y-auto -mt-2">
                    {guilds.map((guild) => (
                      <button
                        key={guild.id}
                        onClick={() => {
                          setSelectedGuild(guild);
                          setShowGuildDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 transition-all text-sm first:rounded-t-2xl last:rounded-b-2xl ${
                          selectedGuild?.id === guild.id
                            ? "bg-primary/15 text-primary font-medium"
                            : "text-foreground hover:bg-muted/50"
                        }`}
                      >
                        {guild.name}
                      </button>
                    ))}
                  </div>
                )}
                {!isGuildLocked && (!guilds || guilds.length === 0) && !isLoadingGuilds && (
                  <p className="text-xs text-muted-foreground text-center">
                    No guilds available. Join a guild first.
                  </p>
                )}

                {/* ── Balance & Staked (inline like endorsement modal) ── */}
                <div className="flex items-center justify-between text-xs px-1">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Balance:</span>
                    <span className="font-medium tabular-nums">
                      {formatTokenAmount(currentBalance)} {balanceLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span className="text-primary/70">Staked:</span>
                    <span className="font-medium text-primary tabular-nums">
                      {selectedGuild ? `${formatTokenAmount(currentStake)} ${stakeLabel}` : "—"}
                    </span>
                  </div>
                </div>

                {/* ── Amount Input Card ── */}
                <div className="rounded-xl bg-muted/20 border border-border p-4 space-y-2 transition-colors focus-within:border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {actionMode === "stake" ? "Your stake" : "You withdraw"}
                    </span>
                    <button
                      onClick={handleMaxClick}
                      className="text-xs font-bold text-primary/70 hover:text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded transition-all tracking-wider uppercase"
                    >
                      MAX
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder={actionMode === "stake" ? `Min: ${formatTokenAmount(minStake, 0)}` : "0.00"}
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      disabled={step === "transaction"}
                      className="flex-1 bg-transparent text-3xl font-bold text-foreground placeholder:text-muted-foreground/30 outline-none tabular-nums min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/30 border border-border flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-foreground">V</span>
                      </div>
                      <span className="text-sm font-medium">VETD</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/60">
                    {actionMode === "stake"
                      ? `Min. ${formatTokenAmount(minStake)} VETD`
                      : `Available: ${formatTokenAmount(currentStake)} VETD`}
                  </p>
                </div>

                {/* ── Quick Amount Buttons ── */}
                {actionMode === "stake" ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Min +10%", getValue: () => (minStake * 1.1).toFixed(2) },
                      { label: "Min +50%", getValue: () => (minStake * 1.5).toFixed(2) },
                      { label: "25% Bal", getValue: () => currentBalance ? (currentBalance * 0.25).toFixed(2) : "0" },
                      { label: "50% Bal", getValue: () => currentBalance ? (currentBalance * 0.5).toFixed(2) : "0" },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        onClick={() => setStakeAmount(btn.getValue())}
                        disabled={step === "transaction"}
                        className="h-10 text-xs font-medium rounded-lg border border-border bg-muted/20 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "25%", factor: 0.25 },
                      { label: "50%", factor: 0.5 },
                      { label: "75%", factor: 0.75 },
                      { label: "100%", factor: 1 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        onClick={() => setStakeAmount(currentStake ? (currentStake * btn.factor).toFixed(2) : "0")}
                        disabled={step === "transaction"}
                        className="h-10 text-xs font-medium rounded-lg border border-border bg-muted/20 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Action Buttons (matching endorsement modal layout) ── */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    disabled={step === "transaction"}
                    className="flex-[0.4] h-[3.25rem] rounded-xl border-border bg-muted/30 hover:bg-muted/50 font-medium"
                  >
                    Cancel
                  </Button>
                  <button
                    onClick={actionMode === "stake" ? handleStake : handleWithdraw}
                    disabled={
                      !isOnSepolia ||
                      isPaused ||
                      step === "transaction" ||
                      !stakeAmount ||
                      parseFloat(stakeAmount) <= 0 ||
                      !selectedGuild
                    }
                    className="flex-[0.6] h-[3.25rem] flex items-center justify-center gap-2 rounded-xl font-bold text-sm bg-primary text-primary-foreground shadow-xl hover:brightness-110 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {actionMode === "stake" ? (
                      <>
                        <TrendingUp className="w-4 h-4" />
                        {selectedGuild ? `Stake for ${selectedGuild.name}` : "Select Guild"}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4" />
                        {selectedGuild ? `Withdraw` : "Select Guild"}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
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
