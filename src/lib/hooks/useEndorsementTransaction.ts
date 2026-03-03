import { useState, useEffect, useCallback } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import {
  useVettedToken,
  useEndorsementBidding,
  useTransactionConfirmation,
} from "@/lib/hooks/useVettedContracts";
import { usePermitOrApprove } from "@/lib/hooks/usePermitOrApprove";
import { CONTRACT_ADDRESSES } from "@/contracts/abis";
import { blockchainApi } from "@/lib/api";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { getTransactionErrorMessage } from "@/lib/blockchain";

/** Shape expected by the hook for the application being endorsed. */
export interface EndorsableApplication {
  application_id: string;
  candidate_id: string;
  candidate_name: string;
  job_id: string;
  job_title: string;
  company_name: string;
  current_bid?: string;
}

export type TransactionStep = "idle" | "signing" | "approving" | "bidding" | "success" | "error";

interface RefetchCallbacks {
  reloadApplications: () => void;
  refetchEndorsements: () => void;
}

interface UseEndorsementTransactionReturn {
  /** Current step of the transaction flow */
  txStep: TransactionStep;
  /** Human-readable error message when txStep is "error" */
  txError: string | null;
  /** Hash of the ERC-20 approval transaction (only in fallback path) */
  approvalTxHash: `0x${string}` | undefined;
  /** Hash of the endorsement bid transaction */
  bidTxHash: `0x${string}` | undefined;
  /** Whether any on-chain write is currently in progress */
  isTransacting: boolean;
  /** User's VETD token balance (bigint from contract) */
  balance: bigint | undefined;
  /** Formatted minimum bid in ether units */
  minimumBidFormatted: string;
  /** Raw minimum bid from contract */
  minimumBid: bigint | undefined;
  /** Place an endorsement bid — permit-first with fallback to approve+bid */
  submitEndorsement: (app: EndorsableApplication, amount: string) => Promise<void>;
  /** Reset all transaction state back to idle */
  resetTransaction: () => void;
  /** Refresh balance and allowance from chain */
  refetchTokenData: () => void;
}

/**
 * Manages the full endorsement transaction lifecycle with EIP-2612 permit:
 *
 * Primary flow (1 signature + 1 TX):
 *   1. Sign EIP-712 permit (off-chain, free, no gas)
 *   2. Call placeBidWithPermit() — single on-chain transaction
 *
 * Fallback flow (2 TX, used if wallet rejects typed data signing):
 *   1. approve() TX
 *   2. placeBid() TX
 */
