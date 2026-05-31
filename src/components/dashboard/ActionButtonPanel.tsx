"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { STATUS_COLORS } from "@/config/colors";

const StakingModal = dynamic(
  () => import("./StakingModal").then((m) => ({ default: m.StakingModal })),
  { ssr: false }
);

interface ActionButtonPanelProps {
  stakingStatus?: {
    meetsMinimum: boolean;
    stakedAmount: string;
  };
  onRefresh?: () => void;
  /** Whether to render the "Start Endorsing" action. Defaults to true. */
  showEndorse?: boolean;
}

export function ActionButtonPanel({
  stakingStatus,
  onRefresh,
  showEndorse = true,
}: ActionButtonPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Stake management lives here now (the standalone Withdrawals page was removed
  // in VET-108). Links elsewhere deep-link via ?openStaking=withdraw to open the
  // modal straight in withdraw mode.
  const openStakingParam = searchParams.get("openStaking");
  const [showStakingModal, setShowStakingModal] = useState(Boolean(openStakingParam));
  const stakingDefaultMode = openStakingParam === "withdraw" ? "withdraw" : "stake";
  const meetsMinimum = stakingStatus?.meetsMinimum ?? false;

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowStakingModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-[9px] bg-muted/30 border border-border text-muted-foreground text-xs font-medium hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <VettedIcon name="staking" className="w-3.5 h-3.5" />
          {meetsMinimum ? "Manage Stake" : "Stake to Start Vetting"}
          {meetsMinimum && (
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS.positive.dot} ml-1`} />
          )}
        </button>
        {showEndorse && (
          <button
            onClick={() => router.push("/expert/endorsements")}
            className="flex items-center gap-2 px-4 py-2 rounded-[9px] bg-primary/[0.12] border border-primary/[0.25] text-primary text-xs font-medium hover:bg-primary/[0.18] transition-colors"
          >
            <VettedIcon name="endorsement" className="w-3.5 h-3.5" />
            Start Endorsing
            {!meetsMinimum && (
              <span className={`text-xs ${STATUS_COLORS.warning.text} ml-1`}>
                Stake Required
              </span>
            )}
          </button>
        )}
      </div>

      {showStakingModal && (
        <StakingModal
          isOpen={showStakingModal}
          defaultMode={stakingDefaultMode}
          onClose={() => setShowStakingModal(false)}
          onSuccess={() => {
            setShowStakingModal(false);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}
