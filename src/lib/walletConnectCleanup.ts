/**
 * Utilities for clearing stale WalletConnect v2 state that can accumulate in
 * localStorage / IndexedDB and cause "stuck" wallet connection flows.
 *
 * Call clearWalletConnectState() from error recovery paths (e.g. when a
 * wallet connection times out, or when the user reports that the modal is
 * unresponsive). This saves users from having to manually clear browser data.
 */

/** Keys / prefixes that WalletConnect v2 and Reown AppKit persist. */
const WC_STORAGE_PREFIXES = [
  "wc@2:", // WalletConnect v2 core + client state (messages, sessions, pairings)
  "wagmi.", // wagmi's own persisted state
  "W3M_", // Web3Modal / Reown AppKit
  "@w3m/", // Newer AppKit namespace
];

const WC_STORAGE_EXACT_KEYS = [
  "WALLETCONNECT_DEEPLINK_CHOICE",
  "WEB3_CONNECT_CACHED_PROVIDER",
  "walletconnect",
];

/**
 * Clear all WalletConnect-related localStorage keys.
 * Returns the number of keys that were removed.
 */
export function clearWalletConnectLocalStorage(): number {
  if (typeof window === "undefined") return 0;

  let cleared = 0;

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const matchesPrefix = WC_STORAGE_PREFIXES.some((prefix) =>
        key.startsWith(prefix)
      );
      const matchesExact = WC_STORAGE_EXACT_KEYS.includes(key);

      if (matchesPrefix || matchesExact) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      try {
        localStorage.removeItem(key);
        cleared++;
      } catch {
        // Ignore — localStorage can throw in private mode or if quota-exceeded
      }
    }
  } catch {
    // localStorage may not be available at all
  }

  return cleared;
}

/**
 * Clear WalletConnect IndexedDB databases.
 * Fire-and-forget — does not wait for completion.
 */
export function clearWalletConnectIndexedDB(): void {
  if (typeof window === "undefined" || !window.indexedDB) return;

  const dbNames = ["walletconnect", "WALLET_CONNECT_V2_INDEXED_DB", "keyvaluestorage"];

  for (const name of dbNames) {
    try {
      window.indexedDB.deleteDatabase(name);
    } catch {
      // Ignore — database may not exist
    }
  }
}

/**
 * Full cleanup: localStorage + IndexedDB. Safe to call multiple times.
 * Does NOT reload the page — caller should decide whether to reload.
 */
export function clearWalletConnectState(): { keysCleared: number } {
  const keysCleared = clearWalletConnectLocalStorage();
  clearWalletConnectIndexedDB();
  return { keysCleared };
}

/**
 * Clear every cookie that wagmi / RainbowKit may have written. Required to
 * stop the SSR hydration path (cookieToInitialState) from re-seeding the
 * client with the previous wallet connection after the user clicked
 * "Disconnect".
 *
 * We can't use the cookieStorage.removeItem() API here because it's scoped
 * to the wagmi instance and doesn't actually delete the cookie in all
 * browsers. Setting an expired cookie with the same name is the reliable
 * cross-browser way to delete it.
 */
export function clearWagmiCookies(): void {
  if (typeof document === "undefined") return;

  const wagmiCookiePrefixes = ["wagmi.", "wc@2:"];
  const wagmiCookieNames = ["wagmi.store", "wagmi.recentConnectorId", "wagmi.cache"];

  const expire = (name: string) => {
    // Clear across common path/domain combinations so we don't miss any.
    const host = window.location.hostname;
    const parts = [
      `${name}=`,
      "expires=Thu, 01 Jan 1970 00:00:00 GMT",
      "path=/",
    ];
    document.cookie = parts.join("; ");
    document.cookie = `${parts.join("; ")}; domain=${host}`;
  };

  // Known exact cookie names
  for (const name of wagmiCookieNames) {
    expire(name);
  }

  // Anything else wagmi/WC wrote — scan the current cookie jar
  const cookies = document.cookie.split(";");
  for (const raw of cookies) {
    const name = raw.split("=")[0]?.trim();
    if (!name) continue;
    if (wagmiCookiePrefixes.some((prefix) => name.startsWith(prefix))) {
      expire(name);
    }
  }
}

/**
 * Complete wallet teardown — what "Disconnect" actually needs to do so the
 * user is genuinely logged out and the next connect flow starts from zero.
 *
 *  1. Clear WC localStorage + IndexedDB (pairings, sessions, message queue)
 *  2. Clear wagmi cookies (so SSR hydration doesn't re-connect on reload)
 *  3. Clear legacy auth keys (expertId, expertStatus, wallet caches)
 *
 * The wagmi `disconnect()` call still has to happen from a component that
 * has access to the wagmi hooks — this helper covers everything else.
 */
export function fullWalletTeardown(): void {
  clearWalletConnectState();
  clearWagmiCookies();

  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("expertId");
      localStorage.removeItem("expertStatus");
      localStorage.removeItem("walletAddress");
      localStorage.removeItem("candidateWallet");
      localStorage.removeItem("companyWallet");
    } catch {
      // Ignore localStorage failures (private mode, quota, etc.)
    }
  }
}
