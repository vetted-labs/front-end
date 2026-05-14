// e2e/real-flow/bootstrap/__tests__/determinism-spike.spec.ts
//
// Diagnostic determinism spike — Task 4 of the E2E hardening workstream.
//
// QUESTION: Is anvil snapshot/revert deterministic when the seeding that
// precedes the snapshot is fully controlled?  Or does the drift observed in
// real-flow tests come from the snapshot mechanism itself?
//
// DESIGN: The test is entirely self-contained — it does NOT rely on the
// shared fixtures.ts worker setup (no guild pre-seeded, no experts pre-
// approved).  On every run it generates a UNIQUE guild id (keccak256 of a
// timestamp-salted string) and a UNIQUE expert wallet (generatePrivateKey),
// so there is zero chance of colliding with prior state on a dirty chain.
// It seeds its own minimal on-chain state (guild + member + mint),
// takes a snapshot, runs approve+stake, reverts, and repeats.  If the balance
// is identical across both runs the snapshot mechanism is blameless and the
// historical drift must come from non-deterministic seeding or snapshot
// placement in the old fixture arrangement.
//
// VERDICT: captured in e2e/real-flow/bootstrap/DETERMINISM_FINDING.md

import { test, expect } from "@playwright/test";
import { parseAbi, getContract, keccak256, toHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import {
  createAnvilHandle,
  makeWallet,
  ANVIL_KEYS,
  foundry,
  ANVIL_RPC,
} from "../../helpers/chain";
import { readContractAddresses } from "../../helpers/contracts";

// ──────────────────────────────────────────────────────────────────────────
// Minimal ABI slices — only the functions this test drives directly.
// ──────────────────────────────────────────────────────────────────────────
const GUILD_REGISTRY_ABI = parseAbi([
  "function createGuild(bytes32 guildId, string name, uint256 minStake, int256 minReputation) external",
  "function addMember(bytes32 guildId, address member) external",
  "function guildExists(bytes32 guildId) external view returns (bool)",
  "function isMember(bytes32 guildId, address member) external view returns (bool)",
]);

const VETTED_TOKEN_ABI = parseAbi([
  "function mint(address to, uint256 amount) external",
  "function approve(address spender, uint256 value) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
]);

const EXPERT_STAKING_ABI = parseAbi([
  "function stake(bytes32 guildId, uint256 amount) external",
  "function getStakeInfo(address expert, bytes32 guildId) external view returns (uint256 amount, uint256 stakedAt)",
]);

const MIN_STAKE = 10n * 10n ** 18n;
const MINT_AMOUNT = 100n * 10n ** 18n;
const STAKE_AMOUNT = 10n * 10n ** 18n;

// ──────────────────────────────────────────────────────────────────────────
// Test
// ──────────────────────────────────────────────────────────────────────────
test("snapshot/revert produces identical on-chain state across two runs with controlled seeding", async () => {
  const anvil = createAnvilHandle();
  const addrs = readContractAddresses();
  const owner = makeWallet(ANVIL_KEYS[0]);

  // Generate a unique guild id on every run so no prior chain state can
  // interfere — this is the primary fix for dirty-chain failures.
  const SPIKE_GUILD_ID = keccak256(
    toHex(`determinism-spike-${Date.now()}-${Math.random()}`),
  ) as `0x${string}`;

  // Generate a fresh expert wallet with zero prior chain state on every run.
  const freshPrivateKey = generatePrivateKey();
  const freshAccount = privateKeyToAccount(freshPrivateKey);
  const freshWalletClient = createWalletClient({
    account: freshAccount,
    chain: foundry,
    transport: http(ANVIL_RPC),
  });

  // getContract handles bound to their respective wallet clients — matches the
  // pattern used in setup-stack.ts so that tsc can resolve account+chain from
  // the contract client rather than requiring them on every call.
  const guildRegistry = getContract({
    address: addrs.GuildRegistry,
    abi: GUILD_REGISTRY_ABI,
    client: { public: anvil.publicClient, wallet: owner.client },
  });

  const vettedTokenOwner = getContract({
    address: addrs.VettedToken,
    abi: VETTED_TOKEN_ABI,
    client: { public: anvil.publicClient, wallet: owner.client },
  });

  const vettedTokenExpert = getContract({
    address: addrs.VettedToken,
    abi: VETTED_TOKEN_ABI,
    client: { public: anvil.publicClient, wallet: freshWalletClient },
  });

  const expertStaking = getContract({
    address: addrs.ExpertStaking,
    abi: EXPERT_STAKING_ABI,
    client: { public: anvil.publicClient, wallet: freshWalletClient },
  });

  // ── Phase 1: idempotent on-chain setup ────────────────────────────────
  await test.step("create unique guild and fund the fresh expert wallet", async () => {
    // Fund fresh expert with ETH for gas (address has zero history).
    await anvil.setBalance(freshAccount.address, 10n * 10n ** 18n);

    // Create the unique guild — this id has never been used before, so
    // GuildAlreadyExists should never fire; narrow catch retained for safety.
    try {
      const createTx = await guildRegistry.write.createGuild(
        [SPIKE_GUILD_ID, "DeterminismSpike", MIN_STAKE, 0n],
        { account: owner.client.account!, chain: null },
      );
      await anvil.publicClient.waitForTransactionReceipt({ hash: createTx });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/GuildAlreadyExists/.test(msg)) throw err;
    }

    // Add the fresh expert as a guild member (brand-new address, no prior
    // AlreadyMember state possible).
    const addTx = await guildRegistry.write.addMember(
      [SPIKE_GUILD_ID, freshAccount.address],
      { account: owner.client.account!, chain: null },
    );
    await anvil.publicClient.waitForTransactionReceipt({ hash: addTx });

    // Mint exactly MINT_AMOUNT to the fresh expert (starts at 0 so the
    // pre-snapshot balance is precisely known).
    const mintTx = await vettedTokenOwner.write.mint(
      [freshAccount.address, MINT_AMOUNT],
      { account: owner.client.account!, chain: null },
    );
    await anvil.publicClient.waitForTransactionReceipt({ hash: mintTx });

    // Confirm the balance matches expectations before entering the experiment.
    const balance = (await vettedTokenExpert.read.balanceOf([
      freshAccount.address,
    ])) as bigint;
    expect(balance).toBe(MINT_AMOUNT);
  });

  // ── Phase 2: first snapshot/revert cycle ─────────────────────────────
  let first: bigint;
  await test.step("run approve+stake, snapshot, revert — first pass", async () => {
    const snap1 = await anvil.snapshot();

    // Approve ExpertStaking to spend the expert's tokens.
    const approveTx1 = await vettedTokenExpert.write.approve(
      [addrs.ExpertStaking, STAKE_AMOUNT],
      { account: freshWalletClient.account!, chain: null },
    );
    await anvil.publicClient.waitForTransactionReceipt({ hash: approveTx1 });

    // Stake into the guild.
    const stakeTx1 = await expertStaking.write.stake(
      [SPIKE_GUILD_ID, STAKE_AMOUNT],
      { account: freshWalletClient.account!, chain: null },
    );
    await anvil.publicClient.waitForTransactionReceipt({ hash: stakeTx1 });

    // Read post-stake balance.
    first = (await vettedTokenExpert.read.balanceOf([
      freshAccount.address,
    ])) as bigint;

    // Revert chain to pre-stake state.
    await anvil.revert(snap1);
  });

  // ── Phase 3: second snapshot/revert cycle ────────────────────────────
  let second: bigint;
  await test.step("run approve+stake, snapshot, revert — second pass", async () => {
    const snap2 = await anvil.snapshot();

    // Repeat the exact same operations from the same pre-stake baseline.
    const approveTx2 = await vettedTokenExpert.write.approve(
      [addrs.ExpertStaking, STAKE_AMOUNT],
      { account: freshWalletClient.account!, chain: null },
    );
    await anvil.publicClient.waitForTransactionReceipt({ hash: approveTx2 });

    const stakeTx2 = await expertStaking.write.stake(
      [SPIKE_GUILD_ID, STAKE_AMOUNT],
      { account: freshWalletClient.account!, chain: null },
    );
    await anvil.publicClient.waitForTransactionReceipt({ hash: stakeTx2 });

    second = (await vettedTokenExpert.read.balanceOf([
      freshAccount.address,
    ])) as bigint;

    await anvil.revert(snap2);
  });

  // ── Phase 4: determinism assertion ───────────────────────────────────
  await test.step("assert that both runs produced identical post-stake balances", async () => {
    console.log(
      `[determinism-spike] guild id (unique per run): ${SPIKE_GUILD_ID}`,
    );
    console.log(
      `[determinism-spike] expert address (fresh per run): ${freshAccount.address}`,
    );
    console.log(
      `[determinism-spike] first balance after stake: ${first}`,
    );
    console.log(
      `[determinism-spike] second balance after stake: ${second}`,
    );
    console.log(
      `[determinism-spike] balances match: ${first === second}`,
    );

    expect(second).toBe(first);
  });
});
