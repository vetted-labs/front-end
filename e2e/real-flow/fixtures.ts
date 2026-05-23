// e2e/real-flow/fixtures.ts
//
// Real-flow Playwright fixtures: anvil + viem contract handles + manifest-driven
// staked experts + per-test clean-state snapshot/revert + a candidate fixture
// that wraps the existing `signupCandidate` helper.
//
// Pre-conditions for the worker-scoped setup to succeed:
//   - The deterministic bootstrap has run:
//       npm run e2e:bootstrap
//     This seeds 3 guilds × 10 staked experts on-chain and in the BE, then
//     writes e2e/real-flow/bootstrap/manifest.json. The worker fixtures read
//     that manifest — they do NOT mutate the chain or database themselves.
//   - Anvil running on :8545 (per ANVIL_RPC_URL), still at the chain state the
//     bootstrap produced.
//   - Backend running on :4000 with NODE_ENV=test E2E_FIXTURE_ENABLED=true.
//
// Snapshot semantics: Anvil's evm_snapshot id is consumed by evm_revert.
// Rather than juggle worker-scoped snapshot ids, we take a fresh snapshot
// per test in `cleanState` and revert at the end of that test. This keeps
// fixture lifetime bookkeeping local to one scope.
//
// Because worker fixtures no longer mutate the chain, `cleanState` per-test
// snapshots reliably describe the same post-bootstrap baseline regardless of
// how many tests ran in the same worker session. See DETERMINISM_FINDING.md.

import {
  test as base,
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
import {
  attachWallet,
  type InjectedWalletHandle,
} from "./helpers/wallet-injection";
import {
  readManifest,
  type BootstrapManifest,
} from "./bootstrap/manifest";

const BACKEND_ENV_PATH = path.resolve(__dirname, "../../../backend/.env");
const JOB_CREATOR_ETH_BALANCE = 100n * 10n ** 18n;
const JOB_CREATOR_TOKEN_FLOAT = 100n * 10n ** 18n;
// The backend service wallet drives the on-chain review pipeline (createSession,
// batchRevealVotes, finalizeSession) via its blockchain-ops outbox. It is NOT an
// anvil default account, so it starts with zero ETH — fund it for gas each test.
const BACKEND_WALLET_ETH_BALANCE = 100n * 10n ** 18n;

export type Expert = Wallet & { id: string; guildId: string; email: string };
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
  manifest: BootstrapManifest;
  guilds: Guild[];
  experts: Expert[];
  expertsForGuild: (guildId: string) => Expert[];
  panelFor: (guildId: string, size: number) => Expert[];
  /** Backwards-compat alias for guilds[0]. */
  guild: Guild;
};

