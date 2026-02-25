"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Coins, Award } from "lucide-react";

const StakingModal = dynamic(
  () => import("./StakingModal").then(m => ({ default: m.StakingModal })),
  { ssr: false }
);

interface ActionButtonPanelProps {
  stakingStatus?: {
    meetsMinimum: boolean;
    stakedAmount: string;
  };
  hasGuilds?: boolean;
  onRefresh?: () => void;
}

export function ActionButtonPanel({ stakingStatus, hasGuilds = false, onRefresh }: ActionButtonPanelProps) {
  const router = useRouter();
  const [showStakingModal, setShowStakingModal] = useState(false);

  const meetsMinimum = stakingStatus?.meetsMinimum ?? false;

  const handleStakeClick = () => {
    setShowStakingModal(true);
  };

  const handleEndorseClick = () => {
    router.push("/expert/endorsements");
  };

  const handleStakingSuccess = () => {
    onRefresh?.();
  };

  return (
    <>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Stake to Start Vetting Button */}
        <button
          onClick={handleStakeClick}
          className="group relative overflow-hidden bg-gradient-to-r from-orange-500/20 to-orange-400/20 hover:from-orange-500/30 hover:to-orange-400/30 border border-orange-500/30 hover:border-orange-500/40 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all dark:backdrop-blur-xl dark:border-orange-500/15 dark:shadow-black/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Coins className="w-7 h-7 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-lg font-bold mb-1 text-foreground">
                {meetsMinimum ? "Manage Your Stake" : "Stake to Start Vetting"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {meetsMinimum
                  ? `Currently staked: ${stakingStatus?.stakedAmount || "0"} VETD`
                  : "Lock VETD tokens to join reviewer pools and earn rewards"}
              </p>
            </div>
          </div>
          {meetsMinimum && (
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
                Active
              </span>
            </div>
          )}
        </button>

        {/* Start Endorsing Button */}
        <button
          onClick={handleEndorseClick}
          className="group relative overflow-hidden bg-gradient-to-r from-orange-500/20 to-orange-400/20 hover:from-orange-500/30 hover:to-orange-400/30 border border-orange-500/30 hover:border-orange-500/40 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all dark:backdrop-blur-xl dark:border-orange-500/15 dark:shadow-black/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Award className="w-7 h-7 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-lg font-bold mb-1 text-foreground">Start Endorsing</h3>
              <p className="text-sm text-muted-foreground">
                Bid VETD tokens to endorse top candidates and earn rewards
              </p>
            </div>
          </div>
          {!meetsMinimum && (
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-700 dark:text-yellow-300 text-xs font-semibold rounded-full">
                Stake Required
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Staking Modal */}
      <StakingModal
        isOpen={showStakingModal}
        onClose={() => setShowStakingModal(false)}
        onSuccess={handleStakingSuccess}
      />
    </>
  );
}
