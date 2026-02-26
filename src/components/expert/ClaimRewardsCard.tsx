import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, ArrowDownToLine, ExternalLink } from "lucide-react";

interface ClaimRewardsCardProps {
  pendingAmount: string;
  claimedAmount: string;
  hasPending: boolean;
  isConfirming: boolean;
  claimTxHash: `0x${string}` | undefined;
  onClaim: () => void;
}

export function ClaimRewardsCard({
  pendingAmount,
  claimedAmount,
  hasPending,
  isConfirming,
  claimTxHash,
  onClaim,
}: ClaimRewardsCardProps) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center flex-shrink-0">
            <ArrowDownToLine className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">Withdraw to Wallet</p>
            <div className="flex items-baseline gap-3 mt-0.5">
              <span className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {Number(pendingAmount).toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground/60">VETD claimable</span>
            </div>
            {Number(claimedAmount) > 0 && (
              <p className="text-xs text-muted-foreground/60 mt-1 tabular-nums">
                {Number(claimedAmount).toFixed(2)} VETD previously claimed
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={onClaim}
            disabled={!hasPending || isConfirming}
            className="flex-1 sm:flex-none"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Claim Rewards
              </>
            )}
          </Button>
          {claimTxHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${claimTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
