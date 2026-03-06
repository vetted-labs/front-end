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
  /** Hash of the ERC-20 approval transaction (always undefined — permit only) */
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
  /** Place an endorsement bid via EIP-2612 permit (1 signature + 1 TX) */
  submitEndorsement: (app: EndorsableApplication, amount: string) => Promise<void>;
  /** Reset all transaction state back to idle */
  resetTransaction: () => void;
  /** Refresh balance from chain */
  refetchTokenData: () => void;
}

/**
 * Manages the full endorsement transaction lifecycle with EIP-2612 permit:
 *
 *   1. Sign EIP-712 permit (off-chain, free, no gas)
 *   2. Call placeBidWithPermit() — single on-chain transaction
 */
export function useEndorsementTransaction(
  refetchCallbacks: RefetchCallbacks
): UseEndorsementTransactionReturn {
  const { address } = useAccount();
  const { balance, refetchBalance } =
    useVettedToken();
  const { placeBidWithPermit, minimumBid } = useEndorsementBidding();
  const { executeWithPermit } = usePermitOrApprove();

  // Transaction flow state
  const [txStep, setTxStep] = useState<TransactionStep>("idle");
  const [txError, setTxError] = useState<string | null>(null);
  const [bidTxHash, setBidTxHash] = useState<`0x${string}` | undefined>();
  const [endorsing, setEndorsing] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // Pending bid data for the confirmation handler
  const [pendingApp, setPendingApp] = useState<EndorsableApplication | null>(null);

  const { data: txReceipt, isSuccess: txSuccess, isError: txFailed, error: txFailDetails } = useTransactionConfirmation(txHash);

  // ── Handle on-chain transaction failure ──
  useEffect(() => {
    if (!txFailed || !txHash) return;

    const errorMessage = getTransactionErrorMessage(txFailDetails, "Transaction failed on blockchain");
    setTxStep("error");
    setTxError(errorMessage);
    toast.error(errorMessage);
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
      setEndorsing(false);
      return;
    }

    if (endorsing && pendingApp) {
      // Bid confirmed
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
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSuccess, txReceipt, endorsing]);

  // ── Public: submit an endorsement via permit (1 signature + 1 TX) ──
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

      setTxError(null);
      setTxStep("signing");

      const { hash } = await executeWithPermit(
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

      setTxStep("bidding");
      setEndorsing(true);
      setBidTxHash(hash);
      setTxHash(hash);
      toast.success("Endorsement submitted! Waiting for confirmation...");
    },
    [minimumBid, balance, executeWithPermit, placeBidWithPermit]
  );

  // ── Public: reset state (e.g. when closing the modal) ──
  const resetTransaction = useCallback(() => {
    setTxStep("idle");
    setTxError(null);
    setBidTxHash(undefined);
    setEndorsing(false);
    setTxHash(undefined);
    setPendingApp(null);
  }, []);

  const refetchTokenData = useCallback(() => {
    refetchBalance();
  }, [refetchBalance]);

  return {
    txStep,
    txError,
    approvalTxHash: undefined,
    bidTxHash,
    isTransacting: txStep === "signing" || endorsing,
    balance,
    minimumBidFormatted: minimumBid ? formatEther(minimumBid) : "1",
    minimumBid,
    submitEndorsement,
    resetTransaction,
    refetchTokenData,
  };
}
