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
  chains: [sepolia, mainnet, polygon, arbitrum], // Sepolia first as default since contracts are deployed there
  connectors,
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL),
  },
  ssr: true,
  syncConnectedChain: false,
  multiInjectedProviderDiscovery: false,
});
