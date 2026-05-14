// e2e/real-flow/bootstrap/manifest.ts
import fs from "node:fs";
import path from "node:path";
import type { Address, Hex } from "viem";
import type { ContractAddresses } from "../helpers/contracts";

export type ManifestGuild = {
  id: string; // backend guild id (uuid)
  name: string;
  onChainGuildId: Hex; // bytes32
};

export type ManifestExpert = {
  id: string; // backend expert id
  address: Address;
  privateKey: Hex;
  guildId: string; // backend guild id this expert is staked into
};

export type BootstrapManifest = {
  createdAt: string;
  chainId: number;
  contracts: ContractAddresses;
  guilds: ManifestGuild[];
  experts: ManifestExpert[];
};

export const DEFAULT_MANIFEST_PATH = path.resolve(__dirname, "manifest.json");

export function writeManifest(
  m: BootstrapManifest,
  filePath: string = DEFAULT_MANIFEST_PATH,
): void {
  fs.writeFileSync(filePath, JSON.stringify(m, null, 2) + "\n", "utf-8");
}

export function readManifest(
  filePath: string = DEFAULT_MANIFEST_PATH,
): BootstrapManifest {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Bootstrap manifest not found at ${filePath}. Run the deterministic ` +
        `bootstrap first: \`npx ts-node e2e/real-flow/bootstrap/setup-stack.ts\`.`,
    );
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as BootstrapManifest;
}
