// e2e/real-flow/helpers/contracts.ts
import fs from "node:fs";
import path from "node:path";
import { getContract, type Address, type PublicClient } from "viem";
import vettingManagerAbi from "@/contracts/abis/VettingManager.json";
import expertStakingAbi from "@/contracts/abis/ExpertStaking.json";
import guildRegistryAbi from "@/contracts/abis/GuildRegistry.json";
import slashingManagerAbi from "@/contracts/abis/SlashingManager.json";
import vettedTokenAbi from "@/contracts/abis/VettedToken.json";
import endorsementBiddingAbi from "@/contracts/abis/EndorsementBidding.json";
import rewardDistributorAbi from "@/contracts/abis/RewardDistributor.json";
import reputationManagerAbi from "@/contracts/abis/ReputationManager.json";

/**
 * Path to the deployments JSON written by the smart-contracts repo when
 * running `forge script script/Deploy.s.sol --rpc-url http://localhost:8545
 * --broadcast`. Resolved at runtime (not via TS module import) so the file is
 * treated as data, not a module dependency.
 */
const DEPLOYMENTS_PATH = path.resolve(
  __dirname,
  "../../../../smart-contracts/deployments/local-latest.json",
);

export type ContractAddresses = {
  VettedToken: Address;
  ExpertStaking: Address;
  GuildRegistry: Address;
  VettingManager: Address;
  SlashingManager: Address;
  EndorsementBidding: Address;
  RewardDistributor: Address;
  ReputationManager: Address;
};

export function readContractAddresses(): ContractAddresses {
  if (!fs.existsSync(DEPLOYMENTS_PATH)) {
    throw new Error(
      `deployments-local.json not found at ${DEPLOYMENTS_PATH}. ` +
        `Start anvil and run ` +
        `\`forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast\` ` +
        `from the smart-contracts repo to emit it.`,
    );
  }
  const raw = fs.readFileSync(DEPLOYMENTS_PATH, "utf-8");
  return JSON.parse(raw) as ContractAddresses;
}

export function makeContracts(
  addresses: ContractAddresses,
  client: PublicClient,
) {
  return {
    vettingManager: getContract({
      address: addresses.VettingManager,
      abi: vettingManagerAbi,
      client,
    }),
    expertStaking: getContract({
      address: addresses.ExpertStaking,
      abi: expertStakingAbi,
      client,
    }),
    guildRegistry: getContract({
      address: addresses.GuildRegistry,
      abi: guildRegistryAbi,
      client,
    }),
    slashingManager: getContract({
      address: addresses.SlashingManager,
      abi: slashingManagerAbi,
      client,
    }),
    vettedToken: getContract({
      address: addresses.VettedToken,
      abi: vettedTokenAbi,
      client,
    }),
    endorsementBidding: getContract({
      address: addresses.EndorsementBidding,
      abi: endorsementBiddingAbi,
      client,
    }),
    rewardDistributor: getContract({
      address: addresses.RewardDistributor,
      abi: rewardDistributorAbi,
      client,
    }),
    reputationManager: getContract({
      address: addresses.ReputationManager,
      abi: reputationManagerAbi,
      client,
    }),
  };
}

export type ContractHandles = ReturnType<typeof makeContracts>;
