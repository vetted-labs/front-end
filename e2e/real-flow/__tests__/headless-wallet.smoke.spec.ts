// Smoke test: verifies HeadlessWallet's Node-side EIP-1193 surface against
// a real anvil instance. Run via Playwright's smoke project (no browser
// needed; just exercises the class directly).
//
// Set ANVIL_RPC_URL to point at the anvil instance.

import { test, expect } from "@playwright/test";
import { recoverMessageAddress, hexToBytes, type Hex } from "viem";
import { HeadlessWallet } from "../helpers/headless-wallet";

// Anvil account 1 (well-known deterministic key)
const ACCOUNT_1_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;
const ACCOUNT_1_ADDR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;
const ACCOUNT_2_KEY =
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" as const;

const RPC = process.env.ANVIL_RPC_URL ?? "http://localhost:8545";

test("eth_accounts returns the active address", async () => {
  await test.step("Verify: eth_accounts returns the active address", async () => {
    const w = new HeadlessWallet({ privateKey: ACCOUNT_1_KEY, rpcUrl: RPC });
    const accounts = (await w.request({ method: "eth_accounts" })) as string[];
    expect(accounts[0].toLowerCase()).toBe(ACCOUNT_1_ADDR.toLowerCase());
  });
});

test("eth_chainId returns 0xaa36a7 (sepolia)", async () => {
  await test.step("Verify: eth_chainId returns 0xaa36a7 (sepolia)", async () => {
    // We run anvil with `--chain-id 11155111` so the whole stack aligns on
    // sepolia (BE provider, FE wagmi sepolia, CommitmentForm's sepolia gate).
    const w = new HeadlessWallet({ privateKey: ACCOUNT_1_KEY, rpcUrl: RPC });
    const id = await w.request({ method: "eth_chainId" });
    expect(id).toBe("0xaa36a7");
  });
});

test("personal_sign produces a recoverable signature", async () => {
  await test.step("Verify: personal_sign produces a recoverable signature", async () => {
    const w = new HeadlessWallet({ privateKey: ACCOUNT_1_KEY, rpcUrl: RPC });

    // Encode a SIWE-style challenge as hex per personal_sign convention
    const message = "Vetted wants you to sign in.\n\nNonce: abc123";
    const hexMessage =
      `0x${Buffer.from(message, "utf8").toString("hex")}` as Hex;

    const sig = (await w.request({
      method: "personal_sign",
      params: [hexMessage, ACCOUNT_1_ADDR],
    })) as Hex;

    expect(sig).toMatch(/^0x[0-9a-f]+$/i);

    // Recover and confirm it matches the active account
    const recovered = await recoverMessageAddress({ message, signature: sig });
    expect(recovered.toLowerCase()).toBe(ACCOUNT_1_ADDR.toLowerCase());
  });
});

test("eth_sendTransaction submits to anvil and returns a tx hash", async () => {
  await test.step("Verify: eth_sendTransaction submits to anvil and returns a tx hash", async () => {
    const w = new HeadlessWallet({ privateKey: ACCOUNT_1_KEY, rpcUrl: RPC });

    const hash = (await w.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: ACCOUNT_1_ADDR,
          to: "0x0000000000000000000000000000000000000001",
          value: "0x1", // 1 wei
        },
      ],
    })) as Hex;

    expect(hash).toMatch(/^0x[0-9a-f]{64}$/i);

    // Confirm anvil actually mined it. eth_sendTransaction returns when the tx
    // is submitted; receipt may lag by a tick on auto-mine. Poll briefly.
    let receipt: unknown = null;
    for (let i = 0; i < 20 && !receipt; i++) {
      receipt = await w.request({
        method: "eth_getTransactionReceipt",
        params: [hash],
      });
      if (!receipt) await new Promise((r) => setTimeout(r, 50));
    }
    expect(receipt).toBeTruthy();
  });
});

test("setAccount swaps the active key + emits accountsChanged", async () => {
  await test.step("Verify: setAccount swaps the active key + emits accountsChanged", async () => {
    const w = new HeadlessWallet({ privateKey: ACCOUNT_1_KEY, rpcUrl: RPC });

    const events: string[][] = [];
    w.on("accountsChanged", (accounts: string[]) => events.push(accounts));

    // Switch to account 2
    w.setAccount(ACCOUNT_2_KEY);

    const accounts = (await w.request({ method: "eth_accounts" })) as string[];
    expect(accounts[0]).not.toBe(ACCOUNT_1_ADDR);

    expect(events.length).toBe(1);
    expect(events[0][0]).toBe(accounts[0]);

    // Sign with the new account and confirm recovery matches
    const message = "switch test";
    const hexMessage =
      `0x${Buffer.from(message, "utf8").toString("hex")}` as Hex;
    const sig = (await w.request({
      method: "personal_sign",
      params: [hexMessage, accounts[0]],
    })) as Hex;
    const recovered = await recoverMessageAddress({ message, signature: sig });
    expect(recovered.toLowerCase()).toBe(accounts[0].toLowerCase());
  });
});

test("unknown methods are passed through to anvil", async () => {
  await test.step("Verify: unknown methods are passed through to anvil", async () => {
    const w = new HeadlessWallet({ privateKey: ACCOUNT_1_KEY, rpcUrl: RPC });
    const blockNumber = (await w.request({
      method: "eth_blockNumber",
    })) as string;
    expect(blockNumber).toMatch(/^0x[0-9a-f]+$/i);
  });
});

test("hexToBytes import is available (typecheck sanity)", async () => {
  await test.step("Verify: hexToBytes import is available (typecheck sanity)", async () => {
    // Just ensure the import compiles; not testing behavior here.
    expect(typeof hexToBytes).toBe("function");
  });
});
