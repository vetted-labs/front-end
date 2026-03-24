"use client";

import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import React from "react";

export type TransactionPhase =
  | "idle"
  | "awaiting-signature"
  | "submitting"
  | "confirming"
  | "confirmed"
  | "failed";

export interface TransactionStatusProps {
  phase: TransactionPhase;
  txHash?: string;
  errorMessage?: string;
  chainExplorerUrl?: string;
  onRetry?: () => void;
}

function getPhaseConfig(phase: TransactionPhase) {
  switch (phase) {
    case "awaiting-signature":
      return {
        icon: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
        label: "Waiting for wallet signature...",
        color: "text-primary",
      };
    case "submitting":
      return {
        icon: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
        label: "Submitting transaction...",
        color: "text-primary",
      };
    case "confirming":
      return {
        icon: <Loader2 className="h-5 w-5 animate-spin text-amber-500" />,
        label: "Confirming on chain...",
        color: "text-amber-500",
      };
    case "confirmed":
      return {
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        label: "Transaction confirmed!",
        color: "text-green-500",
      };
    case "failed":
      return {
        icon: <XCircle className="h-5 w-5 text-destructive" />,
        label: "Transaction failed",
        color: "text-destructive",
      };
    default:
      return null;
  }
}

export function TransactionStatus({
  phase,
  txHash,
  errorMessage,
  chainExplorerUrl,
  onRetry,
}: TransactionStatusProps) {
  if (phase === "idle") return null;

  const config = getPhaseConfig(phase);
  if (!config) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/50">
      {config.icon}
      <div className="flex-1">
        <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
        {errorMessage && phase === "failed" && (
          <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
        )}
        {txHash && chainExplorerUrl && (
          <a
            href={`${chainExplorerUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
          >
            View transaction <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {phase === "failed" && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-primary hover:underline font-medium"
          aria-label="Retry transaction"
        >
          Retry
        </button>
      )}
    </div>
  );
}
