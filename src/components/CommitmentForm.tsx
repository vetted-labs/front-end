"use client";

import { useMemo, useState } from "react";
import { useAccount, usePublicClient, useChainId } from "wagmi";
import { sepolia, foundry } from "wagmi/chains";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { reviewsApi, extractApiError, ApiError } from "@/lib/api";
import { useVettingManager } from "@/lib/hooks/useVettedContracts";
import { useReviewDraft } from "@/lib/hooks/useReviewDraft";
import { useReviewState } from "@/lib/hooks/useReviewState";
import {
  OnChainStatusBanner,
  type OnChainStatus,
} from "@/components/reviews/OnChainStatusBanner";

interface CommitmentFormProps {
  applicationId: string; // proposalId
  expertId: string;
  /**
   * Wallet bound to the reviewer in auth context. We refuse to submit unless
   * the connected wallet matches this — prevents accidentally signing with
   * a different account than the one registered for the panel seat.
   */
  expertWallet: string;
  requiredStake: number;
  blockchainSessionId?: string;
  blockchainSessionCreated?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

type Body = { score: number; stake: number };

export function CommitmentForm({
  applicationId,
  expertWallet,
  requiredStake,
  blockchainSessionId,
  blockchainSessionCreated,
  onSubmit,
  onCancel,
}: CommitmentFormProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { commitVote } = useVettingManager(
    blockchainSessionId as `0x${string}` | undefined
  );
  const draft = useReviewDraft<Body>("proposal", applicationId, {
    score: 50,
    stake: requiredStake,
  });
  const state = useReviewState("proposal", applicationId);
  const [submitState, setSubmitState] = useState<OnChainStatus>({ kind: "ready" });

  const sessionReady = !!blockchainSessionId && !!blockchainSessionCreated;
  // E2E mode also accepts foundry (anvil) — gated by NEXT_PUBLIC_E2E_MODE.
  // Production is sepolia-only.
  const onSepolia =
    chainId === sepolia.id ||
    (process.env.NEXT_PUBLIC_E2E_MODE === "true" && chainId === foundry.id);
  const walletMatches = !!(
    address && address.toLowerCase() === expertWallet.toLowerCase()
  );

  const banner: OnChainStatus = useMemo(() => {
    if (state.data?.kind === "committed") {
      return { kind: "confirmed", txHash: state.data.txHash || "0x0" };
    }
    if (!sessionReady) return { kind: "preparing_session" };
    return submitState;
  }, [state.data, sessionReady, submitState]);

  // Crash recovery: if the BE state says committed, this is read-only.
  if (state.data?.kind === "committed") {
    return (
      <div className="space-y-4">
        <OnChainStatusBanner status={banner} sessionId={blockchainSessionId} />
        <p className="text-sm text-muted-foreground">
          Your vote was committed on-chain. It will be revealed automatically
          when all reviewers commit.
        </p>
        <Button variant="outline" onClick={onCancel} className="w-full">
          Close
        </Button>
      </div>
    );
  }

  const canSubmit =
    sessionReady &&
    isConnected &&
    onSepolia &&
    walletMatches &&
    submitState.kind === "ready";

  const handleSubmit = async () => {
    if (!sessionReady || !isConnected || !onSepolia || !walletMatches) return;
    try {
      setSubmitState({ kind: "awaiting_signature" });
      // 1. Get expected commit hash from BE (server derives the salt deterministically).
      const ch = await reviewsApi.proposal.getCommitHash(
        applicationId,
        draft.body.score
      );
      const expectedCommitHash = ch.expectedCommitHash;

      // 2. Sign on-chain.
      const txHash = await commitVote(
        expectedCommitHash as `0x${string}`
      );
      setSubmitState({ kind: "confirming", txHash });

      // 3. Wait for finality (12 blocks).
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 12,
        });
      }

      // 4. Submit to BE for verification + persistence — with retry.
      // BE's RPC node can lag the FE's by a block, returning 400
      // "Awaiting finality (N blocks remaining)" right after the FE's
      // waitForTransactionReceipt resolves. Retry with backoff so a
      // successful tx isn't surfaced as a hard failure.
      await submitWithRetry(applicationId, draft.body.score, txHash);

      setSubmitState({ kind: "confirmed", txHash });
      toast.success("Vote committed on-chain");
      onSubmit();
    } catch (err: unknown) {
      const reason = extractApiError(err, "On-chain commit failed");
      setSubmitState({ kind: "failed", reason, canRetry: true });
      toast.error(reason);
    }
  };

  const submitWithRetry = async (
    applicationId: string,
    score: number,
    txHash: `0x${string}`,
  ): Promise<void> => {
    const delays = [1000, 2000, 4000, 8000, 16000];
    let lastErr: unknown = null;
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        await reviewsApi.proposal.submit(applicationId, { score, txHash });
        return;
      } catch (err: unknown) {
        lastErr = err;
        // 409 = BE already recorded this commit (idempotent success).
        if (err instanceof ApiError && err.status === 409) return;
        const isFinalityRace =
          err instanceof ApiError &&
          err.status === 400 &&
          /awaiting finality/i.test(err.message);
        const isTransient =
          isFinalityRace ||
          (err instanceof ApiError && err.status >= 500) ||
          (!(err instanceof ApiError) && err instanceof Error);
        if (!isTransient) throw err;
        const delay = delays[attempt];
        if (delay === undefined) break;
        setSubmitState({
          kind: "recovering",
          reason: extractApiError(err, "Backend submit failed"),
          txHash,
          attempt: attempt + 2,
          nextRetryInMs: delay,
        });
        await new Promise<void>((r) => setTimeout(r, delay));
      }
    }
    throw lastErr ?? new Error("Submit failed after retries");
  };

  return (
    <div className="space-y-4">
      <OnChainStatusBanner
        status={banner}
        sessionId={blockchainSessionId}
        onRetry={() => setSubmitState({ kind: "ready" })}
      />

      {!walletMatches && isConnected && (
        <p className="text-sm text-destructive">
          Connected wallet does not match your registered reviewer wallet.
          Switch to {truncate(expertWallet)}.
        </p>
      )}
      {!onSepolia && isConnected && (
        <p className="text-sm text-destructive">
          Wrong network. Switch to Sepolia testnet.
        </p>
      )}

      {/* Score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Your Score</label>
          <Badge variant="secondary" className="text-base px-3">
            {draft.body.score}/100
          </Badge>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={draft.body.score}
          onChange={(e) => draft.update({ score: parseInt(e.target.value) })}
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
          value={draft.body.stake}
          onChange={(e) => draft.update({ stake: Number(e.target.value) })}
        />
        <p className="text-xs text-muted-foreground">
          Minimum: {requiredStake} VETD
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1"
        >
          {submitState.kind === "awaiting_signature" ||
          submitState.kind === "confirming" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting…
            </>
          ) : (
            "Sign & Submit On-Chain"
          )}
        </Button>
      </div>
    </div>
  );
}

function truncate(s: string) {
  if (s.length <= 10) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}
