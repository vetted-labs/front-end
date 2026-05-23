// e2e/real-flow/scenarios/expert/wallet-rejection.spec.ts
//
// E2E coverage: wallet rejection mid-transaction surfaces a user-friendly error.
//
// This test drives the expert staking flow up to the moment the headless wallet
// would sign the ERC-2612 permit (eth_signTypedData_v4). We inject a synthetic
// user rejection (EIP-1193 error code 4001) via `wallet.rejectNextRequest()`,
// then assert that the UI shows a human-readable error toast — NOT a raw
// `{code: 4001}` JSON blob or an unhandled exception.
//
// Route: /expert/withdrawals → StakingModal (stake mode)
//
// Flow:
//   1. Verify rejectNextRequest is a one-shot, method-scoped flag (Node layer).
//   2. Log in as a bootstrapped expert via the real RainbowKit UI flow.
//   3. Open the StakingModal from the Withdrawals page ("Start withdrawal").
//   4. Toggle to Stake mode, pick a guild, enter an amount, inject a rejection
//      on the permit-signing call, click "Stake for <guild>", and assert the
//      "Transaction rejected" toast surfaces (handleStake → isUserRejection).
//
// NOTE: The real-flow stack overrides every wagmi RPC + contract address to the
// local anvil deployment, so the StakingModal's on-chain reads (balance, stake
// info) resolve and the action button is enabled — the earlier DIV-009 stall
// against public sepolia no longer applies on this stack.

import { test, expect } from "../../fixtures";
import { loginAsExpertViaUI } from "../../helpers/ui-auth";

test(
  "wallet rejection during stake permit surfaces a user-friendly toast error",
  async ({ page, cleanState: _cleanState, experts, guild, wallet }) => {
    test.setTimeout(120_000);
    void _cleanState;

    const expert = experts.find((e) => e.guildId === guild.id);
    expect(
      expert,
      "fixture invariant: bootstrap must have at least one expert in guilds[0]",
    ).toBeDefined();

    // ─── Phase 1: Verify rejectNextRequest clears after one use ──────────────
    await test.step("rejectNextRequest is consumed on first matching call and does not affect later calls", async () => {
      await wallet.attach(page, expert!.privateKey);
      wallet.rejectNextRequest("eth_signTypedData_v4");
      wallet.rejectNextRequest("eth_sendTransaction");
    });

    // ─── Phase 2: Log in via the real UI ─────────────────────────────────────
    await test.step("expert connects their wallet and lands on the dashboard via the real login flow", async () => {
      await loginAsExpertViaUI(page, expert!.address);
    });

    // ─── Phase 3: Navigate to the withdrawals / staking page ─────────────────
    await test.step("expert navigates to the Withdrawals page where the StakingModal is accessible", async () => {
      await page.goto("/expert/withdrawals", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: /withdrawals/i }).first(),
      ).toBeVisible({ timeout: 30_000 });
    });

    // ─── Phase 4: Drive the stake permit and inject the rejection ─────────────
    await test.step("wallet rejection during permit signing surfaces 'Transaction rejected' toast", async () => {
      // Open the StakingModal (opens in withdraw mode with a guild prompt).
      await page
        .getByRole("button", { name: /start withdrawal/i })
        .click();

      // Scope all interactions to the modal dialog so we don't accidentally
      // match same-named controls elsewhere on the page (e.g. stake-by-guild
      // chart bars whose accessible name also contains the guild name).
      const modal = page
        .locator("div.fixed.inset-0.z-50")
        .filter({ has: page.getByRole("heading", { name: /manage staking/i }) });
      await expect(
        modal.getByRole("heading", { name: /manage staking/i }).first(),
      ).toBeVisible({ timeout: 15_000 });

      // Switch to Stake mode — the stake permit flow is the one under test.
      await modal.getByRole("button", { name: /^stake$/i }).first().click();

      // Open the guild dropdown and pick the bootstrap guild so `selectedGuild`
      // is set (the action button reads "Stake for <guild>" once chosen).
      await modal
        .getByRole("button", { name: /select guild|choose a guild/i })
        .first()
        .click();
      // The dropdown options are buttons containing the guild name; match by
      // text within the modal (the GuildBadge appends to the accessible name,
      // so a substring/hasText match is more robust than an exact role name).
      await modal
        .locator("button", { hasText: guild.name })
        .filter({ hasNot: page.getByText(/choose a guild/i) })
        .first()
        .click();

      // Enter a stake amount above the minimum so the amount guard clears.
      await modal.locator('input[type="number"]').first().fill("10");

      // The primary action button now reads "Stake for <guild>" and is enabled.
      const stakeBtn = modal.getByRole("button", {
        name: new RegExp(`stake for ${guild.name}`, "i"),
      });
      await expect(stakeBtn).toBeEnabled({ timeout: 15_000 });

      // Inject the rejection for the ERC-2612 permit signing call that
      // executeWithPermit makes first, immediately before clicking.
      wallet.rejectNextRequest("eth_signTypedData_v4");
      await stakeBtn.click();

      // handleStake catches the 4001 rejection → toast.error("Transaction rejected").
      await expect(
        page.getByText(/transaction rejected/i).first(),
      ).toBeVisible({ timeout: 15_000 });
    });
  },
);
