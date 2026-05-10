"use client";

import { ArrowDownToLine, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";
import { Button } from "@/components/ui/button";

interface ClaimCardProps {
  readyAmount: number;
  pendingTotal: number;
  cooldownLabel: string | null;
  hasPositions: boolean;
  onWithdraw: () => void;
}

/**
 * Sticky-rail claim card: shows the immediately claimable balance, an
 * inline cooldown notice when waiting, and the primary withdraw CTA.
 */
export function ClaimCard({
  readyAmount,
  pendingTotal,
  cooldownLabel,
  hasPositions,
  onWithdraw,
}: ClaimCardProps) {
  const hasReadyToClaim = readyAmount > 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <ArrowDownToLine className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Claim & withdraw
        </h3>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ready to claim
          </p>
          <p
            className={cn(
              "text-2xl font-bold font-display tabular-nums leading-tight mt-1",
              hasReadyToClaim ? STATUS_COLORS.positive.text : "text-foreground",
            )}
          >
            {readyAmount.toFixed(2)}
            <span className="text-sm font-medium text-muted-foreground ml-1">
              VETD
            </span>
          </p>
        </div>

        {pendingTotal > 0 && readyAmount === 0 && cooldownLabel && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  Cooldown in progress
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Earliest completion in {cooldownLabel}
                </p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={onWithdraw}
          disabled={!hasPositions}
          className="w-full"
          icon={<ArrowDownToLine className="w-4 h-4" />}
        >
          Manage withdrawal
        </Button>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Unstaking has a 7-day cooldown. Gas is paid by your wallet at claim
          time.
        </p>
      </div>
    </div>
  );
}
