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

// Handle WalletConnect errors globally
if (typeof window !== "undefined") {
  // Check if handlers are already installed (store on window to persist across hot reloads)
  if (!(window as any).__walletConnectErrorHandlersInstalled) {
    // Suppress unhandled promise rejections from WalletConnect
    window.addEventListener('unhandledrejection', (event) => {
      const errorMessage = event.reason?.message || String(event.reason);
      const errorStack = event.reason?.stack || '';

      // Check for WalletConnect/WebSocket errors
      if (
        errorMessage.includes("Connection interrupted") ||
        errorMessage.includes("WebSocket") ||
        errorMessage.includes("subscribe") ||
        errorStack.includes("walletconnect") ||
        errorStack.includes("@walletconnect")
      ) {
        event.preventDefault();
        return;
      }
    });

    // Suppress console errors from WalletConnect
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const errorStr = args.join(' ');
      if (
        errorStr.includes("Connection interrupted") ||
        errorStr.includes("WebSocket") ||
        (errorStr.includes("walletconnect") && errorStr.includes("subscribe"))
      ) {
        return; // Silently ignore
      }
      originalError.apply(console, args);
    };

    // Mark as installed
    (window as any).__walletConnectErrorHandlersInstalled = true;
  }
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