type TestFixtures = {
  cleanState: void;
  candidate: Candidate;
  /** Pre-funded job creator wallet (reads JOB_CREATOR_WALLET_PRIVATE_KEY from
   *  backend/.env, falling back to ANVIL_KEYS[5]). The `cleanState` fixture
   *  tops up its VETD balance before each test, so this wallet can always pay
   *  the EndorsementBidding.createJob anti-spam fee. */
  jobCreator: Wallet;
  /** Seeded test company. Use in scenarios that call `recordHireOutcome`
   *  (POST /api/endorsements/hire-outcome) or `seedJob`. Replaces the
   *  deprecated `process.env.E2E_COMPANY_TOKEN` pattern. */
  company: { id: string; token: string };
  /** Convenience alias: `company.token`. Use when you only need the JWT. */
  companyToken: string;
  wallet: {
    /** Attach the headless wallet to `page` with the given key. Call once per test. */
    attach: (
      page: Page,
      privateKey: `0x${string}`,
    ) => Promise<InjectedWalletHandle>;
    /**
     * Cause the next request matching `method` (or any request when `method`
     * is omitted) to fail with EIP-1193 error code 4001 ("User rejected").
     *
     * Must be called AFTER `wallet.attach()` — forwards to the underlying
     * HeadlessWallet for the most-recently-attached page. For multi-actor
     * tests, call it on the specific `InjectedWalletHandle.wallet` directly.
     */
    rejectNextRequest: (method?: string) => void;
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

function resolveJobCreatorWallet(): Wallet {
  const env = parseBackendEnv();
  const privateKey = env.JOB_CREATOR_WALLET_PRIVATE_KEY;
  if (privateKey?.startsWith("0x") && privateKey.length === 66) {
    return makeWallet(privateKey as `0x${string}`);
  }
  return makeWallet(ANVIL_KEYS[5]);
}

function resolveBackendWalletAddress(): Address {
  const env = parseBackendEnv();

  if (isAddress(env.BACKEND_WALLET_ADDRESS)) {
    return env.BACKEND_WALLET_ADDRESS;
  }

  const privateKey = env.BACKEND_WALLET_PRIVATE_KEY;
  if (privateKey?.startsWith("0x") && privateKey.length === 66) {
    return makeWallet(privateKey as `0x${string}`).address;
  }

  return makeWallet(ANVIL_KEYS[0]).address;
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

  // Worker-scoped: the bootstrap manifest produced by `npm run e2e:bootstrap`.
  // readManifest() throws with a clear message if the bootstrap hasn't run yet.
  manifest: [
    async ({}, use) => {
      await use(readManifest());
    },
    { scope: "worker" },
  ],

  // Worker-scoped: 3 guilds from the manifest, mapped to the Guild shape.
  guilds: [
    async ({ manifest }, use) => {
      const guilds: Guild[] = manifest.guilds.map((g) => ({
        id: g.id,
        name: g.name,
        on_chain_guild_id: g.onChainGuildId,
      }));
      await use(guilds);
    },
    { scope: "worker" },
  ],

  // Worker-scoped: 30 staked experts (10 per guild) from the manifest.
  // Each entry is a full Wallet (privateKey, address, viem WalletClient) plus
  // the backend id, guild, and a deterministic email address derived from the
  // email template env var (DIV-002 fix).
  //
  // Email derivation: E2E_EXPERT_EMAIL_TEMPLATE defaults to
  //   e2e-expert-{guildId}-{i}@e2e.local
  // where {guildId} is the backend guild UUID and {i} is the 0-based index of
  // this expert within that guild's expert list (sorted by manifest order).
  // The template is resolved per-expert before the fixture is provided to tests
  // so callers can look up experts by email without any extra mapping.
  experts: [
    async ({ manifest }, use) => {
      const emailTemplate =
        process.env.E2E_EXPERT_EMAIL_TEMPLATE ??
        "e2e-expert-{guildId}-{i}@e2e.local";

      // Build a per-guild counter so {i} is stable and 0-based within each guild.
      const guildIndexCounter = new Map<string, number>();

      const experts: Expert[] = manifest.experts.map((e) => {
        const guildIndex = guildIndexCounter.get(e.guildId) ?? 0;
        guildIndexCounter.set(e.guildId, guildIndex + 1);

        const email = emailTemplate
          .replace("{guildId}", e.guildId)
          .replace("{i}", String(guildIndex));

        return {
          ...makeWallet(e.privateKey),
          id: e.id,
          guildId: e.guildId,
          email,
        };
      });
      await use(experts);
    },
    { scope: "worker" },
  ],

  // Worker-scoped: filter helper — returns the 10 experts for a given guild id.
  expertsForGuild: [
    async ({ experts }, use) => {
      await use((guildId: string) =>
        experts.filter((e) => e.guildId === guildId),
      );
    },
    { scope: "worker" },
  ],

  // Worker-scoped: returns a panel of `size` experts for a given guild.
  // Whitepaper §2 mandates panels of 5-7 experts.
  panelFor: [
    async ({ expertsForGuild }, use) => {
      await use((guildId: string, size: number) => {
        if (size < 5 || size > 7) {
          throw new Error(
            `panelFor: size must be 5-7 (whitepaper §2), got ${size}`,
          );
        }
        const pool = expertsForGuild(guildId);
        if (pool.length < size) {
          throw new Error(
            `panelFor: guild ${guildId} has only ${pool.length} experts, need ${size}`,
          );
        }
        return pool.slice(0, size);
      });
    },
    { scope: "worker" },
  ],

  // Worker-scoped: backwards-compat alias for guilds[0]. Existing scenarios
  // that use the singular `guild` fixture don't need to change.
  guild: [
    async ({ guilds }, use) => {
      if (guilds.length === 0) throw new Error("guild fixture: manifest has no guilds — run `npm run e2e:bootstrap`");
      await use(guilds[0]);
    },
    { scope: "worker" },
  ],

  // Test-scoped: snapshot anvil before the test, revert after. Anvil's
  // snapshot id is consumed by revert, so we take a fresh one per test
  // rather than reusing a worker-scoped id. After revert we reset the BE
  // DB and drain the BE blockchain-ops queue so DB <-> chain stay aligned.
  //
  // NOTE: The snapshot is taken after the worker-scoped fixtures have
  // completed (Playwright guarantees this ordering). Because worker fixtures
  // only READ the manifest and do not mutate the chain, the snapshot reliably
  // captures the clean post-bootstrap baseline every time. See DETERMINISM_FINDING.md.
  cleanState: [
    async ({ anvil, contracts, request, manifest }, use) => {
      const snapshotId = await anvil.snapshot();
      const jobCreatorAddress = resolveJobCreatorAddress();
      const backendWalletAddress = resolveBackendWalletAddress();
      const tokenTreasury = makeWallet(ANVIL_KEYS[1]);
      const balanceResult = await contracts.vettedToken.read.balanceOf([
        jobCreatorAddress,
      ]);
      if (typeof balanceResult !== "bigint") {
        throw new Error("Expected VETD balanceOf to return a bigint");
      }

      await anvil.setBalance(jobCreatorAddress, JOB_CREATOR_ETH_BALANCE);
      // The backend service wallet pays gas for every on-chain review-pipeline
      // op (createSession / batchRevealVotes / finalizeSession). It is not an
      // anvil default account, so without this it has zero ETH and every
      // blockchain-ops outbox tx reverts.
      await anvil.setBalance(
        backendWalletAddress,
        BACKEND_WALLET_ETH_BALANCE,
      );
      if (balanceResult < JOB_CREATOR_TOKEN_FLOAT) {
        await contracts.vettedToken.write.transfer(
          [jobCreatorAddress, JOB_CREATOR_TOKEN_FLOAT - balanceResult],
          { account: tokenTreasury.client.account },
        );
      }

      // Keep blocks ticking for the duration of the test. Anvil is started
      // without `--block-time`, so it only mines on-demand (one block per tx).
      // The commit-reveal UI (CommitmentForm) waits for 12 confirmations after
      // an on-chain commitVote — with on-demand mining no further blocks are
      // produced and that wait hangs forever. A lightweight background miner
      // advances the chain so finality gates clear. Automine stays on, so
      // direct viem writes still get their own block immediately; these extra
      // anvil_mine calls just move the head forward.
      //
      // The ticker is *serial* (re-armed only after the previous mine
      // resolves) so RPC calls never pile up under load, and runs fast enough
      // that a 12-confirmation wait clears in a couple of seconds.
      let tickerActive = true;
      const tick = async (): Promise<void> => {
        while (tickerActive) {
          await anvil.mine(1).catch(() => {
            /* anvil may be mid-revert between tests — ignore */
          });
          await new Promise((r) => setTimeout(r, 200));
        }
      };
      const tickerDone = tick();

      try {
        // eslint-disable-next-line react-hooks/rules-of-hooks -- `use` is Playwright's fixture lifecycle callback, not React's `use` hook
        await use();
      } finally {
        tickerActive = false;
        await tickerDone;
      }
      // Order matters: revert chain first, then reset DB, then drain BE
      // queues so any in-flight ops referencing the now-reverted chain
      // state are dropped.
      await anvil.revert(snapshotId);
      await testApi.reset(request);
      // experts/guild_memberships are KEPT across reset, so scenario-seeded
      // experts accumulate and bloat the random reviewer-selection pool. Prune
      // back to the bootstrap manifest so panel assignment stays deterministic.
      await testApi
        .pruneExperts(
          request,
          manifest.experts.map((e) => ({ wallet: e.address, guildId: e.guildId })),
        )
        .catch(() => {
          /* prune is best-effort cleanup; never fail teardown on it */
        });
      await testApi.drain(request);
    },
    { scope: "test" },
  ],

  // Test-scoped: fresh candidate account, signed in. Wraps the existing
  // `signupCandidate` helper and re-exposes the page alongside creds.
  // Depends on `experts` so the worker-scoped manifest load finishes BEFORE
  // we sign up — otherwise a stale or missing manifest could cause failures.
  candidate: [
    async ({ page, experts: _experts }, use) => {
      void _experts;
      const creds = await signupCandidate(page);
      await use({ ...creds, page });
    },
    { scope: "test" },
  ],

  // Test-scoped: the pre-funded job creator wallet. Resolves the same key as
  // `resolveJobCreatorAddress()` so this wallet is guaranteed to hold the VETD
  // that `cleanState` tops up before each test (JOB_CREATOR_TOKEN_FLOAT).
  // Scenarios that call `createJob` should use this fixture instead of the
  // hardcoded ANVIL_KEYS[5], which is NOT funded by `cleanState`.
  jobCreator: [
    async ({ cleanState: _cs }, use) => {
      void _cs; // ensure cleanState (and its VETD top-up) runs first
      await use(resolveJobCreatorWallet());
    },
    { scope: "test" },
  ],

  // Test-scoped: freshly seeded test company. Scenarios that call
  // `recordHireOutcome` (POST /api/endorsements/hire-outcome) or `seedJob`
  // need a company id + bearer token; this fixture provides both without
  // requiring E2E_COMPANY_TOKEN to be set in the environment.
  company: [
    async ({ request, cleanState: _cs }, use) => {
      void _cs; // ensure cleanState's DB reset runs before we seed
      const timestamp = Date.now();
      const seeded = await testApi.seedCompany(request, {
        name: `E2E Company ${timestamp}`,
        email: `e2e-company-${timestamp}@vetted-test.com`,
      });
      await use({ id: seeded.id, token: seeded.token });
    },
    { scope: "test" },
  ],

  // Convenience alias for scenarios that only need the JWT string.
  companyToken: [
    async ({ company }, use) => {
      await use(company.token);
    },
    { scope: "test" },
  ],

  wallet: async ({}, use) => {
    // Track handles per page. Attaching twice to the SAME page is still a bug
    // (attachWallet's page.exposeFunction is not re-runnable), but multi-actor
    // scenarios legitimately attach a wallet to one fresh page/context per
    // expert — so the guard is keyed on the page, not the whole test.
    const handles = new Map<Page, InjectedWalletHandle>();
    // lastHandle tracks the most recently attached wallet so rejectNextRequest()
    // can forward to it without requiring the caller to hold the handle themselves.
    let lastHandle: InjectedWalletHandle | null = null;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use({
      attach: async (page, privateKey) => {
        if (handles.has(page)) {
          throw new Error(
            "wallet.attach called twice for the same page in one test",
          );
        }
        const handle = await attachWallet(page, privateKey, {
          rpcUrl: process.env.ANVIL_RPC_URL,
        });
        handles.set(page, handle);
        lastHandle = handle;
        return handle;
      },
      rejectNextRequest: (method?: string) => {
        if (!lastHandle) {
          throw new Error(
            "wallet.rejectNextRequest called before wallet.attach — attach a wallet first",
          );
        }
        lastHandle.wallet.rejectNextRequest(method);
      },
    });
    // No teardown — pages close at end of test, taking exposeFunction with them.
  },
});

export { expect } from "@playwright/test";
