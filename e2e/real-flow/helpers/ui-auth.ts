// e2e/real-flow/helpers/ui-auth.ts
//
// Wallet-auth helpers for Playwright real-flow.
//
// IMPORTANT: These helpers bypass RainbowKit's modal and drive wagmi
// directly through `window.__wagmiTest` (exposed by `src/components/Providers.tsx`
// only when NEXT_PUBLIC_E2E_MODE=true). Rationale: RainbowKit's EIP-6963
// detection has timing quirks against a Playwright-injected provider — the
// shim ends up on `window.ethereum` correctly but doesn't always appear in
// the modal's "Installed" section. The shim itself is functionally complete
// at the EIP-1193 layer; using wagmi's `connect()` action directly lets us
// exercise the real wagmi connection pipeline (the same one a click would
// drive) without fighting modal-rendering timing. The MetaMask popup UX is
// out of scope per project intent.

import { expect, type Page } from "@playwright/test";
import type { Hex } from "viem";
import type { InjectedWalletHandle } from "./wallet-injection";
import { markOnboardingComplete } from "../../helpers/auth-utils";

/**
 * Connect the page-side wagmi store to the injected wallet (our shim).
 *
 * Uses `window.__wagmiTest.connect(config, { connector: injected })` which
 * is the same call path RainbowKit takes when a user clicks a wallet in the
 * modal — it just skips the modal-rendering step. Idempotent: returns
 * immediately if a wallet is already connected.
 *
 * Throws a clear error if `window.__wagmiTest` is missing — that means the
 * app wasn't built with NEXT_PUBLIC_E2E_MODE=true.
 */
export async function connectWalletViaUI(page: Page): Promise<void> {
  // Wait for wagmi to be ready on the page (Providers must have mounted).
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __wagmiTest?: unknown }).__wagmiTest !==
      "undefined",
    null,
    { timeout: 10_000 },
  );

  const result = (await page.evaluate(async () => {
    const harness = (
      window as unknown as {
        __wagmiTest?: {
          config: { connectors: { id: string; uid?: string }[] };
          connect: (
            config: unknown,
            args: { connector: unknown },
          ) => Promise<{ accounts: readonly string[]; chainId: number }>;
          getAccount: (config: unknown) => {
            isConnected: boolean;
            address?: string;
          };
        };
      }
    ).__wagmiTest;
    if (!harness) return { ok: false, error: "wagmi test harness missing" };

    // Already connected? Bail.
    const current = harness.getAccount(harness.config);
    if (current.isConnected && current.address) {
      return { ok: true, address: current.address, alreadyConnected: true };
    }

    // Find the headless E2E connector registered in `wagmi-config.ts` under
    // a custom RainbowKit wallet. It wraps wagmi's `injected()` connector
    // which reads from `window.ethereum` (= our shim). Fall back to plain
    // `injected` or `metaMask` ids in case the project later switches to a
    // different wallet registration pattern.
    const injected =
      harness.config.connectors.find((c) => c.id === "headless-e2e") ??
      harness.config.connectors.find((c) => c.id === "injected") ??
      harness.config.connectors.find((c) => c.id === "metaMask");
    if (!injected) {
      return {
        ok: false,
        error: `no headless/injected connector; available: ${harness.config.connectors.map((c) => c.id).join(",")}`,
      };
    }

    try {
      const res = await harness.connect(harness.config, {
        connector: injected,
      });
      return { ok: true, address: res.accounts[0], chainId: res.chainId };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  })) as { ok: boolean; address?: string; error?: string };

  if (!result.ok) {
    throw new Error(`connectWalletViaUI: ${result.error ?? "unknown failure"}`);
  }
}

/**
 * Switch to a different account on the headless wallet and re-connect wagmi
 * so the page-side store + AuthContext see the new address.
 *
 * The shim's `setAccount` fires `accountsChanged`, but wagmi's injected
 * connector treats that as either a no-op (same connection) or a hard
 * disconnect (if it considers the new address foreign). For determinism we
 * disconnect and re-connect — this guarantees both wagmi and any downstream
 * AuthContext re-render with the new identity.
 */
