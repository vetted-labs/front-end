"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Wallet,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { GuildRecord } from "@/types";

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

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
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
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const balanceNum = formattedBalance
    ? parseFloat(formattedBalance.replace(/,/g, ""))
    : 0;
  const stakeNum = parseFloat(userStake);

  return (
    <>
      {/* Wrong Network Warning */}
      {!isOnSepolia && (
        <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-700 dark:text-amber-300 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-300 mb-2">
                Wrong Network Detected
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                Your wallet is connected to <strong>{chainName || "Unknown Network"}</strong>.
                Please switch to <strong>Sepolia Testnet</strong> to endorse applications.
              </p>
              <Button
                onClick={onSwitchToSepolia}
                className="bg-gradient-to-r from-primary to-accent text-[hsl(var(--gradient-button-text))]"
              >
                Switch to Sepolia Testnet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Merged Card */}
      {address && (
        <Card className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden">
          {/* Top row: Wallet + Guild Selector + Network */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4">
            {/* Left: Wallet info */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                <Wallet className="h-[18px] w-[18px] text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-semibold text-foreground">{shortAddress}</code>
                <button
                  onClick={handleCopyAddress}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/50 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
                <Badge className="border-primary/30 bg-primary/10 text-primary text-[10px] px-2 py-0">
                  Vault
                </Badge>
              </div>
            </div>

            {/* Right: Guild Selector + Network */}
            <div className="flex items-center gap-2.5">
              <Select value={selectedGuildId ?? ""} onValueChange={onGuildChange}>
                <SelectTrigger className="h-9 w-44 rounded-lg border-border/60 bg-background/70 text-sm">
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

              <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/50 px-3 py-2">
                <span
                  className={`h-[7px] w-[7px] rounded-full ${
                    isOnSepolia
                      ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]"
                      : "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                  }`}
                />
                <span className="text-xs font-semibold text-muted-foreground">
                  {chainName || "Unknown"}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/40" />

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-5">
            <StatCell label="Balance" value={formatCompact(balanceNum)} sub="VETD" />
            <StatCell label="Staked" value={formatCompact(stakeNum)} sub="VETD locked" />
            <StatCell label="Total" value={totalEndorsementsCount.toString()} sub="endorsements" />
            <StatCell label="Mine" value={userEndorsementsCount.toString()} sub="endorsements" highlight />
            <StatCell label="Available" value={applicationsCount.toString()} sub="applications" last />
          </div>
        </Card>
      )}
    </>
  );
}

function StatCell({
  label,
  value,
  sub,
  highlight,
  last,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`px-5 py-4 ${last ? "" : "border-r border-border/40"}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`text-xl font-extrabold tabular-nums mt-1 ${
          highlight ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground/60">{sub}</p>
    </div>
  );
}
