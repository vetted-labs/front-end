"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Coins,
  TrendingUp,
  Users,
  Award,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface EndorsementStatsGridProps {
  /** Formatted balance string (e.g. "1,234.56") or null if loading */
  formattedBalance: string | null;
  /** Raw balance string from formatEther (e.g. "1234.56") for the detail line, or null */
  rawBalance: string | null;
  /** Whether to show the raw balance detail line (balance > 0) */
  showRawBalance: boolean;
  /** Whether the wallet address is connected */
  hasAddress: boolean;
  /** Whether the balance is still loading (undefined from contract) */
  balanceLoading: boolean;
  /** Staked amount as a formatted string (e.g. "100") */
  userStake: string;
  /** Number of endorsements the user has in this guild */
  userEndorsementsCount: number;
  /** Number of applications available in this guild */
  applicationsCount: number;
  /** Minimum bid as a formatted string (e.g. "1") */
  minimumBid: string;
  /** Callback to refresh the balance */
  onRefreshBalance: () => void;
}

export function EndorsementStatsGrid({
  formattedBalance,
  rawBalance,
  showRawBalance,
  hasAddress,
  balanceLoading,
  userStake,
  userEndorsementsCount,
  applicationsCount,
  minimumBid,
  onRefreshBalance,
}: EndorsementStatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-cyan-500/5 to-transparent shadow-[0_20px_60px_-45px_rgba(255,106,0,0.6)]">
        <CardContent className="p-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
              <Coins className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm text-muted-foreground">Your VETD Balance</p>
              <button
                onClick={() => {
                  onRefreshBalance();
                  toast.success('Balance refreshed');
                }}
                className="p-1 hover:bg-muted rounded"
                title="Refresh balance"
              >
                  <RefreshCw className="w-3 h-3 text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400" />
              </button>
            </div>
            {!hasAddress ? (
              <p className="text-lg text-muted-foreground">Connect Wallet</p>
            ) : balanceLoading ? (
              <p className="text-lg text-muted-foreground">Loading...</p>
            ) : (
              <>
                <p className="text-2xl font-bold break-all">
                  {formattedBalance}
                </p>
                {showRawBalance && rawBalance && (
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {rawBalance} VETD
                  </p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-slate-500/5 to-transparent shadow-[0_20px_60px_-45px_rgba(56,189,248,0.6)]">
        <CardContent className="p-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10">
              <TrendingUp className="w-6 h-6 text-sky-400" />
            </div>
            <p className="text-sm text-muted-foreground">Staked Amount</p>
            <p className="text-2xl font-bold">{userStake}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent shadow-[0_20px_60px_-45px_rgba(245,158,11,0.6)]">
        <CardContent className="p-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-sm text-muted-foreground">My Endorsements</p>
            <p className="text-2xl font-bold">{userEndorsementsCount}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent shadow-[0_20px_60px_-45px_rgba(99,102,241,0.6)]">
        <CardContent className="p-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
              <Users className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm text-muted-foreground">Available Applications</p>
            <p className="text-2xl font-bold">{applicationsCount}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent shadow-[0_20px_60px_-45px_rgba(249,115,22,0.6)]">
        <CardContent className="p-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
              <Award className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-sm text-muted-foreground">Minimum Bid</p>
            <p className="text-2xl font-bold">
              {minimumBid}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
