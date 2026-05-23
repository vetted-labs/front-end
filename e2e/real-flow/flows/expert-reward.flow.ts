import { expect, type Page } from "@playwright/test";
import type { Expert } from "../fixtures";
import { attachWallet } from "../helpers/wallet-injection";
import { loginAsExpertViaUI } from "../helpers/ui-auth";

export async function openExpertEarningsViaUI(
  basePage: Page,
  expert: Expert,
): Promise<Page> {
  const browser = basePage.context().browser();
  if (!browser)
    throw new Error("openExpertEarningsViaUI: browser handle unavailable");

  const context = await browser.newContext({
    baseURL: new URL(basePage.url()).origin,
    bypassCSP: true,
  });
  const page = await context.newPage();
  await attachWallet(page, expert.privateKey, {
    rpcUrl: process.env.ANVIL_RPC_URL,
  });
  await loginAsExpertViaUI(page, expert.address);
  await page.goto("/expert/earnings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /^earnings$/i })).toBeVisible({
    timeout: 30_000,
  });
  return page;
}

export async function claimAllRewardsViaUI(page: Page): Promise<void> {
  const claimButton = page.getByRole("button", { name: /claim all/i }).first();
  await expect(claimButton).toBeVisible({ timeout: 30_000 });
  await expect(claimButton).toBeEnabled({ timeout: 30_000 });
  await claimButton.click();

  await expect(
    page
      .getByText(/transaction submitted/i)
      .or(page.getByText(/rewards claimed successfully/i))
      .first(),
  ).toBeVisible({ timeout: 30_000 });

  await expect(
    page.getByText(/rewards claimed successfully/i).first(),
  ).toBeVisible({
    timeout: 60_000,
  });
}
