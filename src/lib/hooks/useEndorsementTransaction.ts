import { useState, useEffect, useCallback, useRef } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import {
  useTokenBalance,
  useEndorsementBidding,
} from "@/lib/hooks/useVettedContracts";
import { usePermitOrApprove } from "@/lib/hooks/usePermitOrApprove";
import { CONTRACT_ADDRESSES } from "@/contracts/abis";
import { blockchainApi } from "@/lib/api";
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

export type TransactionStep =
  | "idle"
  | "signing"
  | "approving"
  | "bidding"
  | "success"
  | "error";

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
  submitEndorsement: (
    app: EndorsableApplication,
    amount: string,
    availableBalanceOverride?: bigint,
  ) => Promise<void>;
  /** Reset all transaction state back to idle */
  resetTransaction: () => void;
  /** Refresh balance from chain */
  refetchTokenData: () => void;
}

async function syncEndorsementWithRetry(
  app: EndorsableApplication,
  walletAddress: `0x${string}`,
  delays: number[] = [1000, 2000, 4000, 6000],
): Promise<boolean> {
  for (let attempt = 0; attempt < delays.length; attempt++) {
    try {
      await blockchainApi.syncEndorsement(
        app.application_id,
        walletAddress,
        app.job_id,
        app.candidate_id,
      );
      return true;
    } catch (error) {
      if (attempt >= delays.length - 1) {
        logger.warn("Endorsement sync retry exhausted", error, {
          silent: true,
        });
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
  return false;
}

async function waitForInjectedReceipt(hash: `0x${string}`): Promise<void> {
  const provider = typeof window !== "undefined" ? window.ethereum : undefined;
  if (!provider?.request) return;

  for (let attempt = 0; attempt < 30; attempt++) {
    const receipt = (await provider.request({
      method: "eth_getTransactionReceipt",
      params: [hash],
    })) as { status?: string } | null;

    if (receipt) {
      if (receipt.status === "0x0") {
        throw new Error(`Endorsement transaction reverted: ${hash}`);
      }
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Endorsement transaction was not confirmed: ${hash}`);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

/**
 * Manages the full endorsement transaction lifecycle with EIP-2612 permit:
 *
 *   1. Sign EIP-712 permit (off-chain, free, no gas)
 *   2. Call placeBidWithPermit() — single on-chain transaction
 */
export function useEndorsementTransaction(
  refetchCallbacks: RefetchCallbacks,
): UseEndorsementTransactionReturn {
  const { address } = useAccount();
  const { balance, refetchBalance } = useTokenBalance();
  const { placeBidWithPermit, minimumBid } = useEndorsementBidding();
  const { executeWithPermit } = usePermitOrApprove();

  // Transaction flow state
  const [txStep, setTxStep] = useState<TransactionStep>("idle");
  const [txError, setTxError] = useState<string | null>(null);
  const [bidTxHash, setBidTxHash] = useState<`0x${string}` | undefined>();
  const [endorsing, setEndorsing] = useState(false);

  const refetchCallbacksRef = useRef(refetchCallbacks);
  // eslint-disable-next-line no-restricted-syntax
  useEffect(() => {
    refetchCallbacksRef.current = refetchCallbacks;
  });

  // ── Public: submit an endorsement via permit (1 signature + 1 TX) ──
  const submitEndorsement = useCallback(
    async (
      app: EndorsableApplication,
      amount: string,
      availableBalanceOverride?: bigint,
    ) => {
      // Validate: existing bid must be topped
      if (
        app.current_bid &&
        parseFloat(amount) <= parseFloat(app.current_bid)
      ) {
        throw new Error(
          `New bid must be higher than your current bid of ${parseFloat(app.current_bid).toFixed(2)} VETD`,
        );
      }

      const minBid = minimumBid ? formatEther(minimumBid) : "1";
      if (!app.current_bid && parseFloat(amount) < parseFloat(minBid)) {
        throw new Error(`Minimum bid is ${minBid} VETD`);
      }

      const currentBalance =
        availableBalanceOverride !== undefined
          ? formatEther(availableBalanceOverride)
          : balance
            ? formatEther(balance)
            : "0";
      if (parseFloat(currentBalance) < parseFloat(amount)) {
        throw new Error(
          `Insufficient VETD balance. You have ${parseFloat(currentBalance).toFixed(2)} VETD but need ${amount} VETD`,
        );
      }

      setTxError(null);
      setTxStep("signing");

      // Ensure the job exists on-chain before attempting the bid
      try {
        await blockchainApi.ensureJobOnChain(app.job_id);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to prepare job on blockchain";
        setTxStep("error");
        setTxError(msg);
        toast.error(
          "Could not verify job on blockchain. Please try again later.",
        );
        return;
      }

      try {
        const { hash } = await executeWithPermit(
          CONTRACT_ADDRESSES.ENDORSEMENT,
          amount,
          (permit) =>
            placeBidWithPermit(
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
        toast.success("Endorsement submitted! Waiting for confirmation...");

        await waitForInjectedReceipt(hash);

        const callbacks = refetchCallbacksRef.current;
        if (address) {
          const synced = await syncEndorsementWithRetry(app, address);
          if (synced) {
            callbacks.refetchEndorsements();
          } else {
            toast.warning(
              "Your endorsement is confirmed on-chain but could not be synced to the server. It will sync automatically within a few minutes.",
            );
          }
        }

        setTxStep("success");
        setEndorsing(false);
        toast.success(
          "Endorsement confirmed! Rewards will be distributed on candidate hire.",
        );

        setTimeout(() => {
          callbacks.reloadApplications();
          callbacks.refetchEndorsements();
          refetchBalance();
        }, 2000);
      } catch (error) {
        const msg = getErrorMessage(error, "Failed to place endorsement");
        setTxStep("error");
        setTxError(msg);
        setEndorsing(false);
        toast.error(msg);
        throw error;
      }
    },
    [
      minimumBid,
      balance,
      address,
      executeWithPermit,
      placeBidWithPermit,
      refetchBalance,
    ],
  );

  // ── Public: reset state (e.g. when closing the modal) ──
  const resetTransaction = useCallback(() => {
    setTxStep("idle");
    setTxError(null);
    setBidTxHash(undefined);
    setEndorsing(false);
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
