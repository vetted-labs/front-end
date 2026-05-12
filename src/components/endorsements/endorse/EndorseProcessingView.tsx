"use client";

import { Wallet, Zap, ExternalLink } from "lucide-react";
import { getExplorerTxUrl } from "@/lib/blockchain";
import type { TransactionStep } from "@/lib/hooks/useEndorsementTransaction";

export interface EndorseProcessingViewProps {
  txStep: Extract<TransactionStep, "signing" | "approving" | "bidding">;
  bidAmount: string;
  approvalTxHash?: `0x${string}`;
  bidTxHash?: `0x${string}`;
}

export function EndorseProcessingView({
  txStep,
  bidAmount,
  approvalTxHash,
  bidTxHash,
}: EndorseProcessingViewProps) {
  const isPermitPath = txStep === "signing" || (txStep === "bidding" && !approvalTxHash);
  const Icon = txStep === "bidding" ? Zap : Wallet;

  const title =
    txStep === "signing"
      ? "Sign permit…"
      : txStep === "approving"
        ? "Approving tokens…"
        : "Placing endorsement…";

  const subtitle =
    txStep === "signing"
      ? "Sign the message in your wallet"
      : "Confirm the transaction in your wallet";

  const detailLine =
    txStep === "signing"
      ? `Authorizing ${bidAmount} VETD for endorsement`
      : txStep === "approving"
        ? `Step 1/2: Approving ${bidAmount} VETD`
        : isPermitPath
          ? `Endorsing with ${bidAmount} VETD`
          : `Step 2/2: Endorsing with ${bidAmount} VETD`;

  const txHash = txStep === "approving" ? approvalTxHash : bidTxHash;

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse scale-125" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="w-8 h-8 text-primary" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>

      <div className="rounded-xl bg-muted/20 border border-border p-4 max-w-sm">
        <p className="text-xs text-muted-foreground">
          <span className="text-primary font-medium">{detailLine}</span>
        </p>
        {txStep === "signing" && (
          <p className="text-xs text-primary/60 mt-2 font-medium">No gas required</p>
        )}
        {txHash && (
          <a
            href={getExplorerTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center justify-center gap-2 mt-2"
          >
            View on Etherscan <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground/70 max-w-xs">
        Keep this window open until the transaction confirms.
      </p>
    </div>
  );
}
