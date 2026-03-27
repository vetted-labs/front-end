"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { hashToBytes32 } from "@/lib/blockchain";
import { ArrowLeft, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { blockchainApi } from "@/lib/api";
import { toast } from "sonner";
import { useFetch } from "@/lib/hooks/useFetch";
import { buttonVariants } from "@/components/ui/button";
import { useTokenBalance } from "@/lib/hooks/useVettedContracts";
import { useAuthContext } from "@/hooks/useAuthContext";
import type { GuildStakeInfo } from "@/types";

const StakingModal = dynamic(
  () =>
    import("@/components/dashboard/StakingModal").then((m) => ({
      default: m.StakingModal,
    })),
  { ssr: false }
);

/* ─── Types ────────────────────────────────────────────── */

interface UnstakeInfo {
  hasRequest: boolean;
  unlockTime?: string;
  amount?: string;
}

interface GuildPosition extends GuildStakeInfo {
  unstakeInfo?: UnstakeInfo;
}

/* ─── Helpers ──────────────────────────────────────────── */

function getGuildAbbreviation(name: string): string {
  const words = name.split(/[\s&,]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function getCooldownProgress(unlockTime: string): {
  percent: number;
  label: string;
} {
  const unlock = new Date(unlockTime).getTime();
  const now = Date.now();
  const totalCooldown = 7 * 24 * 60 * 60 * 1000;
  const remaining = Math.max(0, unlock - now);
  const elapsed = totalCooldown - remaining;
  const percent = Math.min(
    100,
    Math.max(0, (elapsed / totalCooldown) * 100)
  );

  if (remaining <= 0) return { percent: 100, label: "Ready" };

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor(
    (remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
  );
  return { percent, label: `${days}d ${hours}h` };
}

/* ─── Component ────────────────────────────────────────── */

export default function WithdrawalsPage() {
  const { address: wagmiAddress } = useAccount();
  const auth = useAuthContext();
  const address = wagmiAddress || auth.walletAddress;

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState<string | undefined>();

  const { balance, refetchBalance } = useTokenBalance();

  // Fetch guild stakes
  const {
    data: guildStakes,
    isLoading: loadingStakes,
    refetch: refetchStakes,
  } = useFetch<GuildStakeInfo[]>(
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

  const guildsWithStakes = useMemo(
    () => (guildStakes || []).filter((g) => parseFloat(g.stakedAmount) > 0),
    [guildStakes]
  );

  // Fetch unstake requests for all guilds in parallel
  const { data: unstakeMap } = useFetch<Record<string, UnstakeInfo>>(
    async () => {
      if (guildsWithStakes.length === 0) return {};
      const results = await Promise.all(
        guildsWithStakes.map(async (g) => {
          try {
            const info = await blockchainApi.getUnstakeRequestDetailed(
              address!,
              hashToBytes32(g.guildId)
            );
            return [g.guildId, info] as const;
          } catch {
            return [g.guildId, { hasRequest: false }] as const;
          }
        })
      );
      return Object.fromEntries(results);
    },
    {
      skip: !address || guildsWithStakes.length === 0,
    }
  );

  // Merge stakes + unstake info
  const positions: GuildPosition[] = useMemo(
    () =>
      guildsWithStakes.map((g) => ({
        ...g,
        unstakeInfo: unstakeMap?.[g.guildId],
      })),
    [guildsWithStakes, unstakeMap]
  );

  // Derived stats
  const totalStaked = useMemo(
    () => positions.reduce((sum, g) => sum + parseFloat(g.stakedAmount), 0),
    [positions]
  );

  const pendingUnstake = useMemo(() => {
    let totalAmount = 0;
    let earliestUnlock: string | null = null;
    for (const p of positions) {
      if (p.unstakeInfo?.hasRequest && p.unstakeInfo.amount) {
        totalAmount += parseFloat(p.unstakeInfo.amount);
        if (
          p.unstakeInfo.unlockTime &&
          (!earliestUnlock || p.unstakeInfo.unlockTime < earliestUnlock)
        ) {
          earliestUnlock = p.unstakeInfo.unlockTime;
        }
      }
    }
    return { totalAmount, earliestUnlock };
  }, [positions]);

  const availableBalance =
    balance !== undefined ? parseFloat(formatEther(balance)) : 0;

  const handleGuildClick = (guildId: string) => {
    setSelectedGuildId(guildId);
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    refetchStakes();
    refetchBalance();
  };

  // ── No wallet ──
  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-muted-foreground mb-4">
            Please connect your wallet to manage your staking portfolio
          </p>
          <Link href="/expert/dashboard" className={cn(buttonVariants())}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loadingStakes) {
    return (
      <div
        className="flex items-center justify-center py-20"
        role="status"
        aria-label="Loading staking portfolio"
      >
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8 animate-page-enter">
      {/* ── Header ── */}
      <div className="mb-8">
        <Link
          href="/expert/dashboard"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-4"
          )}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-2">Staking Portfolio</h1>
        <p className="text-muted-foreground">
          Manage your staked VETD across guilds
        </p>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Staked — purple accent */}
        <div className="rounded-[14px] bg-primary/[0.08] border border-primary/20 p-5">
          <div className="text-xs uppercase tracking-[1.2px] text-primary font-medium mb-1.5">
            Total Staked
          </div>
          <div className="text-3xl font-bold leading-tight tabular-nums">
            {totalStaked.toFixed(2)}
          </div>
          <div className="text-sm text-primary/70 mt-0.5">VETD</div>
        </div>

        {/* Available Balance */}
        <div className="rounded-[14px] bg-card border border-border/60 p-5">
          <div className="text-xs uppercase tracking-[1.2px] text-muted-foreground font-medium mb-1.5">
            Available Balance
          </div>
          <div className="text-3xl font-bold leading-tight tabular-nums">
            {availableBalance.toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground mt-0.5">VETD</div>
        </div>

        {/* Pending Unstake — muted gold */}
        <div className="rounded-[14px] bg-[#d9b45f]/[0.04] border border-[#d9b45f]/15 p-5">
          <div className="text-xs uppercase tracking-[1.2px] text-[#d9b45f] font-medium mb-1.5">
            Pending Unstake
          </div>
          <div className="text-3xl font-bold leading-tight tabular-nums">
            {pendingUnstake.totalAmount.toFixed(2)}
          </div>
          <div className="text-sm text-[#d9b45f] mt-0.5">
            {pendingUnstake.earliestUnlock
              ? `VETD · ${getCooldownProgress(pendingUnstake.earliestUnlock).label} left`
              : "VETD"}
          </div>
        </div>

        {/* Active Guilds */}
        <div className="rounded-[14px] bg-card border border-border/60 p-5">
          <div className="text-xs uppercase tracking-[1.2px] text-muted-foreground font-medium mb-1.5">
            Active Guilds
          </div>
          <div className="text-3xl font-bold leading-tight tabular-nums">
            {positions.length}
          </div>
          <div className="text-sm text-muted-foreground mt-0.5">guilds staked</div>
        </div>
      </div>

      {/* ── Positions List ── */}
      <div className="flex justify-between items-center mb-3.5">
        <h2 className="text-sm font-bold text-foreground">
          Your Positions
        </h2>
        {positions.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Click any guild to withdraw
          </span>
        )}
      </div>

      {positions.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          No active stakes found across any guilds.{" "}
          <Link
            href="/expert/dashboard"
            className="text-primary hover:underline"
          >
            Go to Dashboard
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {positions.map((guild) => {
            const amount = parseFloat(guild.stakedAmount);
            const pct =
              totalStaked > 0
                ? ((amount / totalStaked) * 100).toFixed(1)
                : "0";
            const hasCooldown = guild.unstakeInfo?.hasRequest;
            const cooldown =
              hasCooldown && guild.unstakeInfo?.unlockTime
                ? getCooldownProgress(guild.unstakeInfo.unlockTime)
                : null;

            return (
              <button
                key={guild.guildId}
                onClick={() => handleGuildClick(guild.guildId)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-5 py-4 text-left transition-colors cursor-pointer",
                  hasCooldown
                    ? "bg-[#d9b45f]/[0.04] border border-[#d9b45f]/15 hover:bg-[#d9b45f]/[0.07]"
                    : "bg-card border border-border/60 hover:bg-muted/50"
                )}
              >
                {/* Left: icon + name */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={cn(
                      "w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-sm font-medium flex-shrink-0",
                      hasCooldown
                        ? "bg-[#d9b45f]/12 text-[#d9b45f]"
                        : "bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {getGuildAbbreviation(guild.guildName || guild.guildId)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {guild.guildName || guild.guildId}
                      </span>
                      {hasCooldown && (
                        <span className="text-xs font-medium uppercase tracking-[0.5px] bg-[#d9b45f]/12 text-[#d9b45f] px-2 py-0.5 rounded flex-shrink-0">
                          Cooldown
                        </span>
                      )}
                    </div>
                    {hasCooldown &&
                      guild.unstakeInfo?.amount &&
                      cooldown && (
                        <div className="text-xs text-[#d9b45f] mt-0.5">
                          Unstaking{" "}
                          {parseFloat(guild.unstakeInfo.amount).toFixed(2)} VETD
                          {" · "}
                          {cooldown.label} remaining
                        </div>
                      )}
                  </div>
                </div>

                {/* Right: amount + bar + chevron */}
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-base font-bold tabular-nums">
                      {amount.toFixed(2)} VETD
                    </div>
                    <div className="text-xs text-muted-foreground">{pct}%</div>
                  </div>

                  {/* Allocation / cooldown bar */}
                  <div className="w-20 hidden sm:block">
                    <div
                      className={cn(
                        "h-1 rounded-full",
                        hasCooldown ? "bg-[#d9b45f]/15" : "bg-muted/50"
                      )}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          hasCooldown ? "bg-[#d9b45f]/70" : "bg-primary/60"
                        )}
                        style={{
                          width: `${hasCooldown && cooldown ? cooldown.percent : parseFloat(pct)}%`,
                        }}
                      />
                    </div>
                    {hasCooldown && cooldown && (
                      <div className="text-xs text-[#d9b45f] mt-1 text-center">
                        {Math.round(cooldown.percent)}%
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Staking Modal ── */}
      <StakingModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedGuildId(undefined);
        }}
        onSuccess={handleModalSuccess}
        preselectedGuildId={selectedGuildId}
        defaultMode="withdraw"
      />
    </div>
  );
}
