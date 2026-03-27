# Staking Portfolio Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat withdrawals page with a DeFi-style staking portfolio overview that shows total positions, per-guild breakdowns with cooldown timers, and opens StakingModal for withdrawals.

**Architecture:** Rewrite `WithdrawalsPage` as a single-page portfolio view with a stats row (4 cards) and a positions list. Add a `defaultMode` prop to `StakingModal` so it can open in withdraw mode. Fetch cooldown status per guild via `Promise.all()` on mount.

**Tech Stack:** Next.js 15, React 19, TailwindCSS 4, wagmi, viem, existing `useFetch`/`useTokenBalance` hooks

**Spec:** `docs/superpowers/specs/2026-03-27-staking-portfolio-redesign-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/dashboard/StakingModal.tsx` | Modify (lines 20-32, 92-104) | Add `defaultMode` prop |
| `src/components/expert/WithdrawalsPage.tsx` | Rewrite | Staking portfolio view |
| `src/app/expert/withdrawals/page.tsx` | Modify | Update metadata/title |

---

### Task 1: Add `defaultMode` prop to StakingModal

**Files:**
- Modify: `src/components/dashboard/StakingModal.tsx:20-25` (props interface)
- Modify: `src/components/dashboard/StakingModal.tsx:32` (initial state)
- Modify: `src/components/dashboard/StakingModal.tsx:92-104` (reset effect)

This is a small, backwards-compatible change. The modal currently always starts in "stake" mode. We add an optional `defaultMode` prop so callers can open it in "withdraw" mode.

- [ ] **Step 1: Add `defaultMode` to the props interface**

In `src/components/dashboard/StakingModal.tsx`, update the `StakingModalProps` interface:

```typescript
interface StakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedGuildId?: string;
  defaultMode?: ActionMode;
}
```

Update the destructuring on line 29:

```typescript
export function StakingModal({ isOpen, onClose, onSuccess, preselectedGuildId, defaultMode }: StakingModalProps) {
```

- [ ] **Step 2: Use `defaultMode` for initial state and reset**

Change line 32 from:
```typescript
const [actionMode, setActionMode] = useState<ActionMode>("stake");
```
to:
```typescript
const [actionMode, setActionMode] = useState<ActionMode>(defaultMode || "stake");
```

In the reset effect (line 92-104), change `setActionMode("stake")` to:
```typescript
setActionMode(defaultMode || "stake");
```

- [ ] **Step 3: Verify existing behavior is preserved**

Run: `npm run build`
Expected: No type errors. Existing callers that don't pass `defaultMode` still get "stake" mode.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/StakingModal.tsx
git commit -m "feat: add defaultMode prop to StakingModal"
```

---

### Task 2: Rewrite WithdrawalsPage as staking portfolio

**Files:**
- Rewrite: `src/components/expert/WithdrawalsPage.tsx`

This is the main task. Replace the entire component with the DeFi portfolio layout.

**Key data requirements:**
- `blockchainApi.getExpertGuildStakes(address)` → `GuildStakeInfo[]` with `{ guildId, guildName, stakedAmount }`
- `blockchainApi.getUnstakeRequestDetailed(address, blockchainGuildId)` → `{ hasRequest, unlockTime?, amount? }`
- `hashToBytes32(guildId)` from `@/lib/blockchain` converts database UUID → `0x${string}`
- `useTokenBalance()` → `{ balance: bigint, refetchBalance }`
- `formatEther(balance)` from `viem` converts bigint → human-readable string

**Color constants (from spec):**
- Purple accent: use Tailwind `primary` (maps to `#8b5cf6` in this theme)
- Muted gold for cooldown: `#d9b45f` — use inline styles or arbitrary values `text-[#d9b45f]`, `border-[#d9b45f]/15`, etc.
- Neutral: Tailwind zinc scale (`zinc-600`, `zinc-500`, `zinc-400`)

- [ ] **Step 1: Write the complete WithdrawalsPage component**

