import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { coinbaseWallet, metaMask } from "wagmi/connectors";

// Only MetaMask and Coinbase Wallet - WalletConnect removed to prevent connection errors
const connectors = [
  metaMask(),
  coinbaseWallet({
    appName: "Vetted",
  }),
];

export const config = createConfig({
  chains: [sepolia],
  connectors,
  multiInjectedProviderDiscovery: false,
  syncConnectedChain: false,
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL, {
      batch: {
        batchSize: 50,
        wait: 50,
      },
      retryCount: 2,
    }),
  },
  ssr: true,
});
