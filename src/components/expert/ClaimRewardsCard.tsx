import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, ExternalLink } from "lucide-react";
import { getExplorerTxUrl } from "@/lib/blockchain";

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
    <Card padding="none" className="relative overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-border opacity-50" />

      <div className="p-5 sm:p-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-bold">Claimable Payouts</p>
            {Number(claimedAmount) > 0 && (
              <p className="text-xs text-muted-foreground/50 mt-0.5 tabular-nums">
                {Number(claimedAmount).toFixed(2)} VETD previously claimed
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-primary tabular-nums">
              {Number(pendingAmount).toFixed(2)} VETD
            </span>
            <span className="text-xs text-muted-foreground/50">ready to claim</span>
          </div>
        </div>

        {/* Claim button row */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onClaim}
            disabled={!hasPending || isConfirming}
            size="lg"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Claim All ({Number(pendingAmount).toFixed(2)} VETD)
              </>
            )}
          </Button>
          {claimTxHash && (
            <a
              href={getExplorerTxUrl(claimTxHash)}
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
