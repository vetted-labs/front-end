// Diagnostic: verify EIP-6963 detection through the real Vetted stack.

import { test, expect } from "@playwright/test";
import { attachWallet } from "../helpers/wallet-injection";

const ACCOUNT_1_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;

const RPC = process.env.ANVIL_RPC_URL ?? "http://localhost:8545";

test("EIP-6963 announce reaches the page after navigation", async ({ page }) => {
  await attachWallet(page, ACCOUNT_1_KEY, { rpcUrl: RPC });
  await page.goto("/auth/login?type=expert");

  // Wait for app to settle (wagmi should have done its discovery by now)
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Manually dispatch requestProvider and collect announces
  const detected = await page.evaluate(async () => {
    const found: { info: { rdns: string; name: string } }[] = [];
    const handler = (e: Event) => {
      found.push((e as CustomEvent).detail);
    };
    window.addEventListener("eip6963:announceProvider", handler);
    window.dispatchEvent(new CustomEvent("eip6963:requestProvider"));
    await new Promise((r) => setTimeout(r, 200));
    window.removeEventListener("eip6963:announceProvider", handler);
    return found;
  });

  expect(detected.length).toBeGreaterThan(0);
  expect(detected.find((d) => d.info.rdns === "io.metamask")).toBeTruthy();
});

test("opening the connect modal shows an Installed section with our shim", async ({ page }) => {
  await attachWallet(page, ACCOUNT_1_KEY, { rpcUrl: RPC });
  await page.goto("/auth/login?type=expert");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: /connect wallet/i }).first().click();

  // The RainbowKit modal opens. EIP-6963-detected wallets go to "Installed".
  await expect(page.getByText(/installed/i).first()).toBeVisible({ timeout: 10_000 });
});
