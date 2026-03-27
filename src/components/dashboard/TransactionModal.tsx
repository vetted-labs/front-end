"use client";
import Image from "next/image";
import { X, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getExplorerTxUrl } from "@/lib/blockchain";
import { STATUS_COLORS } from "@/config/colors";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: "pending" | "success" | "error";
  txHash?: string;
  actionType?: "stake" | "withdraw";
  amount?: string;
  errorMessage?: string;
  guildName?: string;
}

export function TransactionModal({
  isOpen,
  onClose,
  status,
  txHash,
  actionType = "stake",
  amount,
  errorMessage,
  guildName,
}: TransactionModalProps) {
  if (!isOpen) return null;

  const canClose = status !== "pending";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-2xl border border-border max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-xl font-bold text-foreground">Transaction Status</h3>
          {canClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-all"
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
              <Image
                src="/Vetted-orange.png"
                alt="Vetted"
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover mx-auto animate-pulse"
                style={{ animationDuration: "2s" }}
              />

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
                  href={getExplorerTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 text-sm ${STATUS_COLORS.pending.text} hover:opacity-80 transition-colors`}
                >
                  View on Etherscan
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div className="text-center space-y-5">
              <div className="relative w-28 h-28 mx-auto">
                {/* Outer success glow */}
                <div className={`absolute inset-0 rounded-full ${STATUS_COLORS.positive.bg} opacity-15 animate-pulse`} />
                <div className={`absolute -inset-3 rounded-full ${STATUS_COLORS.positive.bgSubtle} animate-in fade-in zoom-in duration-700`} />

                {/* Inner container */}
                <div className="absolute inset-2 bg-card rounded-full flex items-center justify-center shadow-lg">
                  <div className={`w-20 h-20 ${STATUS_COLORS.positive.bg} rounded-full flex items-center justify-center animate-in zoom-in duration-500`}>
                    <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-2xl font-bold text-foreground">
                  {actionType === "stake" ? "Stake Confirmed!" : "Withdrawal Confirmed!"}
                </h4>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${STATUS_COLORS.positive.bgSubtle} border ${STATUS_COLORS.positive.border}`}>
                  <span className={`text-sm font-bold ${STATUS_COLORS.positive.text}`}>
                    {amount} VETD
                  </span>
                  <span className={`text-sm ${STATUS_COLORS.positive.text} opacity-70`}>
                    {actionType === "stake" ? "staked" : "withdrawn"}
                  </span>
                </div>
                {guildName && (
                  <p className="text-sm text-muted-foreground">
                    {actionType === "stake" ? "Staked in" : "Withdrawn from"}{" "}
                    <span className="font-medium text-foreground">{guildName}</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {actionType === "stake"
                    ? "You can now participate in reviewing applications for this guild."
                    : "Your tokens have been returned to your wallet."}
                </p>
              </div>

              {txHash && (
                <a
                  href={getExplorerTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${STATUS_COLORS.positive.text} ${STATUS_COLORS.positive.bgSubtle} hover:bg-positive/20 transition-colors`}
                >
                  View on Etherscan
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <Button
                onClick={onClose}
                className={`w-full h-12 ${STATUS_COLORS.positive.bg} hover:opacity-90 shadow-lg transition-all rounded-xl font-medium text-base text-white`}
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
                <div className={`absolute inset-0 rounded-full ${STATUS_COLORS.negative.bg} opacity-20 animate-pulse`} />

                {/* Inner container */}
                <div className="absolute inset-2 bg-card rounded-full flex items-center justify-center shadow-lg">
                  <div className={`w-16 h-16 ${STATUS_COLORS.negative.bg} rounded-full flex items-center justify-center animate-in zoom-in duration-500`}>
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
                  <div className={`p-3 ${STATUS_COLORS.negative.bgSubtle} border ${STATUS_COLORS.negative.border} rounded-xl`}>
                    <p className={`text-xs ${STATUS_COLORS.negative.text} break-words`}>
                      {errorMessage}
                    </p>
                  </div>
                )}
              </div>

              {txHash && (
                <a
                  href={getExplorerTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${STATUS_COLORS.negative.text} ${STATUS_COLORS.negative.bgSubtle} hover:bg-negative/20 transition-colors`}
                >
                  View on Etherscan
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <Button
                onClick={onClose}
                variant="outline"
                className="w-full h-11 rounded-xl font-medium"
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
