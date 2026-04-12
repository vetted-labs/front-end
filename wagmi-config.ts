import { http, cookieStorage, createStorage } from "wagmi";
import { sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

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

// cookieStorage + ssr:true enables the SSR hydration pattern required by
// Next.js App Router. Combined with cookieToInitialState() in layout.tsx and
// <WagmiProvider initialState={...}>, this guarantees that useConnectModal(),
// useAccount(), etc. return their final values on the first client render —
// eliminating the "greyed out button on first load" race condition.
export const config = getDefaultConfig({
  appName: "Vetted",
  projectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL, {
      batch: {
        batchSize: 50,
        wait: 50,
      },
      retryCount: 2,
      timeout: 10_000,
    }),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