Replace the entire contents of `src/components/expert/WithdrawalsPage.tsx` with the following:

```tsx
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
  () => import("@/components/dashboard/StakingModal").then((m) => ({ default: m.StakingModal })),
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

function getCooldownProgress(unlockTime: string): { percent: number; label: string } {
  const unlock = new Date(unlockTime).getTime();
  const now = Date.now();
  const totalCooldown = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  const remaining = Math.max(0, unlock - now);
  const elapsed = totalCooldown - remaining;
  const percent = Math.min(100, Math.max(0, (elapsed / totalCooldown) * 100));

  if (remaining <= 0) return { percent: 100, label: "Ready" };

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
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

  // Fetch unstake requests for all guilds with stakes
  const { data: unstakeMap, isLoading: loadingUnstakes } = useFetch<
    Record<string, UnstakeInfo>
  >(
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

  // Merge guild stakes with unstake info
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
          <div className="text-[11px] uppercase tracking-[1.2px] text-primary font-medium mb-1.5">
            Total Staked
          </div>
          <div className="text-[28px] font-bold leading-tight">
            {totalStaked.toFixed(2)}
          </div>
          <div className="text-[13px] text-primary/70 mt-0.5">VETD</div>
        </div>

        {/* Available Balance */}
        <div className="rounded-[14px] bg-white/[0.025] border border-white/[0.07] p-5">
          <div className="text-[11px] uppercase tracking-[1.2px] text-zinc-500 font-medium mb-1.5">
            Available Balance
          </div>
          <div className="text-[28px] font-bold leading-tight">
            {availableBalance.toFixed(2)}
          </div>
          <div className="text-[13px] text-zinc-500 mt-0.5">VETD</div>
        </div>

        {/* Pending Unstake — gold accent */}
        <div className="rounded-[14px] bg-[#d9b45f]/[0.04] border border-[#d9b45f]/15 p-5">
          <div className="text-[11px] uppercase tracking-[1.2px] text-[#d9b45f] font-medium mb-1.5">
            Pending Unstake
          </div>
          <div className="text-[28px] font-bold leading-tight">
            {pendingUnstake.totalAmount.toFixed(2)}
          </div>
          <div className="text-[13px] text-[#d9b45f] mt-0.5">
            {pendingUnstake.earliestUnlock
              ? `VETD · ${getCooldownProgress(pendingUnstake.earliestUnlock).label} left`
              : "VETD"}
          </div>
        </div>

        {/* Active Guilds */}
        <div className="rounded-[14px] bg-white/[0.025] border border-white/[0.07] p-5">
          <div className="text-[11px] uppercase tracking-[1.2px] text-zinc-500 font-medium mb-1.5">
            Active Guilds
          </div>
          <div className="text-[28px] font-bold leading-tight">
            {positions.length}
          </div>
          <div className="text-[13px] text-zinc-500 mt-0.5">guilds staked</div>
        </div>
      </div>

      {/* ── Positions List ── */}
      <div className="flex justify-between items-center mb-3.5">
        <h2 className="text-[15px] font-semibold text-zinc-200">
          Your Positions
        </h2>
        {positions.length > 0 && (
          <span className="text-xs text-zinc-500">
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
              totalStaked > 0 ? ((amount / totalStaked) * 100).toFixed(1) : "0";
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
                  "flex items-center justify-between rounded-xl px-5 py-4 text-left transition-colors",
                  hasCooldown
                    ? "bg-[#d9b45f]/[0.04] border border-[#d9b45f]/15 hover:bg-[#d9b45f]/[0.07]"
                    : "bg-white/[0.025] border border-white/[0.06] hover:bg-white/[0.05]"
                )}
              >
                {/* Left: icon + name */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={cn(
                      "w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[13px] font-semibold flex-shrink-0",
                      hasCooldown
                        ? "bg-[#d9b45f]/12 text-[#d9b45f]"
                        : "bg-white/[0.08] text-zinc-400"
                    )}
                  >
                    {getGuildAbbreviation(guild.guildName || guild.guildId)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold truncate">
                        {guild.guildName || guild.guildId}
                      </span>
                      {hasCooldown && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.5px] bg-[#d9b45f]/12 text-[#d9b45f] px-2 py-0.5 rounded flex-shrink-0">
                          Cooldown
                        </span>
                      )}
                    </div>
                    {hasCooldown && guild.unstakeInfo?.amount && cooldown && (
                      <div className="text-xs text-[#d9b45f] mt-0.5">
                        Unstaking {parseFloat(guild.unstakeInfo.amount).toFixed(2)} VETD
                        {" · "}
                        {cooldown.label} remaining
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: amount + bar + chevron */}
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-base font-bold">
                      {amount.toFixed(2)} VETD
                    </div>
                    <div className="text-xs text-zinc-600">{pct}%</div>
                  </div>

                  {/* Allocation / cooldown bar */}
                  <div className="w-20 hidden sm:block">
                    <div
                      className={cn(
                        "h-1 rounded-full",
                        hasCooldown
                          ? "bg-[#d9b45f]/15"
                          : "bg-white/[0.06]"
                      )}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          hasCooldown
                            ? "bg-[#d9b45f]/70"
                            : "bg-primary/60"
                        )}
                        style={{
                          width: `${hasCooldown && cooldown ? cooldown.percent : parseFloat(pct)}%`,
                        }}
                      />
                    </div>
                    {hasCooldown && cooldown && (
                      <div className="text-[9px] text-[#d9b45f] mt-1 text-center">
                        {Math.round(cooldown.percent)}%
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-zinc-700 flex-shrink-0" />
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
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: No type errors. The page should compile.

- [ ] **Step 3: Commit**

```bash
git add src/components/expert/WithdrawalsPage.tsx
git commit -m "feat: rewrite withdrawals page as staking portfolio"
```

---

### Task 3: Update page metadata

**Files:**
- Modify: `src/app/expert/withdrawals/page.tsx`

- [ ] **Step 1: Add metadata export**

Update `src/app/expert/withdrawals/page.tsx`:

```tsx
import WithdrawalsPage from "@/components/expert/WithdrawalsPage";

