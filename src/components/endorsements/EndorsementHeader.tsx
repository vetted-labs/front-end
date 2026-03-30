"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
} from "lucide-react";
import type { GuildRecord } from "@/types";
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
  // Guild
  guilds: GuildRecord[];
  selectedGuildId: string | undefined;
  onGuildChange: (guildId: string) => void;
  // Stats
  totalEndorsementsCount: number;
  userEndorsementsCount: number;
  applicationsCount: number;
  userStake: string;
}

export function EndorsementHeader({
  address,
  shortAddress,
  formattedBalance,
  isOnSepolia,
  chainName,
  onSwitchToSepolia,
  guilds,
  selectedGuildId,
  onGuildChange,
  totalEndorsementsCount,
  userEndorsementsCount,
  applicationsCount,
  userStake,
}: EndorsementHeaderProps) {
  const stakeNum = parseFloat(userStake);
  const balanceNum = formattedBalance
    ? parseFloat(formattedBalance.replace(/,/g, ""))
    : 0;

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

      {/* Sticky header bar */}
      {address && (
        <div className="sticky top-0 z-30 bg-background/88 border-b border-border -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-6">
          <div className="flex items-center justify-between py-3.5 max-w-7xl mx-auto gap-4 flex-wrap">
            {/* Left: Title + LIVE badge + Guild selector */}
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="font-display font-bold text-xl tracking-tight whitespace-nowrap">
                Endorsement Marketplace
              </h2>
              <Select value={selectedGuildId ?? ""} onValueChange={onGuildChange}>
                <SelectTrigger className="h-9 w-44 rounded-lg border-border bg-muted/30 text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select guild" />
                </SelectTrigger>
                <SelectContent>
                  {guilds.map((guild) => (
                    <SelectItem key={guild.id} value={guild.id}>
                      {guild.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Right: Stake info */}
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
              {stakeNum > 0 && (
                <>
                  <span className="font-medium text-foreground">{stakeNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className="font-medium text-foreground">VETD</span>
                  <span>staked</span>
                  <span className="text-muted-foreground/40 mx-1">·</span>
                </>
              )}
              <span>Balance:</span>
              <span className="font-medium text-foreground">{balanceNum.toLocaleString(undefined, { maximumFractionDigits: 0 })} VETD</span>
            </div>
          </div>
        </div>
      )}

      {/* Visual stat cards */}
      <EndorsementStatsGrid
        totalEndorsementsCount={totalEndorsementsCount}
        userEndorsementsCount={userEndorsementsCount}
        applicationsCount={applicationsCount}
      />
    </>
  );
}
