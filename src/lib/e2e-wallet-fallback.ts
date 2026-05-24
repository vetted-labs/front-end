export function readStoredE2EWalletAddress(): `0x${string}` | undefined {
  if (typeof window === "undefined") return undefined;
  const stored = window.localStorage.getItem("walletAddress");
  return stored ? (stored as `0x${string}`) : undefined;
}
