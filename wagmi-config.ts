import { http, createConfig } from "wagmi";
import { mainnet, sepolia, polygon, arbitrum } from "wagmi/chains";
import { coinbaseWallet, metaMask } from "wagmi/connectors";

// Only MetaMask and Coinbase Wallet - WalletConnect removed to prevent connection errors
const connectors = [
  metaMask(),
  coinbaseWallet({
    appName: "Vetted",
  }),
];

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, arbitrum],
  connectors,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
  },
  ssr: true,
  syncConnectedChain: false,
  multiInjectedProviderDiscovery: false,
});
