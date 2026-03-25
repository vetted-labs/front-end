import { useAccount } from "wagmi";
import { useAuthContext } from "@/hooks/useAuthContext";

/**
 * Returns the expert's wallet address and connection status.
 * In E2E test mode (NEXT_PUBLIC_E2E_MODE=true), falls back to
 * localStorage auth when wagmi isn't connected.
 */
export function useExpertAccount() {
  const { address: wagmiAddress, isConnected: wagmiConnected, ...rest } = useAccount();
  const auth = useAuthContext();
  const isE2E = process.env.NEXT_PUBLIC_E2E_MODE === "true";

  const address = wagmiAddress || (isE2E ? (auth.walletAddress as `0x${string}` | undefined) : undefined);
  const isConnected = wagmiConnected || (isE2E && !!auth.walletAddress);

  return { address, isConnected, ...rest };
}
