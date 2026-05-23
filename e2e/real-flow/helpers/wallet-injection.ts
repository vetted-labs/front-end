// e2e/real-flow/helpers/wallet-injection.ts
//
// Wires a Node-side HeadlessWallet to a Playwright Page. The page-side stub
// is a pure-JS provider that proxies every EIP-1193 `request()` call to the
// Node side via `page.exposeFunction`. Events emitted on the Node side
// (e.g. accountsChanged on setAccount) are forwarded to the page via
// `page.evaluate`.
//
// EIP-6963: wagmi v2's injected connector listens for `eip6963:announceProvider`
// events in addition to reading `window.ethereum`. We dispatch the announce
// once on init so RainbowKit's modal lists us as "MetaMask".

import type { Page } from "@playwright/test";
import type { Hex } from "viem";
import { HeadlessWallet } from "./headless-wallet";

const STUB_SOURCE = `
(() => {
  if (window.__hwProvider) return;

  const listeners = Object.create(null);

  const provider = {
    isMetaMask: true,
    _metamask: { isUnlocked: () => Promise.resolve(true) },

    async request(args) {
      // window.__hwRequest is exposed by Playwright. The bridge serializes
      // {method, params} over CDP to the Node-side HeadlessWallet.
      return window.__hwRequest(args);
    },

    on(event, cb) {
      (listeners[event] = listeners[event] || new Set()).add(cb);
    },

    removeListener(event, cb) {
      listeners[event] && listeners[event].delete(cb);
    },

    // Called from Node via page.evaluate to deliver wallet events to wagmi.
    _emit(event, ...args) {
      if (!listeners[event]) return;
      for (const cb of listeners[event]) {
        try { cb(...args); } catch (err) { console.error('[hw stub] listener error', err); }
      }
    },
  };

  window.ethereum = provider;
  window.__hwProvider = provider;

  // EIP-6963 announce (wagmi 2.x discovery)
  const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: Object.freeze({
      info: {
        uuid: '00000000-0000-0000-0000-000000000001',
        name: 'MetaMask',
        icon: 'data:image/svg+xml,%3Csvg/%3E',
        rdns: 'io.metamask',
      },
      provider,
    }),
  }));

  window.addEventListener('eip6963:requestProvider', announce);
  announce();

  // Sepolia chain id (anvil is run with --chain-id 11155111 so the whole
  // stack — BE provider, FE wagmi sepolia config, shim — aligns).
  provider._emit('connect', { chainId: '0xaa36a7' });
})();
`;

export interface InjectedWalletHandle {
  wallet: HeadlessWallet;
  /** Updates the active account and propagates accountsChanged to the page. */
  switchAccount(privateKey: Hex): Promise<void>;
  /** Force a full reload — fallback if accountsChanged doesn't re-fire wagmi reconnect. */
  hardReload(): Promise<void>;
}

/**
 * Attach a headless wallet to a Playwright page. Call once per page (idempotent
 * within a single test); the init script re-runs on every navigation so the
 * stub survives `page.goto` calls.
 */
export async function attachWallet(
  page: Page,
  privateKey: Hex,
  opts: { rpcUrl?: string; debug?: boolean } = {},
): Promise<InjectedWalletHandle> {
  const wallet = new HeadlessWallet({ privateKey, ...opts });

  // Expose Node→page bridge. exposeFunction is idempotent per page+name, but
  // re-attaching to the same page would throw. Callers should attach once.
  await page.exposeFunction(
    "__hwRequest",
    (req: { method: string; params?: unknown[] }) => wallet.request(req),
  );

  // Forward wallet events to the page-side stub.
  wallet.on("accountsChanged", async (accounts: string[]) => {
    await page
      .evaluate(
        ([addrs]) => window.__hwProvider?._emit("accountsChanged", addrs),
        [accounts] as const,
      )
      .catch(() => {
        /* page may be closed during teardown; swallow */
      });
  });

  // Mount the stub on every page load (covers initial nav + subsequent goto).
  await page.addInitScript({ content: STUB_SOURCE });

  return {
    wallet,
    async switchAccount(pk: Hex) {
      wallet.setAccount(pk);
      // Belt-and-suspenders: also re-emit accountsChanged after a microtask,
      // since wagmi's injected connector occasionally swallows the first
      // event when fired before its listener is attached.
      await new Promise((r) => setTimeout(r, 50));
      await page.evaluate(
        ([addr]) => window.__hwProvider?._emit("accountsChanged", [addr]),
        [wallet.address] as const,
      );
    },
    async hardReload() {
      await page.reload({ waitUntil: "domcontentloaded" });
    },
  };
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
    __hwProvider?: {
      _emit: (event: string, ...args: unknown[]) => void;
    };
    __hwRequest: (req: {
      method: string;
      params?: unknown[];
    }) => Promise<unknown>;
  }
}
