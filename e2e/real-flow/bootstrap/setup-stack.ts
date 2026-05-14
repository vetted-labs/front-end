// e2e/real-flow/bootstrap/setup-stack.ts
//
// Deterministic stack bootstrap: seeds guildCount × 10 staked experts.
// Idempotent — safe to run repeatedly against a live Anvil + E2E backend.
//
// Usage:
//   npm run e2e:bootstrap -- 3
//   BACKEND_URL=http://localhost:4000 npm run e2e:bootstrap -- 3   # default
//   BACKEND_URL=http://localhost:4100 npm run e2e:bootstrap -- 3   # override for separate E2E backend port
//
// tsx reads tsconfig.json paths natively, so the @/ alias and JSON imports
// in the canonical helpers resolve correctly without any extra flags.

import https from "node:https";
import http from "node:http";
import { getContract, type Hex } from "viem";
import { createAnvilHandle, makeWallet, ANVIL_KEYS } from "../helpers/chain";
import { readContractAddresses, makeContracts } from "../helpers/contracts";
import { deriveExpertKeys } from "./keys";
import { writeManifest } from "./manifest";
import type { BootstrapManifest, ManifestGuild, ManifestExpert } from "./manifest";
import { BACKEND_URL } from "../helpers/backend";
// ABIs — tsx + tsconfig paths resolves @/ correctly at CLI runtime
import expertStakingAbi from "@/contracts/abis/ExpertStaking.json";
import vettedTokenAbi from "@/contracts/abis/VettedToken.json";

// ---------------------------------------------------------------------------
// Inline HTTP helper (no Playwright APIRequestContext at CLI script runtime)
// ---------------------------------------------------------------------------

