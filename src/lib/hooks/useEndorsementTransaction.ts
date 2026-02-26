import { useState, useEffect, useCallback } from "react";
import { formatEther } from "viem";
import {
  useVettedToken,
  useEndorsementBidding,
  useTransactionConfirmation,
} from "@/lib/hooks/useVettedContracts";
import { CONTRACT_ADDRESSES } from "@/contracts/abis";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

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

export type TransactionStep = "idle" | "approving" | "bidding" | "success" | "error";

interface RefetchCallbacks {
  reloadApplications: () => void;
  refetchEndorsements: () => void;
}

interface UseEndorsementTransactionReturn {
  /** Current step of the multi-step transaction flow */
  txStep: TransactionStep;
  /** Human-readable error message when txStep is "error" */
  txError: string | null;
  /** Hash of the ERC-20 approval transaction, if applicable */
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
  /** Place an endorsement bid, handling approval if needed */
  submitEndorsement: (app: EndorsableApplication, amount: string) => Promise<void>;
  /** Reset all transaction state back to idle */
  resetTransaction: () => void;
  /** Refresh balance and allowance from chain */
  refetchTokenData: () => void;
}

/**
 * Manages the full endorsement transaction lifecycle:
 * 1. Validates bid amount against balance, minimum bid, and existing bids
 * 2. Checks ERC-20 allowance; triggers approval tx if insufficient
 * 3. Waits for approval confirmation, then places the bid tx
 * 4. Tracks success/error states with transaction hashes
 */
export function useEndorsementTransaction(
  refetchCallbacks: RefetchCallbacks
): UseEndorsementTransactionReturn {
  const { balance, endorsementAllowance, approve, refetchBalance, refetchEndorsementAllowance } =
    useVettedToken();
  const { placeBid, minimumBid } = useEndorsementBidding();

  // Transaction flow state
  const [txStep, setTxStep] = useState<TransactionStep>("idle");
  const [txError, setTxError] = useState<string | null>(null);
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | undefined>();
  const [bidTxHash, setBidTxHash] = useState<`0x${string}` | undefined>();

  // Internal flags for the approval-then-bid handoff
  const [approving, setApproving] = useState(false);
  const [endorsing, setEndorsing] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // Pending bid data kept across the async approval -> bid flow
  const [pendingApp, setPendingApp] = useState<EndorsableApplication | null>(null);
  const [pendingAmount, setPendingAmount] = useState<string>("");

  const { data: txReceipt, isSuccess: txSuccess } = useTransactionConfirmation(txHash);

  // ── Handle transaction confirmations ──
  useEffect(() => {
    if (!txSuccess || !txReceipt) return;

    if (approving && pendingApp) {
      // Approval confirmed -- proceed to place bid
      setApproving(false);
      refetchEndorsementAllowance();

      // Small delay so the allowance read picks up the new value
      setTimeout(() => {
        executePlaceBid(pendingApp, pendingAmount);
      }, 1000);
    } else if (endorsing) {
      // Bid confirmed
      setTxStep("success");
      toast.success("Endorsement confirmed! Rewards will be distributed on candidate hire.");
      setEndorsing(false);

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

  // ── Internal: send approval tx ──
  const executeApprove = useCallback(
    async (amount: string) => {
      try {
        setTxStep("approving");
        setApproving(true);
        setTxError(null);

        const hash = await approve(CONTRACT_ADDRESSES.ENDORSEMENT as `0x${string}`, amount);
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
    [approve, refetchEndorsementAllowance]
  );

  // ── Internal: send bid tx ──
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

        const errMsg = error instanceof Error ? error.message : "";
        const shortMsg = (error as { shortMessage?: string })?.shortMessage;

        let errorMsg = "Failed to place endorsement";

        if (errMsg.includes("InvalidJob")) {
          errorMsg = "This job needs blockchain initialization. Please contact support.";
        } else if (errMsg.includes("gas")) {
          errorMsg = "Transaction failed: Please ensure you have sufficient balance.";
        } else if (shortMsg) {
          errorMsg = shortMsg;
        } else if (errMsg) {
          errorMsg = errMsg;
        }

        setTxError(errorMsg);
        toast.error(errorMsg, errMsg.includes("InvalidJob") ? { duration: 5000 } : undefined);
        setEndorsing(false);
        setApproving(false);
      }
    },
    [placeBid]
  );

  // ── Public: submit an endorsement (validates, then approve-or-bid) ──
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

      // Stash for the approval -> bid handoff
      setPendingApp(app);
      setPendingAmount(amount);
      setEndorsing(true);

      try {
        const currentAllowance = endorsementAllowance ? formatEther(endorsementAllowance) : "0";

        if (parseFloat(currentAllowance) < parseFloat(amount)) {
          toast.info("Step 1/2: Approving tokens for endorsement...");
          await executeApprove(amount);
          // The useEffect above will call executePlaceBid once the approval confirms
          return;
        }

        // Sufficient allowance -- bid directly
        await executePlaceBid(app, amount);
      } catch (error: unknown) {
        setEndorsing(false);
        throw error;
      }
    },
    [minimumBid, balance, endorsementAllowance, executeApprove, executePlaceBid]
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
    isTransacting: approving || endorsing,
    balance,
    minimumBidFormatted: minimumBid ? formatEther(minimumBid) : "1",
    minimumBid,
    submitEndorsement,
    resetTransaction,
    refetchTokenData,
  };
}