export const metadata = {
  title: "Staking Portfolio",
};

export default function Page() {
  return <WithdrawalsPage />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/expert/withdrawals/page.tsx
git commit -m "chore: update withdrawals page title to Staking Portfolio"
```

---

### Task 4: Visual QA and polish

**Files:**
- Possibly modify: `src/components/expert/WithdrawalsPage.tsx`

This task is manual verification and polish.

- [ ] **Step 1: Run dev server and test visually**

Run: `npm run dev`
Navigate to: `http://localhost:3000/expert/withdrawals`

Verify:
1. Stats row shows 4 cards (2×2 on narrow, 4-col on wide)
2. Guild positions list renders with correct names, amounts, percentages
3. Allocation bars reflect correct widths
4. Cooldown guilds (if any) show gold styling, badge, timer
5. Clicking a guild opens StakingModal in **withdraw** mode (not stake)
6. StakingModal preselects the clicked guild
7. "Back to Dashboard" link works
8. Empty state shows when no stakes exist
9. Loading spinner shows during data fetch

- [ ] **Step 2: Test modal flow**

1. Click a guild → modal opens in withdraw mode
2. Enter amount → click Withdraw → transaction flow works
3. Close modal → portfolio refreshes with updated data

- [ ] **Step 3: Fix any visual issues found**

Apply Tailwind adjustments as needed for spacing, colors, responsive behavior.

- [ ] **Step 4: Final build check**

Run: `npm run build`
Expected: Clean build, no errors.

- [ ] **Step 5: Commit any polish fixes**

```bash
git add src/components/expert/WithdrawalsPage.tsx
git commit -m "fix: visual polish for staking portfolio"
```
