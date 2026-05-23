// Bonus: drive the FULL RainbowKit modal flow with the headless wallet.
// This verifies that the "Testing" group with our custom wallet renders and
// works end-to-end — the user clicks Connect Wallet → modal opens → clicks
// Headless E2E Wallet → wagmi connects through the shim.

import { test, expect } from "@playwright/test";
import { attachWallet } from "../helpers/wallet-injection";
import { readWagmiAddress } from "../helpers/ui-auth";

const ACCOUNT_1_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;
const ACCOUNT_1_ADDR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;

const RPC = process.env.ANVIL_RPC_URL ?? "http://localhost:8545";

test("RK modal: click Headless E2E Wallet → wagmi connects through shim", async ({
  page,
}) => {
  await test.step("Verify: RK modal: click Headless E2E Wallet → wagmi connects through shim", async () => {
    await attachWallet(page, ACCOUNT_1_KEY, { rpcUrl: RPC });
    await page.goto("/auth/login?type=expert");

    await page
      .getByRole("button", { name: /connect wallet/i })
      .first()
      .click();

    // The "Testing" group exposes our headless wallet entry.
    await page
      .getByRole("button", { name: /headless e2e wallet/i })
      .first()
      .click();

    await expect
      .poll(async () => (await readWagmiAddress(page))?.toLowerCase() ?? null, {
        timeout: 15_000,
      })
      .toBe(ACCOUNT_1_ADDR.toLowerCase());
  });
});