async function postJson<T>(
  urlPath: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const url = new URL(urlPath, BACKEND_URL);
  const payload = JSON.stringify(body ?? {});

  return new Promise<T>((resolve, reject) => {
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          if (!res.statusCode || res.statusCode >= 400) {
            reject(
              new Error(
                `POST ${urlPath} failed: ${res.statusCode} ${data.slice(0, 200)}`,
              ),
            );
            return;
          }
          try {
            const parsed = JSON.parse(data) as { data: T };
            resolve(parsed.data);
          } catch {
            reject(new Error(`Failed to parse response: ${data.slice(0, 200)}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Backend test-API wrappers
// ---------------------------------------------------------------------------

async function apiReset(): Promise<{ truncated: number }> {
  return postJson<{ truncated: number }>("/api/test/reset");
}

async function apiSeedGuild(body: {
  name: string;
  slug: string;
  onChainGuildId: number;
}): Promise<{ id: string; name: string; slug: string; on_chain_guild_id: `0x${string}` }> {
  return postJson<{ id: string; name: string; slug: string; on_chain_guild_id: `0x${string}` }>(
    "/api/test/seed/guild",
    body,
  );
}

async function apiSeedExpert(body: {
  walletAddress: string;
  fullName: string;
  email: string;
  status: string;
  guildId: string;
  stakeAmount: string;
}): Promise<{ id: string }> {
  return postJson<{ id: string }>("/api/test/seed/expert", body);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPERTS_PER_GUILD = 10;
const STAKE = 10n * 10n ** 18n;
const EXPERT_LIQUID = 1_000n * 10n ** 18n;
const GAS_ETH = 1n * 10n ** 18n; // 1 ETH for gas

// onChainGuildId values are the integer guild IDs the backend normalizes to
// bytes32 when returning on_chain_guild_id from seedGuild.
const GUILD_DEFS = [
  { name: "Engineering", slug: "engineering", onChainGuildId: 1 },
  { name: "Design", slug: "design", onChainGuildId: 2 },
  { name: "Product", slug: "product", onChainGuildId: 3 },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const guildCount = Number(process.argv[2] ?? 3);
  if (guildCount < 1 || guildCount > GUILD_DEFS.length) {
    throw new Error(
      `guildCount must be 1–${GUILD_DEFS.length}, got ${guildCount}`,
    );
  }

  const anvil = createAnvilHandle();
  const addresses = readContractAddresses();
  const owner = makeWallet(ANVIL_KEYS[0]);

  // Read-only contract handles via makeContracts (owner public client)
  const contracts = makeContracts(addresses, anvil.publicClient);

  // Write-capable owner contract handles (owner wallet client)
  const guildRegistry = getContract({
    address: addresses.GuildRegistry,
    abi: contracts.guildRegistry.abi,
    client: { public: anvil.publicClient, wallet: owner.client },
  });

  const vettedToken = getContract({
    address: addresses.VettedToken,
    abi: contracts.vettedToken.abi,
    client: { public: anvil.publicClient, wallet: owner.client },
  });

  // Step 1: reset the E2E backend DB
  console.log("[bootstrap] resetting E2E backend…");
  await apiReset();

  const totalExperts = guildCount * EXPERTS_PER_GUILD;
  const allKeys = deriveExpertKeys(totalExperts);

  const guildsManifest: ManifestGuild[] = [];
  const expertsManifest: ManifestExpert[] = [];

  // Step 2: seed guilds + experts
  for (let gi = 0; gi < guildCount; gi++) {
    const def = GUILD_DEFS[gi];
    console.log(`[bootstrap] seeding guild ${def.name}…`);

    // Backend: create guild row
    const guildRow = await apiSeedGuild({
      name: def.name,
      slug: def.slug,
      onChainGuildId: def.onChainGuildId,
    });

    // The backend returns on_chain_guild_id as a 0x-prefixed bytes32 hex string.
    // Pass it straight to contract calls — do NOT BigInt() it.
    const onChainGuildId = guildRow.on_chain_guild_id;

    guildsManifest.push({
      id: guildRow.id,
      name: def.name,
      onChainGuildId,
    });

    // On-chain: ensure guild exists (createGuild is onlyOwner)
    try {
      const txHash = await guildRegistry.write.createGuild(
        [onChainGuildId, def.name, STAKE, 0n],
        { account: owner.client.account },
      );
      await anvil.publicClient.waitForTransactionReceipt({ hash: txHash as Hex });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/GuildAlreadyExists/.test(msg)) throw err;
    }

    // Step 3: seed 10 experts for this guild
    const guildKeys = allKeys.slice(gi * EXPERTS_PER_GUILD, (gi + 1) * EXPERTS_PER_GUILD);

    for (let ei = 0; ei < guildKeys.length; ei++) {
      const key = guildKeys[ei];
      const expertWallet = makeWallet(key.privateKey);

      // Fund expert with ETH for gas
      await anvil.setBalance(expertWallet.address, GAS_ETH);

      // Mint VET top-up if below EXPERT_LIQUID target
      const balance = await vettedToken.read.balanceOf([expertWallet.address]) as bigint;
      if (balance < EXPERT_LIQUID) {
        const topUp = EXPERT_LIQUID - balance;
        const mintTx = await vettedToken.write.mint(
          [expertWallet.address, topUp],
          { account: owner.client.account },
        );
        await anvil.publicClient.waitForTransactionReceipt({ hash: mintTx as Hex });
      }

      // On-chain: addMember (onlyOwner, idempotent)
      try {
        const addTx = await guildRegistry.write.addMember(
          [onChainGuildId, expertWallet.address],
          { account: owner.client.account },
        );
        await anvil.publicClient.waitForTransactionReceipt({ hash: addTx as Hex });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/AlreadyMember/.test(msg)) throw err;
      }

      // Per-expert write-capable contract handles
      const expertStakingClient = getContract({
        address: addresses.ExpertStaking,
        abi: expertStakingAbi,
        client: { public: anvil.publicClient, wallet: expertWallet.client },
      });

      const expertTokenClient = getContract({
        address: addresses.VettedToken,
        abi: vettedTokenAbi,
        client: { public: anvil.publicClient, wallet: expertWallet.client },
      });

      // On-chain: approve staking contract (skip if already sufficient)
      const allowance = await expertTokenClient.read.allowance([
        expertWallet.address,
        addresses.ExpertStaking,
      ]) as bigint;
      if (allowance < STAKE) {
        const approveTx = await expertTokenClient.write.approve(
          [addresses.ExpertStaking, STAKE],
          { account: expertWallet.client.account },
        );
        await anvil.publicClient.waitForTransactionReceipt({ hash: approveTx as Hex });
      }

      try {
        const stakeTx = await expertStakingClient.write.stake(
          [onChainGuildId, STAKE],
          { account: expertWallet.client.account },
        );
        await anvil.publicClient.waitForTransactionReceipt({ hash: stakeTx as Hex });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/AlreadyStaked|ExceedsMaxStake/i.test(msg)) throw err;
      }

      // Backend: register expert
      const globalIndex = gi * EXPERTS_PER_GUILD + ei + 1;
      const seeded = await apiSeedExpert({
        walletAddress: expertWallet.address,
        fullName: `E2E Expert ${globalIndex}`,
        email: `e2e-expert-${globalIndex}@vetted-test.com`,
        status: "approved",
        guildId: guildRow.id,
        stakeAmount: STAKE.toString(),
      });

      expertsManifest.push({
        id: seeded.id,
        address: expertWallet.address,
        privateKey: key.privateKey,
        guildId: guildRow.id,
      });

      console.log(
        `[bootstrap]   expert ${globalIndex}/${totalExperts} (${def.name}): ${expertWallet.address}`,
      );
    }
  }

  // Step 4: write manifest
  const chainId = await anvil.publicClient.getChainId();
  const manifest: BootstrapManifest = {
    createdAt: new Date().toISOString(),
    chainId,
    contracts: addresses,
    guilds: guildsManifest,
    experts: expertsManifest,
  };

  writeManifest(manifest);
  console.log(
    `[bootstrap] manifest written: ${guildsManifest.length} guilds, ${expertsManifest.length} experts.`,
  );
}

main().catch((err) => {
  console.error("[bootstrap] FATAL:", err);
  process.exit(1);
});