export function useEndorsementTransaction(
  refetchCallbacks: RefetchCallbacks
): UseEndorsementTransactionReturn {
  const { address } = useAccount();
  const { balance, endorsementAllowance, approve, refetchBalance, refetchEndorsementAllowance } =
    useVettedToken();
  const { placeBid, placeBidWithPermit, minimumBid } = useEndorsementBidding();
  const { executeWithPermit } = usePermitOrApprove();

  // Transaction flow state
  const [txStep, setTxStep] = useState<TransactionStep>("idle");
  const [txError, setTxError] = useState<string | null>(null);
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | undefined>();
  const [bidTxHash, setBidTxHash] = useState<`0x${string}` | undefined>();

  // Internal flags for the approval-then-bid fallback handoff
  const [approving, setApproving] = useState(false);
  const [endorsing, setEndorsing] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // Pending bid data kept across the async approval -> bid flow
  const [pendingApp, setPendingApp] = useState<EndorsableApplication | null>(null);
  const [pendingAmount, setPendingAmount] = useState<string>("");

  const { data: txReceipt, isSuccess: txSuccess, isError: txFailed, error: txFailDetails } = useTransactionConfirmation(txHash);

  // ── Handle on-chain transaction failure ──
  useEffect(() => {
    if (!txFailed || !txHash) return;

    const errorMessage = getTransactionErrorMessage(txFailDetails, "Transaction failed on blockchain");
    setTxStep("error");
    setTxError(errorMessage);
    toast.error(errorMessage);
    setApproving(false);
    setEndorsing(false);
    logger.error("On-chain transaction failed", txFailDetails, { silent: true });
  }, [txFailed, txHash, txFailDetails]);

  // ── Handle transaction confirmations ──
  useEffect(() => {
    if (!txSuccess || !txReceipt) return;

    // Guard against reverted transactions that still return a receipt
    if (txReceipt.status === "reverted") {
      setTxStep("error");
      setTxError("Transaction was reverted on-chain");
      toast.error("Transaction was reverted on-chain");
      setApproving(false);
      setEndorsing(false);
      return;
    }

    if (approving && pendingApp) {
      // Approval confirmed -- proceed to place bid (fallback path)
      setApproving(false);
      refetchEndorsementAllowance();

      // Small delay so the allowance read picks up the new value
      setTimeout(() => {
        executePlaceBid(pendingApp, pendingAmount);
      }, 1000);
    } else if (endorsing && pendingApp) {
      // Bid confirmed (either permit path or fallback path)
      setTxStep("success");
      toast.success("Endorsement confirmed! Rewards will be distributed on candidate hire.");
      setEndorsing(false);

      // Sync endorsement to backend DB (fire-and-forget)
      if (address) {
        blockchainApi
          .syncEndorsement(pendingApp.application_id, address, pendingApp.job_id, pendingApp.candidate_id)
          .then(() => {
            refetchCallbacks.refetchEndorsements();
          })
          .catch((err) => {
            logger.error("Failed to sync endorsement to backend", err, { silent: true });
          });
      }

      // Refresh on-chain + backend data after blockchain state settles
      setTimeout(() => {
        refetchCallbacks.reloadApplications();
        refetchCallbacks.refetchEndorsements();
        refetchBalance();
        refetchEndorsementAllowance();
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSuccess, txReceipt, approving, endorsing]);

  // ── Internal: send approval tx (fallback path) ──
  const executeApprove = useCallback(
    async (amount: string) => {
      try {
        setTxStep("approving");
        setApproving(true);
        setTxError(null);

        const hash = await approve(CONTRACT_ADDRESSES.ENDORSEMENT, amount);
        setApprovalTxHash(hash);
        setTxHash(hash);
        toast.success("Approval submitted! Waiting for confirmation...");
      } catch (error: unknown) {
        logger.error("Approval error", error, { silent: true });
        setTxStep("error");
        const msg = error instanceof Error ? error.message : "Failed to approve tokens";
        setTxError(msg);
        toast.error(msg);
        setApproving(false);
        setEndorsing(false);
      }
    },
    [approve]
  );

  // ── Internal: send bid tx (fallback path, or direct if allowance sufficient) ──
  const executePlaceBid = useCallback(
    async (app: EndorsableApplication, amount: string) => {
      try {
        setTxStep("bidding");
        setEndorsing(true);
        setTxError(null);

        const hash = await placeBid(app.job_id, app.candidate_id, amount);
        setBidTxHash(hash);
        setTxHash(hash);
        toast.success("Endorsement submitted! Waiting for confirmation...");
      } catch (error: unknown) {
        logger.error("Endorsement error", error, { silent: true });
        setTxStep("error");

        const errorMsg = getTransactionErrorMessage(error, "Failed to place endorsement");

        setTxError(errorMsg);
        toast.error(errorMsg);
        setEndorsing(false);
        setApproving(false);
      }
    },
    [placeBid]
  );

  // ── Public: submit an endorsement ──
  // Primary: sign permit (off-chain) → placeBidWithPermit (1 TX)
  // Fallback: approve (TX) → placeBid (TX)
  const submitEndorsement = useCallback(
    async (app: EndorsableApplication, amount: string) => {
      // Validate: existing bid must be topped
      if (app.current_bid && parseFloat(amount) <= parseFloat(app.current_bid)) {
        throw new Error(
          `New bid must be higher than your current bid of ${parseFloat(app.current_bid).toFixed(2)} VETD`
        );
      }

      const minBid = minimumBid ? formatEther(minimumBid) : "1";
      if (!app.current_bid && parseFloat(amount) < parseFloat(minBid)) {
        throw new Error(`Minimum bid is ${minBid} VETD`);
      }

      const currentBalance = balance ? formatEther(balance) : "0";
      if (parseFloat(currentBalance) < parseFloat(amount)) {
        throw new Error(
          `Insufficient VETD balance. You have ${parseFloat(currentBalance).toFixed(2)} VETD but need ${amount} VETD`
        );
      }

      // Stash pending data for the confirmation handler
      setPendingApp(app);
      setPendingAmount(amount);

      // ── Try permit path first (1 signature + 1 TX), fall back to approve+bid ──
      setTxError(null);

      try {
        setTxStep("signing");

        const result = await executeWithPermit(
          CONTRACT_ADDRESSES.ENDORSEMENT,
          amount,
          (permit) => placeBidWithPermit(
            app.job_id,
            app.candidate_id,
            amount,
            permit.deadline,
            permit.v,
            permit.r,
            permit.s,
          ),
        );

        if (result.path === "permit") {
          setTxStep("bidding");
          setEndorsing(true);
          setBidTxHash(result.hash);
          setTxHash(result.hash);
          toast.success("Endorsement submitted! Waiting for confirmation...");
          return;
        }
      } catch {
        // User rejected permit — propagate
        setTxStep("idle");
        throw new Error("Transaction rejected by user");
      }

      // ── Fallback: approve → bid (2 TX) ──
      setEndorsing(true);

      try {
        const currentAllowance = endorsementAllowance ? formatEther(endorsementAllowance) : "0";

        if (parseFloat(currentAllowance) < parseFloat(amount)) {
          toast.info("Step 1/2: Approving tokens for endorsement...");
          await executeApprove(amount);
          // The useEffect above will call executePlaceBid once the approval confirms
          return;
        }

        // Sufficient allowance — bid directly
        await executePlaceBid(app, amount);
      } catch (error: unknown) {
        setEndorsing(false);
        throw error;
      }
    },
    [minimumBid, balance, endorsementAllowance, executeWithPermit, placeBidWithPermit, executeApprove, executePlaceBid]
  );

  // ── Public: reset state (e.g. when closing the modal) ──
  const resetTransaction = useCallback(() => {
    setTxStep("idle");
    setTxError(null);
    setApprovalTxHash(undefined);
    setBidTxHash(undefined);
    setApproving(false);
    setEndorsing(false);
    setTxHash(undefined);
    setPendingApp(null);
    setPendingAmount("");
  }, []);

  const refetchTokenData = useCallback(() => {
    refetchBalance();
    refetchEndorsementAllowance();
  }, [refetchBalance, refetchEndorsementAllowance]);

  return {
    txStep,
    txError,
    approvalTxHash,
    bidTxHash,
    isTransacting: txStep === "signing" || approving || endorsing,
    balance,
    minimumBidFormatted: minimumBid ? formatEther(minimumBid) : "1",
    minimumBid,
    submitEndorsement,
    resetTransaction,
    refetchTokenData,
  };
}
