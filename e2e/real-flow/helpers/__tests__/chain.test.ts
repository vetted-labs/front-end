// e2e/real-flow/helpers/__tests__/chain.test.ts
import { describe, it, expect } from "vitest";
import { createAnvilHandle, makeWallet, ANVIL_KEYS } from "../chain";

describe("chain helper", () => {
  it("snapshot returns a hex id and revert succeeds", async () => {
    const anvil = createAnvilHandle();
    const id = await anvil.snapshot();
    expect(id).toMatch(/^0x[0-9a-fA-F]+$/);
    await anvil.revert(id);
  });

  it("makeWallet derives correct address for account 1", () => {
    const w = makeWallet(ANVIL_KEYS[1]);
    expect(w.address.toLowerCase()).toBe(
      "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    );
  });
});
