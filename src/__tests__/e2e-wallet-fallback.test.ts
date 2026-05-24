import { describe, expect, it } from "vitest";
import { readStoredE2EWalletAddress } from "@/lib/e2e-wallet-fallback";

describe("readStoredE2EWalletAddress", () => {
  it("returns the stored wallet address in the browser", () => {
    window.localStorage.setItem(
      "walletAddress",
      "0x2222222222222222222222222222222222222222",
    );

    expect(readStoredE2EWalletAddress()).toBe(
      "0x2222222222222222222222222222222222222222",
    );
  });

  it("ignores empty stored wallet values", () => {
    window.localStorage.setItem("walletAddress", "");

    expect(readStoredE2EWalletAddress()).toBeUndefined();
  });
});
