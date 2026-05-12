// e2e/real-flow/helpers/headless-wallet.ts
//
// Node-side headless EIP-1193 wallet for Playwright real-flow tests.
// Runs in the test process; communicates with the page via a stub mounted
// on `window.ethereum` (see `wallet-injection.ts`).
//
// Signing methods (`personal_sign`, `eth_signTypedData_v4`,
// `eth_sendTransaction`) are handled locally via viem against the active
// account's private key. Reads (`eth_call`, `eth_getBalance`, `eth_chainId`,
// etc.) are forwarded to anvil's HTTP RPC via the public client.
//
// IMPORTANT: This file is in `e2e/` and is never imported by the Next.js
// build. Production bundles do not see this code.

import { EventEmitter } from "node:events";
import {
  createPublicClient,
  createWalletClient,
  http,
  hexToString,
  isHex,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia as chainConfig } from "viem/chains";

// Real-flow runs anvil with `--chain-id 11155111` so the BE provider, FE
// wagmi sepolia chain config, and the shim all line up on a single chain id.
// EIP-155 signing must match the chainId anvil reports.

export interface HeadlessWalletOptions {
  privateKey: Hex;
  rpcUrl?: string;
  debug?: boolean;
}

type Eip1193Request = { method: string; params?: unknown[] };

const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7" as const; // 11155111

export class HeadlessWallet extends EventEmitter {
  private walletClient!: WalletClient;
  private publicClient: PublicClient;
  private activeAddress!: Address;
  private debug: boolean;
  private rpcUrl: string;

  constructor(opts: HeadlessWalletOptions) {
    super();
    this.rpcUrl = opts.rpcUrl ?? process.env.ANVIL_RPC_URL ?? "http://localhost:8545";
    this.debug = opts.debug ?? process.env.HEADLESS_WALLET_DEBUG === "1";
    this.publicClient = createPublicClient({
      chain: chainConfig,
      transport: http(this.rpcUrl),
    });
    this.setAccount(opts.privateKey);
  }

  /** Returns the currently active address. */
  get address(): Address {
    return this.activeAddress;
  }

  /**
   * Swap the active private key. Emits `accountsChanged` so listeners (the
   * page-side stub forwards this to wagmi's injected connector) reconnect
   * with the new address.
   */
  setAccount(privateKey: Hex): void {
    const account = privateKeyToAccount(privateKey);
    this.activeAddress = account.address;
    this.walletClient = createWalletClient({
      account,
      chain: chainConfig,
      transport: http(this.rpcUrl),
    });
    if (this.debug) console.log("[hw] setAccount", account.address);
    this.emit("accountsChanged", [account.address]);
  }

  /** EIP-1193 entry point. Called by the page-side stub via exposeFunction. */
  async request(req: Eip1193Request): Promise<unknown> {
    if (this.debug) console.log("[hw] →", req.method, JSON.stringify(req.params)?.slice(0, 200));
    try {
      const result = await this.handle(req);
      if (this.debug) console.log("[hw] ←", req.method);
      return result;
    } catch (err) {
      if (this.debug) console.log("[hw] ✗", req.method, err);
      throw err;
    }
  }

  private async handle({ method, params = [] }: Eip1193Request): Promise<unknown> {
    switch (method) {
      case "eth_requestAccounts":
      case "eth_accounts":
        return [this.activeAddress];

      case "eth_chainId":
        return SEPOLIA_CHAIN_ID_HEX;

      case "net_version":
        return "11155111";

      case "personal_sign": {
        const [hexMessage] = params as [Hex, Address];
        const message = isHex(hexMessage) ? hexToString(hexMessage) : (hexMessage as string);
        return this.walletClient.signMessage({
          account: this.walletClient.account!,
          message,
        });
      }

      case "eth_sign": {
        const [, hexMessage] = params as [Address, Hex];
        const message = isHex(hexMessage) ? hexToString(hexMessage) : (hexMessage as string);
        return this.walletClient.signMessage({
          account: this.walletClient.account!,
          message,
        });
      }

      case "eth_signTypedData_v4": {
        const [, typedDataJson] = params as [Address, string];
        const typedData = JSON.parse(typedDataJson) as Parameters<
          WalletClient["signTypedData"]
        >[0];
        return this.walletClient.signTypedData({
          account: this.walletClient.account!,
          ...(typedData as object),
        } as Parameters<WalletClient["signTypedData"]>[0]);
      }

      case "eth_sendTransaction": {
        const [tx] = params as [Record<string, unknown>];
        return this.walletClient.sendTransaction({
          account: this.walletClient.account!,
          ...(tx as object),
        } as Parameters<WalletClient["sendTransaction"]>[0]);
      }

      case "wallet_switchEthereumChain":
      case "wallet_addEthereumChain":
      case "wallet_watchAsset":
      case "wallet_revokePermissions":
        return null;

      case "wallet_requestPermissions":
        // Mimic MetaMask: granting `eth_accounts` returns a single permission
        // entry. Wagmi v2's injected connector uses this on (re)connect; if
        // we return null/throw, it can swallow downstream wallet events.
        return [{ parentCapability: "eth_accounts" }];

      case "wallet_getPermissions":
        return [{ parentCapability: "eth_accounts" }];

      default:
        return this.publicClient.request({
          method,
          params,
        } as Parameters<PublicClient["request"]>[0]);
    }
  }
}
