"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Wallet,
} from "lucide-react";
import type { ActiveEndorsement, EarningsBreakdownResponse, EndorsementApplication } from "@/types";
import { STATUS_COLORS } from "@/config/colors";
import { EndorsementStatsGrid } from "./EndorsementStatsGrid";

interface EndorsementHeaderProps {
  // Wallet
  address: string;
  shortAddress: string;
  formattedBalance: string | null;
  // Network
  isOnSepolia: boolean;
  chainName: string | undefined;
  onSwitchToSepolia: () => void;
  // Stats
  guildEndorsements: ActiveEndorsement[];
  allEndorsements: ActiveEndorsement[];
  earningsData: EarningsBreakdownResponse | null;
  /** Applications currently loaded — source of the per-application Potential Earning range. */
  applications: EndorsementApplication[];
  /** Whether the cross-guild ("All guilds") scope is active. */
  allGuilds: boolean;
  /** Number of guilds the expert belongs to (for the aggregate count). */
  memberGuildCount: number;
}

export function EndorsementHeader({
  address,
  formattedBalance,
  isOnSepolia,
  chainName,
  onSwitchToSepolia,
  guildEndorsements,
  allEndorsements,
  earningsData,
  applications,
  allGuilds,
  memberGuildCount,
}: EndorsementHeaderProps) {
  const balanceLoaded = formattedBalance !== null;
  const balanceNum = balanceLoaded
    ? parseFloat(formattedBalance.replace(/,/g, ""))
    : 0;
  const balanceDisplay = balanceLoaded
    ? balanceNum.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "—";

  return (
    <>
      {/* Wrong Network Warning */}
      {!isOnSepolia && (
        <Card className={`rounded-xl border ${STATUS_COLORS.warning.border} ${STATUS_COLORS.warning.bgSubtle}`}>
          <CardContent className="p-4 flex items-start gap-4">
            <AlertTriangle className={`w-6 h-6 ${STATUS_COLORS.warning.icon} flex-shrink-0 mt-1`} />
            <div className="flex-1">
              <h3 className={`text-xl font-bold ${STATUS_COLORS.warning.text} mb-2`}>
                Wrong Network Detected
              </h3>
              <p className={`text-sm ${STATUS_COLORS.warning.text} mb-3`}>
                Your wallet is connected to <strong>{chainName || "Unknown Network"}</strong>.
                Please switch to <strong>Sepolia Testnet</strong> to endorse applications.
              </p>
              <Button
                onClick={onSwitchToSepolia}
                className="bg-primary text-primary-foreground"
              >
                Switch to Sepolia Testnet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sticky header bar — wallet balance only */}
      {address && (
        <div className="sticky top-0 z-20 bg-background/88 backdrop-blur-sm border-b border-border -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-6">
          <div className="flex items-center justify-end py-3 max-w-7xl mx-auto gap-4 flex-wrap">
            {/* Right: Balance chip */}
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="flex items-center gap-2 rounded-full border border-border/70 bg-surface-2 dark:bg-white/[0.04] px-3 py-1.5 shadow-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Wallet className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/70 uppercase">
                    Balance
                  </span>
                  <span
                    className="mt-0.5 font-mono text-sm font-bold text-foreground"
                    aria-live="polite"
                  >
                    {balanceDisplay}
                    <span className="ml-1 text-muted-foreground/70 font-medium">VETD</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual stat cards */}
      <EndorsementStatsGrid
        guildEndorsements={guildEndorsements}
        allEndorsements={allEndorsements}
        earningsData={earningsData}
        applications={applications}
        allGuilds={allGuilds}
        memberGuildCount={memberGuildCount}
      />
    </>
  );
}
