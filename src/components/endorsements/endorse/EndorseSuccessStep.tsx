"use client";

import { CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { getExplorerTxUrl } from "@/lib/blockchain";
import { truncateAddress } from "@/lib/utils";
import { Divider } from "@/components/ui/divider";
import { STATUS_COLORS } from "@/config/colors";

export interface EndorseSuccessStepProps {
  candidateName: string;
  jobTitle: string;
  bidAmount: string;
  approvalTxHash?: `0x${string}`;
  bidTxHash?: `0x${string}`;
}

export function EndorseSuccessStep({
  candidateName,
  jobTitle,
  bidAmount,
  approvalTxHash,
  bidTxHash,
}: EndorseSuccessStepProps) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-6 max-w-lg mx-auto">
      <div className="relative w-24 h-24 mb-6 animate-celebrate-scale-in">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-celebrate-glow" />
        <div className="relative w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-xl">
          <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
        </div>
      </div>

      <h3 className="text-2xl font-bold text-foreground mb-1">Endorsement confirmed</h3>
      <p className="text-sm text-muted-foreground mb-6">
        You staked <span className="text-primary font-medium">{bidAmount} VETD</span> on{" "}
        {candidateName} for {jobTitle}.
      </p>

      <div className="w-full rounded-xl bg-muted/20 border border-border p-4 space-y-3 mb-6 text-left">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Bid amount</span>
          <span className="text-lg font-bold text-primary tabular-nums">{bidAmount} VETD</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Ranking</span>
          <span className="text-xs text-muted-foreground">Revealed when bidding ends</span>
        </div>

        {(approvalTxHash || bidTxHash) && (
          <>
            <Divider />
            <div className="space-y-2">
              {approvalTxHash && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Approval</span>
                  <a
                    href={getExplorerTxUrl(approvalTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2"
                  >
                    {truncateAddress(approvalTxHash)} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {bidTxHash && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Endorsement</span>
                  <a
                    href={getExplorerTxUrl(bidTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2"
                  >
                    {truncateAddress(bidTxHash)} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div
        className={`w-full rounded-xl border border-border ${STATUS_COLORS.info.bgSubtle} p-4 text-left`}
      >
        <div className="flex items-start gap-3">
          <Sparkles className={`w-4 h-4 ${STATUS_COLORS.info.icon} mt-0.5 shrink-0`} />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">What happens next?</p>
            <p>
              Rankings stay hidden until the 24-hour bidding window closes. Top-3 endorsers
              earn rewards when the candidate is hired; non-selected endorsers receive a
              refund minus a 1.5% platform fee.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
