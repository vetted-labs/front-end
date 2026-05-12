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
import fs from "node:fs";
import path from "node:path";
import type { Address } from "viem";
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
import { attachWallet, type InjectedWalletHandle } from "./helpers/wallet-injection";

const BACKEND_ENV_PATH = path.resolve(__dirname, "../../../backend/.env");
const JOB_CREATOR_ETH_BALANCE = 100n * 10n ** 18n;
const JOB_CREATOR_TOKEN_FLOAT = 100n * 10n ** 18n;

export type Expert = Wallet & { id: string; guildId: string };
export type Candidate = {
  email: string;
  password: string;
  token: string;
  candidateId: string;
  page: Page;
};
export type Guild = {
  id: string;
  name: string;
  on_chain_guild_id: `0x${string}`;
};

export type RealFlowFixtures = WorkerFixtures & TestFixtures;

type WorkerFixtures = {
  anvil: AnvilHandle;
  contracts: ContractHandles;
  guild: Guild;
  experts: Expert[];
};

type TestFixtures = {
  cleanState: void;
  candidate: Candidate;
  wallet: {
    /** Attach the headless wallet to `page` with the given key. Call once per test. */
    attach: (page: Page, privateKey: `0x${string}`) => Promise<InjectedWalletHandle>;
  };
};

function parseBackendEnv(): Record<string, string> {
  if (!fs.existsSync(BACKEND_ENV_PATH)) return {};

  return fs
    .readFileSync(BACKEND_ENV_PATH, "utf-8")
    .split(/\r?\n/)
    .reduce<Record<string, string>>((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return acc;

      const separator = trimmed.indexOf("=");
      if (separator === -1) return acc;

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      acc[key] = rawValue.replace(/^['"]|['"]$/g, "");
      return acc;
    }, {});
}

function isAddress(value: string | undefined): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value ?? "");
}

function resolveJobCreatorAddress(): Address {
  const env = parseBackendEnv();

  if (isAddress(env.JOB_CREATOR_WALLET_ADDRESS)) {
    return env.JOB_CREATOR_WALLET_ADDRESS;
  }

  const privateKey = env.JOB_CREATOR_WALLET_PRIVATE_KEY;
  if (privateKey?.startsWith("0x") && privateKey.length === 66) {
    return makeWallet(privateKey as `0x${string}`).address;
  }

  return makeWallet(ANVIL_KEYS[5]).address;
}

/**
 * Seeds the BE guild and returns its handle. Reset of the BE DB happens here
 * so it runs exactly once before any expert seeding.
 */
async function seedGuild(request: APIRequestContext): Promise<Guild> {
  // Reset DB once at suite start.
  await testApi.reset(request);

  // Seed guild. BE normalizes the int -> bytes32 hex string.
  const guildRaw = await testApi.seedGuild(request, {
    name: "Engineering",
    slug: "engineering",
    onChainGuildId: 1,
  });
  return guildRaw as unknown as Guild;
}

/**
 * Seeds 4 staked + approved experts into `guild` and returns the in-memory
 * expert handles. Extracted out of the worker fixture so the fixture body
 * stays lint-clean (avoids the react-hooks/rules-of-hooks rule mis-firing on
 * Playwright's `use` callback inside a try/catch).
 */
