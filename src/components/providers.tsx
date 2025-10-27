"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Wallet providers temporarily disabled - will be re-enabled for experts flow
// import { WagmiProvider } from "wagmi";
// import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
// import { config } from "../../wagmi-config";
// import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
