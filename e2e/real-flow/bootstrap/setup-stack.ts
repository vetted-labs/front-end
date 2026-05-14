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

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import { getContract, type Hex, type Address } from "viem";
import { createAnvilHandle, makeWallet, ANVIL_KEYS } from "../helpers/chain";
import { readContractAddresses, makeContracts } from "../helpers/contracts";
import { deriveExpertKeys } from "./keys";
import { writeManifest } from "./manifest";
import type { BootstrapManifest, ManifestGuild, ManifestExpert } from "./manifest";
import { BACKEND_URL } from "../helpers/backend";
// ABIs — tsx + tsconfig paths resolves @/ correctly at CLI runtime
import expertStakingAbi from "@/contracts/abis/ExpertStaking.json";
import vettedTokenAbi from "@/contracts/abis/VettedToken.json";
import vettingManagerAbi from "@/contracts/abis/VettingManager.json";

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
const BACKEND_GAS_ETH = 100n * 10n ** 18n; // backend wallet drives all pipeline txs

// onChainGuildId values are the integer guild IDs the backend normalizes to
// bytes32 when returning on_chain_guild_id from seedGuild.
const GUILD_DEFS = [
  { name: "Engineering", slug: "engineering", onChainGuildId: 1 },
  { name: "Design", slug: "design", onChainGuildId: 2 },
  { name: "Product", slug: "product", onChainGuildId: 3 },
];

// ---------------------------------------------------------------------------
// Backend wallet authorization
// ---------------------------------------------------------------------------

// The e2e backend runs against backend/.env.e2e. The backend service wallet
// defined there is the sole orchestrator of the on-chain review pipeline
// (createSession / batchRevealVotes / finalizeSession), all of which are
// onlyOwner / onlyAuthorizedRevealer on VettingManager. Deploy.s.sol initializes
// the VettingManager owner to the deployer (anvil account 0), so we complete the
// wiring here: transfer ownership to the backend wallet and register it as an
// authorized revealer. Idempotent — safe to re-run.
function readBackendWalletKey(): Hex {
  const envPath = path.resolve(
    __dirname,
    "../../../../backend/.env.e2e",
  );
  if (!fs.existsSync(envPath)) {
    throw new Error(
      `setup-stack: backend/.env.e2e not found at ${envPath} — cannot resolve BACKEND_WALLET_PRIVATE_KEY`,
    );
  }
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    if (trimmed.slice(0, sep).trim() !== "BACKEND_WALLET_PRIVATE_KEY") continue;
    const value = trimmed.slice(sep + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
      throw new Error(
        "setup-stack: BACKEND_WALLET_PRIVATE_KEY in backend/.env.e2e is not a 0x-prefixed 32-byte hex string",
      );
    }
    return value as Hex;
  }
  throw new Error(
    "setup-stack: BACKEND_WALLET_PRIVATE_KEY not found in backend/.env.e2e",
  );
}

async function authorizeBackendWallet(
  anvil: ReturnType<typeof createAnvilHandle>,
  vettingManagerAddress: Address,
  owner: ReturnType<typeof makeWallet>,
): Promise<void> {
  const backend = makeWallet(readBackendWalletKey());
  console.log(`[bootstrap] authorizing backend wallet ${backend.address}…`);

  // Fund the backend wallet — it is not an anvil default account, so it has
  // zero ETH and every pipeline tx would revert with "insufficient funds".
  await anvil.setBalance(backend.address, BACKEND_GAS_ETH);

  const ownerVetting = getContract({
    address: vettingManagerAddress,
    abi: vettingManagerAbi,
    client: { public: anvil.publicClient, wallet: owner.client },
  });
  const backendVetting = getContract({
    address: vettingManagerAddress,
    abi: vettingManagerAbi,
    client: { public: anvil.publicClient, wallet: backend.client },
  });

  const currentOwner = (await ownerVetting.read.owner()) as Address;

  if (currentOwner.toLowerCase() !== backend.address.toLowerCase()) {
    const pendingOwner = (await ownerVetting.read.pendingOwner()) as Address;
    if (pendingOwner.toLowerCase() !== backend.address.toLowerCase()) {
      const tx = await ownerVetting.write.transferOwnership(
        [backend.address],
        { account: owner.client.account },
      );
      await anvil.publicClient.waitForTransactionReceipt({ hash: tx as Hex });
      console.log("[bootstrap]   transferOwnership -> backend wallet");
    }
    // Ownable2Step: backend wallet must accept.
    const acceptTx = await backendVetting.write.acceptOwnership([], {
      account: backend.client.account,
    });
    await anvil.publicClient.waitForTransactionReceipt({ hash: acceptTx as Hex });
    console.log("[bootstrap]   acceptOwnership -> backend wallet is now owner");
  } else {
    console.log("[bootstrap]   backend wallet already owns VettingManager");
  }

  // Register the backend wallet as an authorized revealer so the
  // batch_reveal_votes outbox op can call batchRevealVotes.
  const isRevealer = (await backendVetting.read.isAuthorizedRevealer([
    backend.address,
  ])) as boolean;
  if (!isRevealer) {
    const tx = await backendVetting.write.addAuthorizedRevealer(
      [backend.address],
      { account: backend.client.account },
    );
    await anvil.publicClient.waitForTransactionReceipt({ hash: tx as Hex });
    console.log("[bootstrap]   addAuthorizedRevealer -> backend wallet");
  } else {
    console.log("[bootstrap]   backend wallet already an authorized revealer");
  }
}

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

  // Deploy.s.sol mints exactly the 24h VettedToken MINT_RATE_LIMIT (50M VETD)
  // during deployment, so on a fresh anvil the per-expert mint top-ups below
  // would revert with MintRateLimitExceeded(). Roll the chain past a full
  // mint epoch so the rate-limit window resets. `increaseTime` mines a block.
  console.log("[bootstrap] advancing chain past the 24h mint epoch…");
  await anvil.increaseTime(25 * 60 * 60); // 25h > 24h epoch

  // Step 1.5: hand the backend service wallet the on-chain privileges it needs
  // to drive the review pipeline (VettingManager owner + authorized revealer).
  await authorizeBackendWallet(anvil, addresses.VettingManager, owner);

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
