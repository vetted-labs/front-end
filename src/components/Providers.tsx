"use client";

import { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, cookieToInitialState } from "wagmi";
import {
  connect,
  disconnect,
  signMessage,
  getAccount,
  readContract,
} from "wagmi/actions";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { ThemeProvider, useTheme } from "@/lib/theme-provider";
import { MotionProvider } from "@/lib/motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { installBrowserHeadlessWallet } from "@/lib/e2e/browser-headless-wallet";
import { config } from "../../wagmi-config";
import "@rainbow-me/rainbowkit/styles.css";
import { sepolia } from "wagmi/chains";
import { Toaster } from "sonner";

installBrowserHeadlessWallet();

// E2E-only escape hatch: expose wagmi config + actions on window so the
// headless-wallet Playwright suite can drive wagmi directly via the injected
// connector, bypassing RainbowKit's modal (whose EIP-6963 detection has
// timing quirks against a Playwright-injected provider). Only active when
// NEXT_PUBLIC_E2E_MODE=true; production bundles are unaffected.
if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_E2E_MODE === "true"
) {
  (window as unknown as { __wagmiTest?: unknown }).__wagmiTest = {
    config,
    connect,
    disconnect,
    signMessage,
    getAccount,
    readContract,
  };
}

/** Renders Sonner's Toaster with the app's resolved theme so toasts match dark/light mode. */
function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme === "dark" ? "dark" : theme === "light" ? "light" : "system"} richColors closeButton />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
      gcTime: 5 * 60_000,
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
  /**
   * Raw `Cookie` header string forwarded from the server RSC render. We call
   * cookieToInitialState() here (in a client module) instead of in layout.tsx,
   * because the wagmi config transitively imports RainbowKit's getDefaultConfig
   * which is a client-only module and cannot be evaluated in a server component.
   *
   * Hydrating wagmi with the cookie state guarantees that useAccount(),
   * useConnectModal(), etc. return their final values on the first client
   * render — eliminating the "disabled button on initial load" race condition.
   */
  cookieHeader?: string | null;
}

export function Providers({ children, cookieHeader }: ProvidersProps) {
  const initialWagmiState = useMemo(
    () => cookieToInitialState(config, cookieHeader ?? undefined),
    [cookieHeader]
  );

  return (
    <WagmiProvider config={config} initialState={initialWagmiState}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={sepolia}>
          <ThemeProvider defaultTheme="dark" storageKey="vetted-ui-theme">
            <ThemedToaster />
            <MotionProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </MotionProvider>
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
