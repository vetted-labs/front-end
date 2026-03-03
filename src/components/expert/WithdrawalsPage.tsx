"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { hashToBytes32 } from "@/lib/blockchain";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { blockchainApi } from "@/lib/api";
import { toast } from "sonner";
import { useFetch } from "@/lib/hooks/useFetch";
import { buttonVariants, Button } from "@/components/ui/button";
import { useVettedToken } from "@/lib/hooks/useVettedContracts";
import { WithdrawalManager } from "@/components/WithdrawalManager";
import type { GuildStakeInfo } from "@/types";

export default function WithdrawalsPage() {
  const { address } = useAccount();
  const [selectedGuild, setSelectedGuild] = useState<GuildStakeInfo | null>(null);

  const { balance, refetchBalance } = useVettedToken();

  const { data: guildStakes, isLoading: loading, refetch } = useFetch<GuildStakeInfo[]>(
    () => blockchainApi.getExpertGuildStakes(address!),
    {
      skip: !address,
      onError: (error) => {
        if (!error.includes("404")) {
          toast.error("Failed to load staking information");
        }
      },
    }
  );

  const handleWithdrawalComplete = () => {
    refetch();
    refetchBalance();
  };

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-muted-foreground mb-4">
            Please connect your wallet to manage withdrawals
          </p>
          <Link href="/expert/dashboard" className={cn(buttonVariants())}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const guildsWithStakes = (guildStakes || []).filter(
    (g) => parseFloat(g.stakedAmount) > 0
  );

  const selectedGuildHash = selectedGuild
    ? hashToBytes32(selectedGuild.guildId)
    : undefined;

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-8 animate-page-enter">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/expert/dashboard"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-2">Withdrawals</h1>
        <p className="text-muted-foreground">
          Manage your staked tokens and endorsement refunds
        </p>
      </div>

      {/* Guild Selector */}
      {!selectedGuild ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Select a guild to unstake from</h2>
          {guildsWithStakes.length === 0 ? (
            <p className="text-muted-foreground">
              No active stakes found across any guilds.
            </p>
          ) : (
            <div className="space-y-3">
              {guildsWithStakes.map((guild) => (
                <Button
                  key={guild.guildId}
                  variant="outline"
                  className="w-full justify-between h-auto py-4 px-6"
                  onClick={() => setSelectedGuild(guild)}
                >
                  <span className="font-medium">
                    {guild.guildName || guild.guildId}
                  </span>
                  <span className="text-muted-foreground">
                    {parseFloat(guild.stakedAmount).toFixed(2)} VETD staked
                  </span>
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => setSelectedGuild(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to guild selection
          </Button>

          <h2 className="text-lg font-semibold mb-4">
            Unstaking from: {selectedGuild.guildName || selectedGuild.guildId}
          </h2>

          <WithdrawalManager
            walletAddress={address}
            currentStake={selectedGuild.stakedAmount}
            currentBalance={balance ? formatEther(balance) : "0"}
            guildId={selectedGuildHash!}
            guildName={selectedGuild.guildName}
            onWithdrawalComplete={handleWithdrawalComplete}
          />
        </div>
      )}
    </div>
  );
}
