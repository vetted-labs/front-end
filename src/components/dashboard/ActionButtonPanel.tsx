"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Coins, Sparkles } from "lucide-react";
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
}

export function ActionButtonPanel({
  stakingStatus,
  onRefresh,
}: ActionButtonPanelProps) {
  const router = useRouter();
  const [showStakingModal, setShowStakingModal] = useState(false);
  const meetsMinimum = stakingStatus?.meetsMinimum ?? false;

  return (
    <>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setShowStakingModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-[9px] bg-muted/30 border border-border/60 text-muted-foreground text-xs font-medium hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <Coins className="w-3.5 h-3.5" />
          {meetsMinimum ? "Manage Stake" : "Stake to Start Vetting"}
          {meetsMinimum && (
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS.positive.dot} ml-1`} />
          )}
        </button>
        <button
          onClick={() => router.push("/expert/endorsements")}
          className="flex items-center gap-2 px-4 py-2 rounded-[9px] bg-primary/[0.12] border border-primary/[0.25] text-primary text-xs font-medium hover:bg-primary/[0.18] transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Start Endorsing
          {!meetsMinimum && (
            <span className={`text-xs ${STATUS_COLORS.warning.text} ml-1`}>
              Stake Required
            </span>
          )}
        </button>
      </div>

      {showStakingModal && (
        <StakingModal
          isOpen={showStakingModal}
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
