import { http, createConfig } from "wagmi";
import { mainnet, sepolia, polygon, arbitrum } from "wagmi/chains";
import { coinbaseWallet, metaMask, walletConnect } from "wagmi/connectors";

const projectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "your-project-id";

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, arbitrum],
  connectors: [
    metaMask(),
    coinbaseWallet({
      appName: "Crypto App",
    }),
    walletConnect({
      projectId,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
  },
});
