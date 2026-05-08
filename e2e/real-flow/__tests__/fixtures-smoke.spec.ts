// e2e/real-flow/__tests__/fixtures-smoke.spec.ts
//
// Smoke check that the real-flow fixtures wire up cleanly:
//   - anvil RPC handle is built against the configured RPC URL
//   - viem contract handles are constructed from deployments-local.json
//   - the worker-scoped `experts` fixture seeded 4 staked experts
//
// Pre-conditions (see fixtures.ts header for full list): anvil is up,
// Deploy + MintTokens have run, backend is up with E2E_FIXTURE_ENABLED=true.

import { test, expect } from "../fixtures";

test("fixtures wire up cleanly", async ({ experts, contracts, anvil }) => {
  expect(experts).toHaveLength(4);
  expect(contracts.vettedToken).toBeDefined();
  expect(contracts.expertStaking).toBeDefined();
  expect(contracts.vettingManager).toBeDefined();
  expect(anvil.rpc).toContain("8545");
});
