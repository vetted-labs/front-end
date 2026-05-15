import { http, cookieStorage, createStorage, createConnector } from "wagmi";
import { fallback } from "viem";
import { injected } from "wagmi/connectors";
import { sepolia, foundry } from "wagmi/chains";
import { getDefaultConfig, type Wallet } from "@rainbow-me/rainbowkit";

// RainbowKit's getDefaultConfig wires up WalletConnect v2 + mobile deep-linking
// for 300+ wallets (MetaMask, Coinbase, Rainbow, Trust, Zerion, Ledger, Safe, etc.)
// Project ID is a public identifier — safe to expose in the frontend bundle.
const projectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "";

if (!projectId && typeof window !== "undefined") {
  console.warn(
    "[wagmi-config] NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is not set. " +
      "WalletConnect v2 wallets (Rainbow, Trust, mobile deep-linking, etc.) will not work. " +
      "Get a free project ID at https://cloud.walletconnect.com"
  );
}

const isE2E = process.env.NEXT_PUBLIC_E2E_MODE === "true";

// Build-time guard: prod build must never ship with the E2E flag on, since
// the flag relaxes chain whitelists and exposes an injected-wallet code path.
if (process.env.NODE_ENV === "production" && isE2E) {
  throw new Error(
    "[wagmi-config] NEXT_PUBLIC_E2E_MODE must NOT be set in production builds — " +
      "this flag relaxes chain whitelists and exposes an injected-wallet code path.",
  );
}

// Sepolia transport stack. Primary is whatever the operator configures via
// NEXT_PUBLIC_SEPOLIA_RPC_URL (typically a paid Infura/Alchemy key); public
// RPCs back it up so that an exhausted Infura quota or transient outage
// doesn't make every on-chain read silently return `undefined` (which the UI
// then renders as "0" — see `useReadContract` callers in
// `src/lib/hooks/useVettedContracts.ts`).
const sepoliaRpcOptions = {
  batch: { batchSize: 50, wait: 50 },
  retryCount: 2,
  timeout: 10_000,
} as const;

// `rank: true` makes viem actively rank these transports by stability + latency
// rather than always firing at the configured Infura key first. When the paid
// RPC's quota is exhausted (returns -32005 / 429), it gets demoted and a public
// fallback handles subsequent requests in the same session — so we don't keep
// burning credits / latency on a known-bad endpoint. interval=120s + sampleCount=3
// keeps probe traffic to ~1 call per RPC every 2 minutes (~1.5 probes/min total).
// Stability weighted higher than latency so a slightly slower-but-working RPC
// beats a fast-but-erroring one.
const sepoliaTransport = fallback(
  [
    ...(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL
      ? [http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL, sepoliaRpcOptions)]
      : []),
    http("https://ethereum-sepolia-rpc.publicnode.com", sepoliaRpcOptions),
    http("https://sepolia.drpc.org", sepoliaRpcOptions),
  ],
  {
    rank: {
      interval: 120_000,
      sampleCount: 3,
      timeout: 5_000,
      weights: { latency: 0.3, stability: 0.7 },
    },
  },
);

const foundryTransport = http(
  process.env.NEXT_PUBLIC_ANVIL_RPC_URL ?? "http://localhost:8545",
);

// E2E-only custom RainbowKit wallet. Wraps wagmi's `injected()` connector so
// it reads from `window.ethereum` — which the Playwright real-flow harness
// mounts as a headless EIP-1193 shim (see `e2e/real-flow/helpers/headless-
// wallet.ts`). RainbowKit's default `getDefaultConfig` only registers
// SDK-style connectors (`metaMaskSDK`, `coinbaseWalletSDK`, `walletConnect`)
// none of which read `window.ethereum`, so the shim has nothing to talk to
// without this entry. The pattern follows the re-nft / rombrom dApp-E2E
// testing recipe (custom RK wallet + injected connector + anvil).
const headlessE2eWallet = (): Wallet => ({
  id: "headless-e2e",
  name: "Headless E2E Wallet",
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
  iconBackground: "#111",
  installed: true,
  createConnector: (walletDetails) => {
    const factory = injected({ shimDisconnect: true });
    return createConnector((cfg) => ({
      ...factory(cfg),
      ...walletDetails,
    }));
  },
});

// In E2E mode we need a sepolia-shaped chain (same chainId, RPC fee token,
// ABI conventions) but WITHOUT the Multicall3 address.  The real sepolia chain
// definition ships with contracts.multicall3 = { address: "0xca11b..." }.
// When wagmi uses that definition it tries to batch every useReadContract call
// through the Multicall3 contract — which is NOT deployed on a fresh anvil
// instance.  The batched eth_call returns 0x, viem fails to decode the ABI
// response, and the hook stays in its undefined/loading state forever.
// Clearing contracts on our local chain definition disables multicall
// batching for E2E reads, so each call goes direct to anvil.  (DIV-009 fix.)
const e2eSepoliaChain = {
  ...sepolia,
  contracts: {
    ...sepolia.contracts,
    multicall3: undefined,
  },
} as unknown as typeof sepolia;

// cookieStorage + ssr:true enables the SSR hydration pattern required by
// Next.js App Router. Combined with cookieToInitialState() in layout.tsx and
// <WagmiProvider initialState={...}>, this guarantees that useConnectModal(),
// useAccount(), etc. return their final values on the first client render —
// eliminating the "greyed out button on first load" race condition.
export const config = isE2E
  ? getDefaultConfig({
      appName: "Vetted",
      projectId,
      chains: [e2eSepoliaChain, foundry] as const,
      transports: {
        // In E2E mode, bypass the ranked fallback entirely — the rank probe
        // promotes public sepolia RPCs ahead of localhost:8545 within seconds
        // of page load, causing every useReadContract call to hit a node that
        // has no code at the locally-deployed contract addresses (returns "0x"
        // → UI stays in Loading forever).  A plain http() transport pointing
        // at the local anvil node is deterministic and has no public-RPC
        // attack surface.  (DIV-009 fix — production is unchanged.)
        [sepolia.id]: foundryTransport,
        [foundry.id]: foundryTransport,
      },
      // E2E: append a "Testing" group with our headless wallet. The default
      // Popular wallets stay so the prod-style UI still renders if needed.
      wallets: [
        {
          groupName: "Testing",
          wallets: [headlessE2eWallet],
        },
      ],
      ssr: true,
      storage: createStorage({
        storage: cookieStorage,
      }),
    })
  : getDefaultConfig({
      appName: "Vetted",
      projectId,
      chains: [sepolia] as const,
      transports: {
        [sepolia.id]: sepoliaTransport,
      },
      ssr: true,
      storage: createStorage({
        storage: cookieStorage,
      }),
    });