export async function switchAccountUI(
  page: Page,
  handle: InjectedWalletHandle,
  privateKey: Hex,
): Promise<void> {
  await handle.switchAccount(privateKey);

  await page.evaluate(async () => {
    const harness = (
      window as unknown as {
        __wagmiTest?: {
          config: unknown;
          connect: (
            config: unknown,
            args: { connector: unknown },
          ) => Promise<unknown>;
          disconnect: (config: unknown) => Promise<void>;
          getAccount: (config: unknown) => { isConnected: boolean };
        };
      }
    ).__wagmiTest;
    if (!harness) return;
    const cfg = harness.config as {
      connectors: { id: string }[];
    };
    if (harness.getAccount(harness.config).isConnected) {
      await harness.disconnect(harness.config);
    }
    const injected =
      cfg.connectors.find((c) => c.id === "headless-e2e") ??
      cfg.connectors.find((c) => c.id === "injected") ??
      cfg.connectors.find((c) => c.id === "metaMask");
    if (injected)
      await harness.connect(harness.config, { connector: injected });
  });
}

// markOnboardingComplete is now the shared helper from e2e/helpers/auth-utils.ts.
// Re-exported via import above; no local definition needed.

/**
 * Drive the expert SIWE login flow through the real UI:
 *   1. Pre-mark onboarding complete (suppresses story-lab force-redirect)
 *   2. Navigate to /auth/login?type=expert
 *   3. Click the in-app "Connect Wallet" button to open RainbowKit's modal
 *   4. Click "Headless E2E Wallet" — wagmi connects via the injected
 *      connector through our shim, fires useAccountEffect.onConnect, which
 *      triggers handleExpertLogin → expertApi.getProfile → router.push
 *   5. Wait for the redirect to /expert/dashboard
 *
 * NOTE: We deliberately use the modal click flow (not the programmatic
 * `connect()` action) here because LoginPage's `useAccountEffect.onConnect`
 * only fires on the React-driven status transition, which a click triggers
 * cleanly. Programmatic `connect()` updates the wagmi store but the React
 * effect hook can miss the edge.
 */
export async function loginAsExpertViaUI(
  page: Page,
  expertAddress: string,
  opts: { timeoutMs?: number } = {},
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  await markOnboardingComplete(page, expertAddress);
  await page.goto("/auth/login?type=expert");
  await page
    .getByRole("button", { name: /connect wallet/i })
    .first()
    .click();
  await page
    .getByRole("button", { name: /headless e2e wallet/i })
    .first()
    .click();
  await page.waitForURL(/\/expert\/dashboard/, { timeout: timeoutMs });
}

/**
 * Disconnect the wagmi-side wallet. Safe to call regardless of state.
 */
export async function disconnectWalletUI(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const harness = (
      window as unknown as {
        __wagmiTest?: {
          config: unknown;
          disconnect: (c: unknown) => Promise<void>;
        };
      }
    ).__wagmiTest;
    if (!harness) return;
    await harness.disconnect(harness.config).catch(() => undefined);
  });
}

/**
 * Sign an arbitrary message through wagmi (exercises `useSignMessage` path).
 * Returns the signature.
 */
export async function signMessageViaWagmi(
  page: Page,
  message: string,
): Promise<`0x${string}`> {
  const sig = (await page.evaluate(async (msg) => {
    const harness = (
      window as unknown as {
        __wagmiTest?: {
          config: unknown;
          signMessage: (
            config: unknown,
            args: { message: string },
          ) => Promise<`0x${string}`>;
        };
      }
    ).__wagmiTest;
    if (!harness) throw new Error("wagmi test harness missing");
    return await harness.signMessage(harness.config, { message: msg });
  }, message)) as `0x${string}`;
  return sig;
}

/**
 * Read the wagmi-side connected address (page-context useAccount equivalent).
 * Returns `null` when nothing is connected.
 */
export async function readWagmiAddress(page: Page): Promise<string | null> {
  return (await page.evaluate(() => {
    const harness = (
      window as unknown as {
        __wagmiTest?: {
          config: unknown;
          getAccount: (config: unknown) => {
            isConnected: boolean;
            address?: string;
          };
        };
      }
    ).__wagmiTest;
    if (!harness) return null;
    const acc = harness.getAccount(harness.config);
    return acc.isConnected && acc.address ? acc.address : null;
  })) as string | null;
}

/**
 * Convenience: wait until wagmi reports the expected address. Useful right
 * after `switchAccountUI` to gate subsequent assertions.
 */
export async function expectWagmiAddress(
  page: Page,
  expected: string,
  timeoutMs = 10_000,
): Promise<void> {
  await expect
    .poll(async () => (await readWagmiAddress(page))?.toLowerCase() ?? null, {
      timeout: timeoutMs,
    })
    .toBe(expected.toLowerCase());
}
