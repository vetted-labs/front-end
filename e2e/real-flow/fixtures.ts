// e2e/real-flow/fixtures.ts
//
// Real-flow Playwright fixtures: anvil + viem contract handles + on-chain
// staked experts + per-test clean-state snapshot/revert + a candidate fixture
// that wraps the existing `signupCandidate` helper.
//
// Pre-conditions for the worker-scoped setup to succeed:
//   - Anvil running on :8545 (per ANVIL_RPC_URL).
//   - `forge script Deploy.s.sol` has run (deployments-local.json exists).
//   - MintTokens script has run so anvil accounts 1-4 hold enough VETD to
//     stake (the fixture does not run mint itself; we assume the dev
//     bootstrap has already advanced anvil time past Deploy's
//     MINT_RATE_LIMIT and minted balances). See README task.
//   - Backend running on :4000 with NODE_ENV=test E2E_FIXTURE_ENABLED=true.
//
// Snapshot semantics: Anvil's evm_snapshot id is consumed by evm_revert.
// Rather than juggle worker-scoped snapshot ids, we take a fresh snapshot
// per test in `cleanState` and revert at the end of that test. This keeps
// fixture lifetime bookkeeping local to one scope.

import {
  test as base,
  request as apiRequest,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import {
  createAnvilHandle,
  makeWallet,
  ANVIL_KEYS,
  type AnvilHandle,
  type Wallet,
} from "./helpers/chain";
import {
  readContractAddresses,
  makeContracts,
  type ContractHandles,
} from "./helpers/contracts";
import { testApi } from "./helpers/backend";
import { signupCandidate } from "../helpers/auth";

export type Expert = Wallet & { id: string; guildId: string };
export type Candidate = { email: string; password: string; page: Page };

type WorkerFixtures = {
  anvil: AnvilHandle;
  contracts: ContractHandles;
  experts: Expert[];
};

type TestFixtures = {
  cleanState: void;
  candidate: Candidate;
};

/**
 * Seeds the BE guild + 4 staked experts and returns the in-memory expert
 * handles. Extracted out of the worker fixture so the fixture body stays
 * lint-clean (avoids the react-hooks/rules-of-hooks rule mis-firing on
 * Playwright's `use` callback inside a try/catch).
 */
async function seedExperts(
  request: APIRequestContext,
  contracts: ContractHandles,
): Promise<Expert[]> {
  // Reset DB once at suite start.
  await testApi.reset(request);

  // Seed guild. BE normalizes the int -> bytes32 hex string.
  const guildRaw = await testApi.seedGuild(request, {
    name: "Engineering",
    slug: "engineering",
    onChainGuildId: 1,
  });
  const guild = guildRaw as unknown as {
    id: string;
    slug: string;
    on_chain_guild_id: `0x${string}`;
  };

  const experts: Expert[] = [];
  for (let i = 1; i <= 4; i++) {
    const w = makeWallet(ANVIL_KEYS[i]);
    const stakeAmount = 10n * 10n ** 18n;

    // On-chain: approve VETD -> stake. Pass the bytes32 guild id as the
    // hex string the BE returns; do NOT BigInt() it.
    await contracts.vettedToken.write.approve(
      [contracts.expertStaking.address, stakeAmount],
      { account: w.client.account },
    );
    await contracts.expertStaking.write.stake(
      [guild.on_chain_guild_id, stakeAmount],
      { account: w.client.account },
    );

    // BE: register expert as approved + linked to guild.
    const seeded = await testApi.seedExpert(request, {
      walletAddress: w.address,
      fullName: `E2E Expert ${i}`,
      email: `e2e-expert-${i}@vetted-test.com`,
      status: "approved",
      guildId: guild.id,
      stakeAmount: stakeAmount.toString(),
    });

    experts.push({ ...w, id: seeded.id, guildId: guild.id });
  }

  return experts;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Worker-scoped: anvil RPC handle (snapshot/revert/time/balance helpers).
  anvil: [
    async ({}, use) => {
      const a = createAnvilHandle();
      await use(a);
    },
    { scope: "worker" },
  ],

  // Worker-scoped: viem contract handles bound to the public client. Writes
  // are issued via per-wallet clients we pass through the `account` option.
  contracts: [
    async ({ anvil }, use) => {
      const addrs = readContractAddresses();
      await use(makeContracts(addrs, anvil.publicClient));
    },
    { scope: "worker" },
  ],

  // Worker-scoped: 4 staked + approved experts in the "Engineering" guild.
  // Resets the BE DB once at suite start, seeds the guild, then for each of
  // anvil accounts 1..4: approve VETD -> stake -> register expert in BE.
  //
  // NOTE: BE returns `on_chain_guild_id` as a 0x-prefixed bytes32 string
  // (`VARCHAR(66)`), not a uint. We pass the hex string straight to the
  // staking contract. The shared `testApi.seedGuild` return type currently
  // says `number`; we treat it as the hex string it actually is.
  //
  // Worker-scoped fixtures cannot consume the test-scoped `request`, so we
  // spin up our own APIRequestContext via `apiRequest.newContext()`.
  experts: [
    async ({ anvil, contracts }, use) => {
      // anvil intentionally referenced so this fixture depends on it.
      void anvil;

      const request: APIRequestContext = await apiRequest.newContext();
      const experts = await seedExperts(request, contracts);
      await request.dispose();
      await use(experts);
    },
    { scope: "worker" },
  ],

  // Test-scoped: snapshot anvil before the test, revert after. Anvil's
  // snapshot id is consumed by revert, so we take a fresh one per test
  // rather than reusing a worker-scoped id. After revert we reset the BE
  // DB and drain the BE blockchain-ops queue so DB <-> chain stay aligned.
  cleanState: [
    async ({ anvil, request }, use) => {
      const snapshotId = await anvil.snapshot();
      await use();
      // Order matters: revert chain first, then reset DB, then drain BE
      // queues so any in-flight ops referencing the now-reverted chain
      // state are dropped.
      await anvil.revert(snapshotId);
      await testApi.reset(request);
      await testApi.drain(request);
    },
    { scope: "test" },
  ],

  // Test-scoped: fresh candidate account, signed in. Wraps the existing
  // `signupCandidate` helper and re-exposes the page alongside creds.
  candidate: [
    async ({ page }, use) => {
      const creds = await signupCandidate(page);
      await use({ ...creds, page });
    },
    { scope: "test" },
  ],
});

export { expect } from "@playwright/test";