async function seedExperts(
  request: APIRequestContext,
  contracts: ContractHandles,
  guild: Guild,
): Promise<Expert[]> {
  const experts: Expert[] = [];
  // GuildRegistry.{createGuild,addMember} are onlyOwner — sign with anvil account 0 (deployer/owner).
  const owner = makeWallet(ANVIL_KEYS[0]);

  // Ensure on-chain guild exists. Idempotent: catch GuildAlreadyExists if a
  // prior run (or SetupTestingGuild.s.sol) already created it.
  try {
    await contracts.guildRegistry.write.createGuild(
      [guild.on_chain_guild_id, guild.name, 10n * 10n ** 18n, 0n],
      { account: owner.client.account },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/GuildAlreadyExists/.test(msg)) throw err;
  }

  for (let i = 1; i <= 4; i++) {
    const w = makeWallet(ANVIL_KEYS[i]);
    const stakeAmount = 10n * 10n ** 18n;

    // ExpertStaking.stake reverts NotGuildMember unless GuildRegistry.addMember
    // ran first. Owner-only on-chain step before approve/stake.
    // Idempotent: tolerate AlreadyMember from prior runs against the same anvil.
    try {
      await contracts.guildRegistry.write.addMember(
        [guild.on_chain_guild_id, w.address],
        { account: owner.client.account },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/AlreadyMember/.test(msg)) throw err;
    }
    // On-chain: approve VETD -> stake. Pass the bytes32 guild id as the
    // hex string the BE returns; do NOT BigInt() it.
    await contracts.vettedToken.write.approve(
      [contracts.expertStaking.address, stakeAmount],
      { account: w.client.account },
    );
    // Idempotent stake: skip when already staked >= target amount.
    try {
      await contracts.expertStaking.write.stake(
        [guild.on_chain_guild_id, stakeAmount],
        { account: w.client.account },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/AlreadyStaked|ExceedsMaxStake/i.test(msg)) throw err;
    }

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

  // Worker-scoped: the "Engineering" guild seeded into the BE. Resets the BE
  // DB once at suite start, then seeds the guild and exposes its handle.
  //
  // NOTE: BE returns `on_chain_guild_id` as a 0x-prefixed bytes32 string
  // (`VARCHAR(66)`), not a uint. We pass the hex string straight to the
  // staking contract. The shared `testApi.seedGuild` return type currently
  // says `number`; we treat it as the hex string it actually is.
  //
  // Worker-scoped fixtures cannot consume the test-scoped `request`, so we
  // spin up our own APIRequestContext via `apiRequest.newContext()`.
  guild: [
    async ({}, use) => {
      const request: APIRequestContext = await apiRequest.newContext();
      const guild = await seedGuild(request);
      await request.dispose();
      await use(guild);
    },
    { scope: "worker" },
  ],

  // Worker-scoped: 4 staked + approved experts in the `guild` fixture's
  // guild. For each of anvil accounts 1..4: approve VETD -> stake ->
  // register expert in BE.
  experts: [
    async ({ anvil, contracts, guild }, use) => {
      // anvil intentionally referenced so this fixture depends on it.
      void anvil;

      const request: APIRequestContext = await apiRequest.newContext();
      const experts = await seedExperts(request, contracts, guild);
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
    async ({ anvil, contracts, request }, use) => {
      const snapshotId = await anvil.snapshot();
      const jobCreatorAddress = resolveJobCreatorAddress();
      const tokenTreasury = makeWallet(ANVIL_KEYS[1]);
      const balanceResult = await contracts.vettedToken.read.balanceOf([jobCreatorAddress]);
      if (typeof balanceResult !== "bigint") {
        throw new Error("Expected VETD balanceOf to return a bigint");
      }

      await anvil.setBalance(jobCreatorAddress, JOB_CREATOR_ETH_BALANCE);
      if (balanceResult < JOB_CREATOR_TOKEN_FLOAT) {
        await contracts.vettedToken.write.transfer(
          [jobCreatorAddress, JOB_CREATOR_TOKEN_FLOAT - balanceResult],
          { account: tokenTreasury.client.account },
        );
      }
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
  // Depends on `experts` so the worker-scoped DB reset (inside `guild`/
  // `experts` setup) finishes BEFORE we sign up — otherwise the truncate
  // wipes the freshly created candidate row.
  candidate: [
    async ({ page, experts: _experts }, use) => {
      void _experts;
      const creds = await signupCandidate(page);
      await use({ ...creds, page });
    },
    { scope: "test" },
  ],

   
  wallet: async ({}, use) => {
    let handle: InjectedWalletHandle | null = null;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use({
      attach: async (page, privateKey) => {
        if (handle) throw new Error("wallet.attach called twice in one test");
        handle = await attachWallet(page, privateKey, {
          rpcUrl: process.env.ANVIL_RPC_URL,
        });
        return handle;
      },
    });
    // No teardown — page closes at end of test, taking exposeFunction with it.
  },
});

export { expect } from "@playwright/test";
