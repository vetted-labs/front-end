// e2e/real-flow/helpers/chain.ts
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { defineChain } from "viem";

export const ANVIL_RPC = process.env.ANVIL_RPC_URL ?? "http://localhost:8545";

// We run anvil with `--chain-id 11155111` so the whole stack (BE provider
// pinned to sepolia, FE wagmi config defaulting to sepolia, CommitmentForm's
// onSepolia gate) lines up against a single chain id. The chain object below
// is sepolia with its RPC retargeted to localhost.
export const foundry = defineChain({
  ...sepolia,
  rpcUrls: {
    default: { http: [ANVIL_RPC] },
  },
});

// Anvil deterministic accounts (mnemonic: "test test test test test test test test test test test junk")
export const ANVIL_KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
] as const;

export type AnvilHandle = {
  rpc: string;
  publicClient: PublicClient;
  snapshot(): Promise<Hex>;
  revert(id: Hex): Promise<void>;
  increaseTime(seconds: number): Promise<void>;
  mine(blocks?: number): Promise<void>;
  setBalance(address: Address, wei: bigint): Promise<void>;
};

export function createAnvilHandle(): AnvilHandle {
  const transport = http(ANVIL_RPC);
  const publicClient = createPublicClient({ chain: foundry, transport });
  return {
    rpc: ANVIL_RPC,
    publicClient,
    async snapshot() {
      return (await publicClient.request({
        method: "evm_snapshot" as never,
        params: [] as never,
      })) as Hex;
    },
    async revert(id) {
      await publicClient.request({
        method: "evm_revert" as never,
        params: [id] as never,
      });
    },
    async increaseTime(seconds) {
      await publicClient.request({
        method: "evm_increaseTime" as never,
        params: [`0x${seconds.toString(16)}`] as never,
      });
      await this.mine(1);
    },
    async mine(blocks = 1) {
      await publicClient.request({
        method: "anvil_mine" as never,
        params: [`0x${blocks.toString(16)}`] as never,
      });
    },
    async setBalance(address, wei) {
      await publicClient.request({
        method: "anvil_setBalance" as never,
        params: [address, `0x${wei.toString(16)}`] as never,
      });
    },
  };
}

export type Wallet = {
  address: Address;
  privateKey: Hex;
  client: WalletClient;
};

export function makeWallet(privateKey: Hex): Wallet {
  const account = privateKeyToAccount(privateKey);
  const client = createWalletClient({
    account,
    chain: foundry,
    transport: http(ANVIL_RPC),
  });
  return { address: account.address, privateKey, client };
}
