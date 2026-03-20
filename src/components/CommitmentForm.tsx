"use client";

import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { commitRevealApi } from "@/lib/api";
import { logger } from "@/lib/logger";
import {
  generateBytes32Salt,
  computeOnChainCommitHash,
  mapScoreToChain,
  isUserRejection,
  getTransactionErrorMessage,
} from "@/lib/blockchain";
import { useVettingManager } from "@/lib/hooks/useVettedContracts";

interface CommitmentFormProps {
  applicationId: string;
  expertId: string;
  requiredStake: number;
  onSubmit: () => void;
  onCancel: () => void;
  blockchainSessionId?: string;
  blockchainSessionCreated?: boolean;
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function CommitmentForm({
  applicationId,
  expertId,
  requiredStake,
  onSubmit,
  onCancel,
  blockchainSessionId,
  blockchainSessionCreated,
}: CommitmentFormProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [score, setScore] = useState(50);
  const [nonce] = useState(generateNonce);
  const [stakeAmount, setStakeAmount] = useState(requiredStake.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionIdBytes32 = blockchainSessionId as `0x${string}` | undefined;
  const { commitVote, isCommitted } = useVettingManager(sessionIdBytes32);

  const hasOnChainSession = !!blockchainSessionId && blockchainSessionCreated;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      let onChainCommitHash: string | undefined;
      let onChainSalt: string | undefined;
      let onChainScore: number | undefined;
      let onChainTxHash: string | undefined;

      // Step 1: On-chain commit if blockchain session is ready
      if (hasOnChainSession && address && sessionIdBytes32) {
        if (isCommitted) {
          // Already committed on-chain — skip wallet interaction
          logger.info("On-chain commit already exists", { silent: true });
          toast.info("On-chain vote already committed — saving to backend.");
        } else {
          // Fresh commit
          const salt = generateBytes32Salt();
          onChainScore = mapScoreToChain(score);
          onChainCommitHash = computeOnChainCommitHash(
            sessionIdBytes32,
            address,
            onChainScore,
            salt
          );
          onChainSalt = salt;

          // Send on-chain TX and wait for confirmation
          const txHash = await commitVote(onChainCommitHash as `0x${string}`);
          onChainTxHash = txHash;

          if (publicClient) {
            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
            if (receipt.status === "reverted") {
              throw new Error("On-chain commit transaction was reverted");
            }
          }
        }
      }

      // Step 2: Generate off-chain hash via backend
      const hashResponse = await commitRevealApi.generateHash(score, nonce);

      // Step 3: Submit commitment with score + nonce to backend (auto-reveal when all commit)
      await commitRevealApi.submitCommitment(applicationId, {
        expertId,
        commitHash: hashResponse.hash,
        score,
        nonce,
        stakeAmount: parseFloat(stakeAmount),
        onChainCommitHash,
        onChainSalt,
        onChainScore,
        onChainTxHash,
      });

      toast.success("Vote submitted! It will be revealed automatically when all reviewers have voted.");
      onSubmit();
    } catch (error: unknown) {
      if (isUserRejection(error)) {
        toast.error("Transaction rejected in wallet");
        return;
      }
      logger.error("Commitment error", error, { silent: true });
      toast.error(getTransactionErrorMessage(error, "Failed to submit commitment"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disable if on-chain session exists but isn't created yet
  const sessionPending = !!blockchainSessionId && !blockchainSessionCreated;

  return (
    <div className="space-y-5">
      {/* Session pending notice */}
      {sessionPending && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
          <Clock className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Session being created...</p>
            <p className="text-muted-foreground">
              The on-chain voting session is being set up. This usually takes a minute.
            </p>
          </div>
        </div>
      )}

      {/* Score Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Your Score</label>
          <Badge variant="secondary" className="text-base px-3">
            {score}/100
          </Badge>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={score}
          onChange={(e) => setScore(parseInt(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Reject (0)</span>
          <span>Neutral (50)</span>
          <span>Approve (100)</span>
        </div>
      </div>

      {/* Stake */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Stake Amount (VETD)</label>
        <Input
          type="number"
          min={requiredStake}
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Minimum: {requiredStake} VETD</p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || sessionPending}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {hasOnChainSession ? "Confirm in wallet..." : "Submitting..."}
            </>
          ) : sessionPending ? (
            "Session being created..."
          ) : hasOnChainSession ? (
            "Sign & Submit Vote"
          ) : (
            "Submit Vote"
          )}
        </Button>
      </div>
    </div>
  );
}
