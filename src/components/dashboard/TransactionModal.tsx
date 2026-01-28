"use client";
import { X, Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: "pending" | "success" | "error";
  txHash?: string;
  actionType?: "stake" | "withdraw";
  amount?: string;
  errorMessage?: string;
}

export function TransactionModal({
  isOpen,
  onClose,
  status,
  txHash,
  actionType = "stake",
  amount,
  errorMessage,
}: TransactionModalProps) {
  if (!isOpen) return null;

  const canClose = status !== "pending";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-card via-card to-card/95 rounded-3xl shadow-2xl border border-border/50 max-w-md w-full mx-4 backdrop-blur-sm animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-border/50">
          <h3 className="text-lg font-semibold text-foreground">Transaction Status</h3>
          {canClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted/50 transition-all"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Pending State */}
          {status === "pending" && (
            <div className="text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                {/* Outer spinning ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-500 to-orange-600 opacity-20 animate-ping" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-500 to-orange-600 opacity-30 animate-spin" style={{ animationDuration: "3s" }} />

                {/* Inner container */}
                <div className="absolute inset-2 bg-card rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-600 via-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xl font-bold text-foreground mb-2">
                  Processing Transaction
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {actionType === "stake"
                    ? `Staking ${amount} VETD tokens...`
                    : `Withdrawing ${amount} VETD tokens...`}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Please wait while the transaction is confirmed on the blockchain.
                </p>
              </div>

              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 transition-colors"
                >
                  View on Etherscan
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div className="text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                {/* Success glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-green-500 to-emerald-600 opacity-20 animate-pulse" />

                {/* Inner container */}
                <div className="absolute inset-2 bg-card rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                    <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xl font-bold text-foreground mb-2">
                  Transaction Successful!
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {actionType === "stake"
                    ? `Successfully staked ${amount} VETD tokens.`
                    : `Successfully withdrawn ${amount} VETD tokens.`}
                </p>
              </div>

              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-green-700 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-colors"
                >
                  View on Etherscan
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <Button
                onClick={onClose}
                className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/20 transition-all rounded-xl font-semibold"
              >
                Done
              </Button>
            </div>
          )}

          {/* Error State */}
          {status === "error" && (
            <div className="text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                {/* Error glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-red-500 to-rose-600 opacity-20 animate-pulse" />

                {/* Inner container */}
                <div className="absolute inset-2 bg-card rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 via-rose-500 to-red-600 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                    <XCircle className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xl font-bold text-foreground mb-2">
                  Transaction Failed
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {actionType === "stake"
                    ? `Failed to stake ${amount} VETD tokens.`
                    : `Failed to withdraw ${amount} VETD tokens.`}
                </p>
                {errorMessage && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-xs text-red-700 dark:text-red-400 break-words">
                      {errorMessage}
                    </p>
                  </div>
                )}
              </div>

              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-700 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                >
                  View on Etherscan
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <Button
                onClick={onClose}
                variant="outline"
                className="w-full h-11 rounded-xl font-semibold"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
