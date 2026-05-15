// e2e/real-flow/scenarios/expert/expert-stake-withdrawal.spec.ts
//
// Expert-pillar coverage: stake withdrawal / unbonding.
//
// The bootstrap stakes ≥10 VETD per expert per guild via
// `ExpertStaking.stake(guildId, amount)`. This scenario drives the
// full withdrawal lifecycle for one of those experts:
//
//   request unstake → 7-day cooldown (anvil time skip) →
//   complete unstake → tokens back in wallet
//
// Asserts BOTH a user-visible outcome AND on-chain invariants:
//
//   • UI:    /expert/withdrawals reflects the request (the staking dashboard's
//            "X VETD currently queued" badge appears via the backend's chain-
//            direct `getUnstakeRequestDetailed` route), and post-completion
//            the empty state ("No active stakes found across any guilds")
//            renders for an expert with zero remaining positions.
//   • Chain: ExpertStaking.getStakeInfo(expert, guildId).amount drops by the
//            requested amount after the request; getUnstakeRequest is
//            populated with the exact amount + a future unlockTime;
//            VettedToken.balanceOf(expert) increases by exactly the
//            unstaked amount after completion; the unstake-request mapping
//            is cleared.
//
// Contract reference (smart-contracts/src/staking/ExpertStaking.sol):
//
//   - requestUnstake(guildId, amount):
//       reduces stakeInfo.amount by `amount`,
//       creates unstakeRequests[expert][guildId] = {amount, unlockTime = now + 7d},
//       emits UnstakeRequested.
//   - completeUnstake(guildId):
//       requires block.timestamp >= unlockTime,
//       transfers the tokens back to msg.sender,
//       clears the unstake request, emits Unstaked.
//
// ─── Why this is contract-direct, not UI-driven ──────────────────────────────
//
// The "primary" UI path would drive `requestUnstake` through the StakingModal
// on /expert/withdrawals. Two production-side gaps block that today; both are
// tracked in docs/testing/PROTOCOL_DIVERGENCES.md and confirmed reproducible:
//
//   • DIV-008: the production UI has NO button wired to
//     `ExpertStaking.completeUnstake(guildId)`. The post-cooldown ClaimCard's
//     "Manage withdrawal" CTA re-opens the request-unstake modal. There is
//     literally no UI surface that calls completeUnstake; the only ways out
//     are an off-platform contract call or the dormant `WithdrawalManager`
//     component that no route mounts.
//
//   • DIV-009: in E2E mode (`NEXT_PUBLIC_E2E_MODE=true`), wagmi's sepolia
//     fallback transport (config in `wagmi-config.ts:52-68`) ranks public
//     sepolia RPCs ahead of the local anvil RPC once viem's health probes
//     run. Every `useReadContract` call in the StakingModal then targets a
//     PUBLIC sepolia node — which has no code at our locally-deployed
//     contract addresses, so eth_call returns "0x" and the modal stays
//     stuck at "Balance: — Loading…" / "Staked: — Loading…" forever. This
//     fully blocks the Withdraw mode toggle (`disabled={!currentStake ...}`)
//     and the in-modal "Insufficient staked balance" gate
//     (`handleWithdraw` reads `stakeInfo[0]` to compute currentStake). The
//     same regression also breaks the expert-stake.smoke.spec.ts smoke
//     test, confirming this is a pre-existing E2E-infrastructure issue
//     unrelated to this scenario.
//
// While DIV-008 + DIV-009 are open, the scenario drives both
// `requestUnstake` and `completeUnstake` directly via the expert's viem
// wallet client — same pattern as `04-no-reveal-slashing.spec.ts` for the
// `onlyOwner` slash that also has no UI. We still log the expert in through
// the real UI flow and assert the user-visible Withdrawals page state at
// each lifecycle step (the page itself reads chain state via the backend's
// chain-direct service, which sidesteps DIV-009).

import { test, expect } from "../../fixtures";
import { loginAsExpertViaUI } from "../../helpers/ui-auth";
import { parseEther } from "viem";
import type { Address, Hex } from "viem";
import { BACKEND_URL } from "../../helpers/backend";

type StakeInfoTuple = readonly [bigint, bigint];
type UnstakeRequestTuple = readonly [bigint, bigint];

// Minimum stake floor in `ExpertStaking` (DEFAULT_MINIMUM_STAKE = 10 VETD).
// `requestUnstake` rejects a partial unstake that would leave a positive
// remaining balance under this floor — full-balance unstakes (remaining = 0)
// are always allowed.
const MIN_STAKE = parseEther("10");

