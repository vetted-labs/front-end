// e2e/real-flow/helpers/ui-auth.ts
//
// Playwright helpers for the wallet-auth surfaces in Vetted's UI:
//   - connectWalletViaUI: drives the RainbowKit modal end-to-end
//   - switchAccountUI:   swaps the active account and waits for re-render
//   - disconnectWalletUI: clears the connection (used between scenarios)
//
// Selectors target RainbowKit's stable data-testids where possible; the
// connect-button trigger uses role-based queries against the in-app
// "Connect Wallet" button (currently rendered by ConnectButton.Custom in
// the app shell).

import { expect, type Page } from "@playwright/test";
import type { Hex } from "viem";
import type { InjectedWalletHandle } from "./wallet-injection";

const CONNECT_BUTTON_TEXT = /connect wallet/i;

/**
 * Open the RainbowKit modal, pick MetaMask (our headless shim advertises
 * isMetaMask: true), and wait for wagmi to surface the connected state.
 *
 * Idempotent: if a wallet is already connected, returns immediately.
 */
export async function connectWalletViaUI(page: Page): Promise<void> {
  // Fast path: if the address chip is already visible, we're connected.
  const accountChip = page.getByTestId("rk-account-button");
  if (await accountChip.isVisible().catch(() => false)) return;

  // Trigger modal — the in-app "Connect Wallet" button.
  await page.getByRole("button", { name: CONNECT_BUTTON_TEXT }).first().click();

  // RainbowKit modal: pick the MetaMask entry. The shim sets isMetaMask: true
  // + announces via EIP-6963, so wagmi labels it "MetaMask".
  await page
    .getByTestId("rk-wallet-option-metaMask")
    .or(page.getByTestId("rk-wallet-option-io.metamask"))
    .first()
    .click({ timeout: 10_000 });

  // Wait for the account-button chip to appear (= wagmi.useAccount.isConnected).
  await expect(accountChip).toBeVisible({ timeout: 15_000 });
}

/**
 * Switch to a different account on the headless wallet and wait for the UI
 * to re-render with the new address. Falls back to a full page reload if
 * wagmi doesn't re-connect within `timeoutMs`.
 */
export async function switchAccountUI(
  page: Page,
  handle: InjectedWalletHandle,
  privateKey: Hex,
  opts: { timeoutMs?: number } = {},
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 5_000;
  await handle.switchAccount(privateKey);

  const expected = handle.wallet.address.toLowerCase();

  // Wait for any element on the page to surface the new address (truncated).
  // The account-button chip text contains a truncated form like "0x1234…abcd".
  const shortPrefix = expected.slice(0, 6);
  const shortSuffix = expected.slice(-4);

  const surfaced = await page
    .getByText(new RegExp(`${shortPrefix}.{0,4}${shortSuffix}`, "i"))
    .first()
    .waitFor({ state: "visible", timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);

  if (!surfaced) {
    // Fallback path: wagmi missed the accountsChanged event. Reload.
    await handle.hardReload();
    await connectWalletViaUI(page);
  }
}

/**
 * Open the RainbowKit account menu and click Disconnect. No-op if no wallet
 * is currently connected.
 */
export async function disconnectWalletUI(page: Page): Promise<void> {
  const accountChip = page.getByTestId("rk-account-button");
  if (!(await accountChip.isVisible().catch(() => false))) return;
  await accountChip.click();
  await page.getByRole("button", { name: /disconnect/i }).click();
  await expect(accountChip).toBeHidden({ timeout: 5_000 });
}
