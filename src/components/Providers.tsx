"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { ThemeProvider } from "@/lib/theme-provider";
import { config } from "../../wagmi-config";
import "@rainbow-me/rainbowkit/styles.css";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Suppress WalletConnect WebSocket errors
if (typeof window !== "undefined") {
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args) => {
    const errorMessage = args.map(arg => {
      if (arg && typeof arg === 'object') {
        return arg.message || arg.toString();
      }
      return String(arg);
    }).join(' ');

    // Suppress WalletConnect subscription and WebSocket errors
    if (
      errorMessage.includes("Connection interrupted") ||
      errorMessage.includes("WebSocket") ||
      errorMessage.includes("subscribe") ||
      errorMessage.includes("WalletConnect")
    ) {
      return;
    }
    originalError.apply(console, args);
  };

  console.warn = (...args) => {
    const warnMessage = String(args[0] || "");
    if (
      warnMessage.includes("Connection interrupted") ||
      warnMessage.includes("WebSocket")
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ThemeProvider defaultTheme="system" storageKey="vetted-ui-theme">
            {children}
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
