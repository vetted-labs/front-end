"use client";

import { useAccount } from "wagmi";

export function useRequireWallet() {
  const { address, isConnected } = useAccount();

  return {
    address,
    isConnected,
    ready: isConnected && !!address,
  };
}
