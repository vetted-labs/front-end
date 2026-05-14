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
// approved).  It seeds its own minimal on-chain state (guild + member + mint),
// takes a snapshot, runs approve+stake, reverts, and repeats.  If the balance
// is identical across both runs the snapshot mechanism is blameless and the
// historical drift must come from non-deterministic seeding or snapshot
// placement in the old fixture arrangement.

import { test, expect } from "@playwright/test";
import { parseAbi } from "viem";
import {
  createAnvilHandle,
  makeWallet,
  ANVIL_KEYS,
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

// A guild id distinct from anything else in the suite.
const SPIKE_GUILD_ID =
  `0x${"d1".padEnd(64, "0")}` as `0x${string}`;
const MIN_STAKE = 10n * 10n ** 18n;
// Mint enough to stake twice without revert (snapshot revert undoes the first
// stake so the expert regains their allowance; but the balance is what we're
// asserting, not the stake record).
const MINT_AMOUNT = 100n * 10n ** 18n;
const STAKE_AMOUNT = 10n * 10n ** 18n;

// ──────────────────────────────────────────────────────────────────────────
// Test
// ──────────────────────────────────────────────────────────────────────────
test("snapshot/revert produces identical on-chain state across two runs with controlled seeding", async () => {
  const anvil = createAnvilHandle();
  const addrs = readContractAddresses();
  const owner = makeWallet(ANVIL_KEYS[0]);
  const expert = makeWallet(ANVIL_KEYS[1]);

  // ── Phase 1: idempotent on-chain setup ────────────────────────────────
  await test.step("set up the on-chain guild and fund the expert", async () => {
    // Fund expert with ETH for gas.
    await anvil.setBalance(expert.address, 10n * 10n ** 18n);

    // Create the guild if it doesn't already exist (idempotent for reruns).
    const guildExists = await anvil.publicClient.readContract({
      address: addrs.GuildRegistry,
      abi: GUILD_REGISTRY_ABI,
      functionName: "guildExists",
      args: [SPIKE_GUILD_ID],
    });
    if (!guildExists) {
      await owner.client.writeContract({
        address: addrs.GuildRegistry,
        abi: GUILD_REGISTRY_ABI,
        functionName: "createGuild",
        args: [SPIKE_GUILD_ID, "DeterminismSpike", MIN_STAKE, 0n],
      });
    }

    // Add the expert as a guild member if not already (idempotent).
    const isMember = await anvil.publicClient.readContract({
      address: addrs.GuildRegistry,
      abi: GUILD_REGISTRY_ABI,
      functionName: "isMember",
      args: [SPIKE_GUILD_ID, expert.address],
    });
    if (!isMember) {
      await owner.client.writeContract({
        address: addrs.GuildRegistry,
        abi: GUILD_REGISTRY_ABI,
        functionName: "addMember",
        args: [SPIKE_GUILD_ID, expert.address],
      });
    }

    // Mint VETD tokens to the expert (from the owner/minter).
    await owner.client.writeContract({
      address: addrs.VettedToken,
      abi: VETTED_TOKEN_ABI,
      functionName: "mint",
      args: [expert.address, MINT_AMOUNT],
    });

    // Confirm the balance is as expected before we start the experiment.
    const balance = await anvil.publicClient.readContract({
      address: addrs.VettedToken,
      abi: VETTED_TOKEN_ABI,
      functionName: "balanceOf",
      args: [expert.address],
    });
    // balance may already include tokens from prior runs on the same anvil; we
    // just need it to be >= MINT_AMOUNT for the experiment to be meaningful.
    expect(balance).toBeGreaterThanOrEqual(MINT_AMOUNT);
  });

  // ── Phase 2: first snapshot/revert cycle ─────────────────────────────
  let first: bigint;
  await test.step("run approve+stake, snapshot, revert — first pass", async () => {
    const snap1 = await anvil.snapshot();

    // Approve ExpertStaking to spend the expert's tokens.
    await expert.client.writeContract({
      address: addrs.VettedToken,
      abi: VETTED_TOKEN_ABI,
      functionName: "approve",
      args: [addrs.ExpertStaking, STAKE_AMOUNT],
    });

    // Stake into the guild.
    await expert.client.writeContract({
      address: addrs.ExpertStaking,
      abi: EXPERT_STAKING_ABI,
      functionName: "stake",
      args: [SPIKE_GUILD_ID, STAKE_AMOUNT],
    });

    // Read post-stake balance.
    first = (await anvil.publicClient.readContract({
      address: addrs.VettedToken,
      abi: VETTED_TOKEN_ABI,
      functionName: "balanceOf",
      args: [expert.address],
    })) as bigint;

    // Revert chain to pre-stake state.
    await anvil.revert(snap1);
  });

  // ── Phase 3: second snapshot/revert cycle ────────────────────────────
  let second: bigint;
  await test.step("run approve+stake, snapshot, revert — second pass", async () => {
    const snap2 = await anvil.snapshot();

    // Repeat the exact same operations from the same pre-stake baseline.
    await expert.client.writeContract({
      address: addrs.VettedToken,
      abi: VETTED_TOKEN_ABI,
      functionName: "approve",
      args: [addrs.ExpertStaking, STAKE_AMOUNT],
    });

    await expert.client.writeContract({
      address: addrs.ExpertStaking,
      abi: EXPERT_STAKING_ABI,
      functionName: "stake",
      args: [SPIKE_GUILD_ID, STAKE_AMOUNT],
    });

    second = (await anvil.publicClient.readContract({
      address: addrs.VettedToken,
      abi: VETTED_TOKEN_ABI,
      functionName: "balanceOf",
      args: [expert.address],
    })) as bigint;

    await anvil.revert(snap2);
  });

  // ── Phase 4: determinism assertion ───────────────────────────────────
  await test.step("assert that both runs produced identical post-stake balances", async () => {
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
