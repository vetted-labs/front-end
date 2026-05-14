// e2e/real-flow/__tests__/fixtures-smoke.spec.ts
//
// Smoke check that the real-flow fixtures wire up cleanly:
//   - anvil RPC handle is built against the configured RPC URL
//   - viem contract handles are constructed from deployments-local.json
//   - the worker-scoped `experts` fixture reflects 3 guilds × 10 experts = 30 total
//
// Pre-conditions (see fixtures.ts header for full list): anvil is up,
// bootstrap has run (`npm run e2e:bootstrap`), backend is up with
// E2E_FIXTURE_ENABLED=true.

import { test, expect } from "../fixtures";

test("fixtures wire up cleanly", async ({ experts, guilds, contracts, anvil }) => {
  await test.step("contract handles are defined", async () => {
    expect(contracts.vettedToken).toBeDefined();
    expect(contracts.expertStaking).toBeDefined();
    expect(contracts.vettingManager).toBeDefined();
  });

  await test.step("anvil RPC URL contains port 8545", async () => {
    expect(anvil.rpc).toContain("8545");
  });

  await test.step("manifest-driven fixtures reflect 3 guilds and 30 experts", async () => {
    expect(guilds).toHaveLength(3);
    expect(experts).toHaveLength(30);
  });
});
