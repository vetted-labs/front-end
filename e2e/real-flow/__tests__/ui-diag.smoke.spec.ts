// More-targeted diagnostics for the shim integration.

import { test, expect } from "@playwright/test";
import { attachWallet } from "../helpers/wallet-injection";

const ACCOUNT_1_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;
const RPC = process.env.ANVIL_RPC_URL ?? "http://localhost:8545";

test("inspect wagmi connectors after load", async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on("console", (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  await attachWallet(page, ACCOUNT_1_KEY, { rpcUrl: RPC });
  await page.goto("/auth/login?type=expert");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const diag = await page.evaluate(async () => {
    const eth = window.ethereum as Record<string, unknown> | undefined;
    return {
      hasEthereum: !!eth,
      isMetaMask: eth?.isMetaMask,
      hasHwProvider: !!(window as unknown as { __hwProvider?: unknown }).__hwProvider,
      hasHwRequest: typeof (window as unknown as { __hwRequest?: unknown }).__hwRequest === "function",
    };
  });

  console.log("DIAG:", JSON.stringify(diag));
  console.log("LOGS:", consoleLogs.slice(0, 30).join("\n"));

  expect(diag.hasEthereum).toBe(true);
  expect(diag.isMetaMask).toBe(true);
  expect(diag.hasHwProvider).toBe(true);
  expect(diag.hasHwRequest).toBe(true);
});

test("manually trigger connect via window.ethereum, then check wagmi useAccount", async ({
  page,
}) => {
  await attachWallet(page, ACCOUNT_1_KEY, { rpcUrl: RPC });
  await page.goto("/auth/login?type=expert");
  await page.waitForLoadState("networkidle");

  // Directly request accounts from window.ethereum (simulates what any wagmi
  // connector would do). This proves the round-trip works.
  const accounts = await page.evaluate(async () => {
    return await (window.ethereum as {
      request: (a: { method: string }) => Promise<string[]>;
    }).request({ method: "eth_accounts" });
  });

  console.log("ACCOUNTS:", accounts);
  expect(accounts.length).toBeGreaterThan(0);
});