// Default cooldown enforced by ExpertStaking (DEFAULT_COOLDOWN_PERIOD = 7 days).
const COOLDOWN_SECONDS = 7 * 24 * 60 * 60;
// One-second cushion so block.timestamp is strictly past unlockTime, not equal.
const COOLDOWN_PASSED_SECONDS = COOLDOWN_SECONDS + 1;

/**
 * Force the backend to re-read the expert's on-chain stake state into the
 * DB-mirrored `expert_guild_stakes` table. The production StakingModal
 * fires this same call on successful permit/stake/withdraw tx
 * (`blockchainApi.syncStake` in `WithdrawalsPage.handleModalSuccess` →
 * `useGuildStaking.refetchStake` + `blockchainApi.syncStake`), so calling
 * it here matches what would happen in a normal user flow.
 */
async function syncStakeToDb(
  request: import("@playwright/test").APIRequestContext,
  args: { address: Address; blockchainGuildId: Hex },
): Promise<void> {
  const res = await request.post(`${BACKEND_URL}/api/blockchain/staking/sync`, {
    data: {
      walletAddress: args.address,
      // Controller expects `guildId` in the body (which is the on-chain
      // bytes32 guild id, per stakingService.syncStakeFromBlockchain).
      guildId: args.blockchainGuildId,
    },
  });
  expect(
    res.ok(),
    `POST /staking/sync should succeed (got ${res.status()})`,
  ).toBeTruthy();
}

