"use client";

import { Coins } from "lucide-react";

export interface ReviewSubmitSectionProps {
  proposalContext?: { requiredStake: number };
  stakeAmount: number;
  onStakeAmountChange: (value: number) => void;
}

/** Renders the staking input shown in step 3 for proposal votes. */
export function ReviewSubmitSection({
  proposalContext,
  stakeAmount,
  onStakeAmountChange,
}: ReviewSubmitSectionProps) {
  if (!proposalContext) return null;

  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/20 p-5 space-y-3">
      <h4 className="text-sm font-semibold text-foreground tracking-wide uppercase flex items-center gap-2">
        <Coins className="w-4 h-4 text-primary" />
        Stake VETD
      </h4>
      <p className="text-xs text-muted-foreground">
        Enter the amount of VETD tokens to stake on this vote. Minimum: {proposalContext.requiredStake} VETD.
      </p>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={proposalContext.requiredStake}
          step={1}
          value={stakeAmount}
          onChange={(e) => onStakeAmountChange(Math.max(0, Number(e.target.value)))}
          className="w-40 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder={`Min ${proposalContext.requiredStake}`}
        />
        <span className="text-sm text-muted-foreground font-medium">VETD</span>
      </div>
    </div>
  );
}
