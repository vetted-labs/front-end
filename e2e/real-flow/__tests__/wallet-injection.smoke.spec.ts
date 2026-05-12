// Smoke test: drives the full Node↔Page bridge end-to-end. Loads a tiny
// data: URL, attaches the wallet, then invokes window.ethereum.request from
// page context and verifies signatures recover to the injected account.
//
// This proves the injection layer works without needing the Vetted backend
// or contracts. Failures here block any real-flow scenario migration.

import { test, expect } from "@playwright/test";
import { recoverMessageAddress, type Hex } from "viem";
import { attachWallet } from "../helpers/wallet-injection";

const ACCOUNT_1_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;
const ACCOUNT_1_ADDR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;
const ACCOUNT_2_KEY =
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" as const;
const ACCOUNT_2_ADDR = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as const;

const RPC = process.env.ANVIL_RPC_URL ?? "http://localhost:18545";
const BLANK_PAGE = "data:text/html,<!doctype html><html><body><h1>shim</h1></body></html>";

test("page sees window.ethereum after attachWallet", async ({ page }) => {
  await attachWallet(page, ACCOUNT_1_KEY, { rpcUrl: RPC });
  await page.goto(BLANK_PAGE);

  const hasEthereum = await page.evaluate(() => typeof window.ethereum !== "undefined");
  expect(hasEthereum).toBe(true);

  const isMetaMask = await page.evaluate(
    () => (window.ethereum as { isMetaMask?: boolean } | undefined)?.isMetaMask === true,
  );
  expect(isMetaMask).toBe(true);
});

test("page-side eth_accounts routes to Node and returns active address", async ({ page }) => {
  await attachWallet(page, ACCOUNT_1_KEY, { rpcUrl: RPC });
  await page.goto(BLANK_PAGE);

  const accounts = await page.evaluate(async () => {
    return (await (window.ethereum as {
      request: (args: { method: string }) => Promise<string[]>;
    }).request({ method: "eth_accounts" })) as string[];
  });

  expect(accounts[0].toLowerCase()).toBe(ACCOUNT_1_ADDR.toLowerCase());
});

test("page-side personal_sign produces signature recoverable to injected account", async ({
  page,
}) => {
  await attachWallet(page, ACCOUNT_1_KEY, { rpcUrl: RPC });
  await page.goto(BLANK_PAGE);

  const message = "Vetted SIWE bridge test";

  const sig = await page.evaluate(async (msg) => {
    const hex = "0x" + Array.from(new TextEncoder().encode(msg))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return (await (window.ethereum as {
      request: (args: { method: string; params: unknown[] }) => Promise<string>;
    }).request({
      method: "personal_sign",
      params: [hex, "0x0"],
    })) as `0x${string}`;
  }, message);

  expect(sig).toMatch(/^0x[0-9a-f]+$/i);

  const recovered = await recoverMessageAddress({ message, signature: sig as Hex });
  expect(recovered.toLowerCase()).toBe(ACCOUNT_1_ADDR.toLowerCase());
});

test("switchAccount propagates new address to page via accountsChanged", async ({ page }) => {
  const handle = await attachWallet(page, ACCOUNT_1_KEY, { rpcUrl: RPC });
  await page.goto(BLANK_PAGE);

  // Subscribe to accountsChanged on the page side
  await page.evaluate(() => {
    (window as unknown as { __seen: string[] }).__seen = [];
    (window.ethereum as {
      on: (event: string, cb: (accounts: string[]) => void) => void;
    }).on("accountsChanged", (accounts: string[]) => {
      (window as unknown as { __seen: string[] }).__seen.push(...accounts);
    });
  });

  await handle.switchAccount(ACCOUNT_2_KEY);

  // Give the event a tick to propagate
  await page.waitForFunction(() =>
    (window as unknown as { __seen: string[] }).__seen.length > 0,
  );

  const seen = await page.evaluate(
    () => (window as unknown as { __seen: string[] }).__seen,
  );
  expect(seen.length).toBeGreaterThan(0);
  expect(seen[seen.length - 1].toLowerCase()).toBe(ACCOUNT_2_ADDR.toLowerCase());

  // New signatures should recover to account 2
  const sig = await page.evaluate(async () => {
    const msg = "post-switch";
    const hex = "0x" + Array.from(new TextEncoder().encode(msg))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return (await (window.ethereum as {
      request: (args: { method: string; params: unknown[] }) => Promise<string>;
    }).request({ method: "personal_sign", params: [hex, "0x0"] })) as `0x${string}`;
  });
  const recovered = await recoverMessageAddress({
    message: "post-switch",
    signature: sig as Hex,
  });
  expect(recovered.toLowerCase()).toBe(ACCOUNT_2_ADDR.toLowerCase());
});

test("EIP-6963 announce event responds to requestProvider", async ({ page }) => {
  await attachWallet(page, ACCOUNT_1_KEY, { rpcUrl: RPC });
  await page.goto(BLANK_PAGE);

  // Standard EIP-6963 discovery pattern: dApps listen for announce, then
  // dispatch requestProvider to trigger any wallets that loaded first to
  // re-announce. Our shim subscribes to requestProvider and re-fires.
  const announces = await page.evaluate(async () => {
    const collected: { info: { rdns: string } }[] = [];
    window.addEventListener("eip6963:announceProvider", (e) => {
      collected.push((e as CustomEvent).detail);
    });
    window.dispatchEvent(new CustomEvent("eip6963:requestProvider"));
    // Give the re-announce a microtask to fire
    await new Promise((r) => setTimeout(r, 50));
    return collected;
  });

  expect(announces.length).toBeGreaterThan(0);
  expect(announces[0].info.rdns).toBe("io.metamask");
});