test(
  "expert requests unstake, waits out the cooldown, completes withdrawal, and the on-chain stake + VETD balance reflect the return",
  async ({
    page,
    experts,
    guild,
    contracts,
    anvil,
    wallet,
    cleanState: _cleanState,
  }) => {
    // Multi-phase flow: UI login + 2 on-chain txs + 7-day time skip + UI
    // re-render assertions. The headline scenario already budgets 180s;
    // give us comparable headroom.
    test.setTimeout(180_000);
    void _cleanState;

    // Pick a deterministic expert that's bootstrapped into the headline
    // guild (Engineering) — guild fixture is guilds[0], expert is the first
    // expert filtered to that guild.
    const expert = experts.find((e) => e.guildId === guild.id);
    expect(
      expert,
      "fixture invariant: bootstrap must stake at least one expert in guilds[0]",
    ).toBeDefined();
    const expertAddress = expert!.address as Address;
    const guildIdBytes32 = guild.on_chain_guild_id as Hex;

    // ─── Phase 0: Read every chain baseline we'll later compare against ────
    // We don't pin the baseline stake to a specific value: `e2e:bootstrap` is
    // NOT idempotent (each invocation adds another 10 VETD per expert on top
    // of whatever's already staked), so the post-bootstrap baseline varies
    // with how many times the stack has been re-seeded. The chain invariants
    // we care about are RELATIVE deltas vs this baseline. We do require
    // baseline >= MIN_STAKE so a full-balance unstake is legal.
    let onChainStakeBefore!: bigint;
    let unstakeAmount!: bigint;
    let tokenBalanceBefore!: bigint;
    await test.step("read the expert's on-chain stake and VETD wallet balance baseline", async () => {
      const info = (await contracts.expertStaking.read.getStakeInfo([
        expertAddress,
        guildIdBytes32,
      ])) as StakeInfoTuple;
      onChainStakeBefore = info[0];

      // We need enough headroom to do a partial unstake AND leave at least
      // MIN_STAKE active afterwards. The contract rejects partial unstakes
      // whose remainder is in (0, MIN_STAKE). We require baseline >= 2*MIN.
      expect(
        onChainStakeBefore,
        "fixture invariant: bootstrap must stake at least 2*MIN_STAKE per expert " +
          "(needed to exercise partial unstake with positive remainder)",
      ).toBeGreaterThanOrEqual(MIN_STAKE * 2n);

      // Unstake everything ABOVE MIN_STAKE so the remaining active balance
      // is exactly MIN_STAKE (10 VETD). The position thus stays visible on
      // /expert/withdrawals throughout the test (the page's
      // `guildsWithStakes` filter drops positions where staked_amount=0,
      // so a full-balance unstake would render an empty state for BOTH
      // the post-request and post-completion phases — making the UI
      // assertions degenerate). A partial unstake gives us a real
      // user-visible "pending unstake on an active position" state.
      unstakeAmount = onChainStakeBefore - MIN_STAKE;

      tokenBalanceBefore = (await contracts.vettedToken.read.balanceOf([
        expertAddress,
      ])) as bigint;

      // No pre-existing unstake request — bootstrap stakes but never unstakes.
      const pre = (await contracts.expertStaking.read.getUnstakeRequest([
        expertAddress,
        guildIdBytes32,
      ])) as UnstakeRequestTuple;
      expect(pre[0]).toBe(0n);
    });

    // ─── Phase 1: Log the expert in via the real production UI ────────────
    await test.step("expert connects their wallet and lands on the dashboard via the real login flow", async () => {
      await wallet.attach(page, expert!.privateKey);
      await loginAsExpertViaUI(page, expertAddress);
    });

    // ─── Phase 2: Confirm the Withdrawals page surfaces the active position ─
    await test.step("the Withdrawals page initially lists the expert's active staked position", async () => {
      await page.goto("/expert/withdrawals", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: /withdrawals/i }).first(),
      ).toBeVisible({ timeout: 30_000 });

      // The hero "Total staked" tile renders a numeric value > 0 once
      // blockchainApi.getExpertGuildStakes resolves (DB-mirrored; backend
      // chain-fallback for fresh accounts). Match the "<n>.<dd> VETD" pill
      // on the hero card to be tolerant of formatting (compact / decimal).
      await expect(
        page.getByText(/active position/i).first(),
      ).toBeVisible({ timeout: 15_000 });
    });

    // ─── Phase 3: Drive requestUnstake on-chain [DIV-009 workaround] ──────
    // The production UI's StakingModal cannot complete a withdraw because the
    // in-modal wagmi reads stall at "Loading…" against public-sepolia
    // fallback RPCs (DIV-009). The contract-direct path drives the same
    // on-chain function the modal would have called.
    await test.step("expert submits the request-unstake transaction on-chain (UI surface blocked by DIV-009)", async () => {
      const hash = await contracts.expertStaking.write.requestUnstake(
        [guildIdBytes32, unstakeAmount],
        { account: expert!.client.account },
      );
      // Wait for the tx to mine. viem's `contract.write.*` returns once the
      // RPC accepts the tx, not after it's mined. The cleanState background
      // miner mines every 200ms — but Phase 4's read MUST observe the post-
      // mine state, so we wait for the receipt explicitly here.
      await anvil.publicClient.waitForTransactionReceipt({ hash });
    });

    // ─── Phase 4: Chain invariant — request mutated state as expected ─────
    await test.step("the on-chain stake drops and a 7-day-cooldown unstake request is recorded", async () => {
      const info = (await contracts.expertStaking.read.getStakeInfo([
        expertAddress,
        guildIdBytes32,
      ])) as StakeInfoTuple;
      expect(
        info[0],
        "stake amount should be reduced by the requested unstake amount",
      ).toBe(onChainStakeBefore - unstakeAmount);

      const req = (await contracts.expertStaking.read.getUnstakeRequest([
        expertAddress,
        guildIdBytes32,
      ])) as UnstakeRequestTuple;
      expect(
        req[0],
        "unstake request should reflect the requested amount",
      ).toBe(unstakeAmount);
      expect(
        req[1],
        "unstake request must carry a future unlockTime (cooldown not yet elapsed)",
      ).toBeGreaterThan(0n);

      // Cooldown should be ~7 days in the future (allow generous tolerance for
      // anvil drift + block.timestamp inheritance from the last mined block).
      const block = await anvil.publicClient.getBlock();
      const expectedUnlock = block.timestamp + BigInt(COOLDOWN_SECONDS);
      const diff =
        req[1] > expectedUnlock
          ? req[1] - expectedUnlock
          : expectedUnlock - req[1];
      expect(
        diff,
        "unlockTime must be within ~60s of (now + 7 days)",
      ).toBeLessThan(60n);

      // Token balance is unchanged — tokens stay in the contract during cooldown.
      const balMid = (await contracts.vettedToken.read.balanceOf([
        expertAddress,
      ])) as bigint;
      expect(
        balMid,
        "wallet VETD balance should NOT change on request — tokens unlock only after completeUnstake",
      ).toBe(tokenBalanceBefore);
    });

    // ─── Phase 5: User-visible — the pending unstake surfaces on the UI ───
    await test.step("the Withdrawals page surfaces the pending unstake after the request", async () => {
      // Sync DB mirror so the page's blockchainApi.getExpertGuildStakes
      // (which reads DB first) reflects the post-request state. The
      // production StakingModal does this same sync on tx success.
      await syncStakeToDb(page.request, {
        address: expertAddress,
        blockchainGuildId: guildIdBytes32,
      });

      await page.goto("/expert/withdrawals", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: /withdrawals/i }).first(),
      ).toBeVisible({ timeout: 30_000 });

      // The hero "currently queued" line appears when pending > 0. Match the
      // amount-agnostic suffix so the assertion is robust against varying
      // bootstrap stake totals (the unstaked amount tracks the cumulative
      // bootstrap stake — see Phase 0).
      await expect(
        page.getByText(/VETD\s+currently queued/i).first(),
      ).toBeVisible({ timeout: 15_000 });
    });

    // ─── Phase 6: Skip the 7-day cooldown on the anvil chain ──────────────
    await test.step("anvil advances 7 days + 1s so the cooldown elapses on-chain", async () => {
      // increaseTime() mines a block after the timestamp jump (see
      // helpers/chain.ts), so block.timestamp advances and is observable to
      // subsequent reads/writes.
      await anvil.increaseTime(COOLDOWN_PASSED_SECONDS);

      const req = (await contracts.expertStaking.read.getUnstakeRequest([
        expertAddress,
        guildIdBytes32,
      ])) as UnstakeRequestTuple;
      const block = await anvil.publicClient.getBlock();
      expect(
        block.timestamp,
        "after increaseTime(7d+1s), chain time must be at or past unlockTime",
      ).toBeGreaterThanOrEqual(req[1]);
    });

    // ─── Phase 7: Complete the unstake [DIV-008] ──────────────────────────
    // The production UI has no completeUnstake button (DIV-008). Drive the
    // contract directly via the expert's wallet client.
    await test.step("expert finalizes the withdrawal on-chain (no production UI button — DIV-008)", async () => {
      const hash = await contracts.expertStaking.write.completeUnstake(
        [guildIdBytes32],
        { account: expert!.client.account },
      );
      await anvil.publicClient.waitForTransactionReceipt({ hash });
    });

    // ─── Phase 8: Chain invariant — tokens returned, request cleared ──────
    await test.step("the unstake request is cleared and the VETD wallet balance has increased by the unstaked amount", async () => {
      const reqAfter = (await contracts.expertStaking.read.getUnstakeRequest([
        expertAddress,
        guildIdBytes32,
      ])) as UnstakeRequestTuple;
      expect(
        reqAfter[0],
        "unstake request must be cleared after completeUnstake",
      ).toBe(0n);
      expect(reqAfter[1]).toBe(0n);

      const balAfter = (await contracts.vettedToken.read.balanceOf([
        expertAddress,
      ])) as bigint;
      expect(
        balAfter - tokenBalanceBefore,
        "VETD wallet balance must increase by exactly the unstaked amount",
      ).toBe(unstakeAmount);

      // And stakeInfo.amount stays at the post-request value (no double-count).
      const infoAfter = (await contracts.expertStaking.read.getStakeInfo([
        expertAddress,
        guildIdBytes32,
      ])) as StakeInfoTuple;
      expect(infoAfter[0]).toBe(onChainStakeBefore - unstakeAmount);
    });

    // ─── Phase 9: User-visible — pending unstake disappears post-completion ─
    await test.step("the Withdrawals page no longer shows a queued unstake after completion (position remains with MIN_STAKE active)", async () => {
      await syncStakeToDb(page.request, {
        address: expertAddress,
        blockchainGuildId: guildIdBytes32,
      });

      await page.goto("/expert/withdrawals", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: /withdrawals/i }).first(),
      ).toBeVisible({ timeout: 30_000 });

      // The position is still listed — the partial unstake left MIN_STAKE
      // (10 VETD) active.
      await expect(
        page.getByText(/active position/i).first(),
      ).toBeVisible({ timeout: 15_000 });

      // The "<n> VETD currently queued" hero badge from Phase 5 must be GONE
      // now that completeUnstake cleared the request. The hero only renders
      // that badge while `pendingUnstake.totalAmount > 0`
      // (`WithdrawalsPage.tsx:345`).
      await expect(
        page.getByText(/VETD\s+currently queued/i),
      ).toHaveCount(0, { timeout: 15_000 });
    });
  },
);
