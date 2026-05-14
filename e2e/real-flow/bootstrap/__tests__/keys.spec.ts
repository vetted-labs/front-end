import { test, expect } from "@playwright/test";
import { deriveExpertKeys } from "../keys";

test("deriveExpertKeys is deterministic and collision-free", () => {
  const a = deriveExpertKeys(30);
  const b = deriveExpertKeys(30);
  expect(a).toEqual(b); // deterministic across calls
  expect(a).toHaveLength(30);
  const addresses = new Set(a.map((k) => k.address.toLowerCase()));
  expect(addresses.size).toBe(30); // no collisions
  // Must not collide with anvil account 0 (the deployer).
  expect(addresses.has("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")).toBe(false);
  // Every key is a valid 0x-prefixed 32-byte hex string.
  for (const k of a) {
    expect(k.privateKey).toMatch(/^0x[0-9a-f]{64}$/i);
    expect(k.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  }
});
