"use client";

import {
  createPublicClient,
  createWalletClient,
  hexToString,
  http,
  isHex,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "wagmi/chains";

const DEFAULT_ANVIL_PRIVATE_KEY = (
  "0x" +
  [
    "59c6995e998f97a5",
    "a0044966f0945389",
    "dc9e86dae88c7a84",
    "12f4603b6b78690d",
  ].join("")
) as Hex;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

type Eip1193Request = {
  method: string;
  params?: unknown[];
};

type Listener = (...args: unknown[]) => void;

interface HeadlessProvider {
  isMetaMask: boolean;
  _metamask: { isUnlocked: () => Promise<boolean> };
  request: (request: Eip1193Request) => Promise<unknown>;
  on: (event: string, callback: Listener) => void;
  removeListener: (event: string, callback: Listener) => void;
  _emit: (event: string, ...args: unknown[]) => void;
}

function getRpcUrl() {
  return (
    process.env.NEXT_PUBLIC_ANVIL_RPC_URL ||
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
    "http://localhost:8545"
  );
}

function getPrivateKey(): Hex {
  const configured = process.env.NEXT_PUBLIC_E2E_WALLET_PRIVATE_KEY;
  return (configured || DEFAULT_ANVIL_PRIVATE_KEY) as Hex;
}

function createHeadlessProvider(): HeadlessProvider {
  const account = privateKeyToAccount(getPrivateKey());
  const rpcUrl = getRpcUrl();
  const publicClient: PublicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });
  const walletClient: WalletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl),
  });
  const listeners = new Map<string, Set<Listener>>();

  const emit = (event: string, ...args: unknown[]) => {
    listeners.get(event)?.forEach((callback) => callback(...args));
  };

  const provider: HeadlessProvider = {
    isMetaMask: true,
    _metamask: { isUnlocked: async () => true },

    async request({ method, params = [] }) {
      switch (method) {
        case "eth_requestAccounts":
        case "eth_accounts":
          return [account.address];

        case "eth_chainId":
          return SEPOLIA_CHAIN_ID_HEX;

        case "net_version":
          return String(sepolia.id);

        case "personal_sign": {
          const [rawMessage] = params as [Hex | string, Address];
          const message = isHex(rawMessage) ? hexToString(rawMessage) : rawMessage;
          return walletClient.signMessage({ account, message });
        }

        case "eth_sign": {
          const [, rawMessage] = params as [Address, Hex | string];
          const message = isHex(rawMessage) ? hexToString(rawMessage) : rawMessage;
          return walletClient.signMessage({ account, message });
        }

        case "eth_signTypedData_v4": {
          const [, typedDataJson] = params as [Address, string];
          const typedData = JSON.parse(typedDataJson) as Parameters<
            WalletClient["signTypedData"]
          >[0];
          return walletClient.signTypedData({
            account,
            ...(typedData as object),
          } as Parameters<WalletClient["signTypedData"]>[0]);
        }

        case "eth_sendTransaction": {
          const [tx] = params as [Record<string, unknown>];
          const txWithoutNonce = { ...tx };
          delete txWithoutNonce.nonce;
          const nonce = await publicClient.getTransactionCount({
            address: account.address,
            blockTag: "latest",
          });
          return walletClient.sendTransaction({
            ...(txWithoutNonce as object),
            account,
            nonce,
          } as Parameters<WalletClient["sendTransaction"]>[0]);
        }

        case "wallet_switchEthereumChain":
        case "wallet_addEthereumChain":
        case "wallet_watchAsset":
        case "wallet_revokePermissions":
          return null;

        case "wallet_requestPermissions":
        case "wallet_getPermissions":
          return [{ parentCapability: "eth_accounts" }];

        default:
          return publicClient.request({
            method,
            params,
          } as Parameters<PublicClient["request"]>[0]);
      }
    },

    on(event, callback) {
      const callbacks = listeners.get(event) ?? new Set<Listener>();
      callbacks.add(callback);
      listeners.set(event, callbacks);
    },

    removeListener(event, callback) {
      listeners.get(event)?.delete(callback);
    },

    _emit: emit,
  };

  setTimeout(() => provider._emit("connect", { chainId: SEPOLIA_CHAIN_ID_HEX }), 0);
  return provider;
}

export function installBrowserHeadlessWallet() {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_E2E_MODE !== "true") return;
  if (window.__vettedHeadlessProvider) return;

  const forceHeadless =
    process.env.NEXT_PUBLIC_E2E_FORCE_HEADLESS_WALLET === "true";
  if (window.ethereum && !forceHeadless) return;

  const provider = createHeadlessProvider();
  window.ethereum = provider;
  window.__vettedHeadlessProvider = provider;
}

declare global {
  interface Window {
    __vettedHeadlessProvider?: HeadlessProvider;
  }
}
