import { useAccount } from "wagmi";
import { useAuthContext } from "@/hooks/useAuthContext";
import { readStoredE2EWalletAddress } from "@/lib/e2e-wallet-fallback";

/**
 * Returns the expert's wallet address and connection status.
 * In E2E test mode (NEXT_PUBLIC_E2E_MODE=true), falls back to
 * localStorage auth when wagmi isn't connected.
 */
export function useExpertAccount() {
  const { address: wagmiAddress, isConnected: wagmiConnected, ...rest } = useAccount();
  const auth = useAuthContext();
  const isE2E = process.env.NEXT_PUBLIC_E2E_MODE === "true";
  const storedE2EAddress = isE2E ? readStoredE2EWalletAddress() : undefined;

  const address =
    wagmiAddress ||
    (isE2E
      ? ((auth.walletAddress as `0x${string}` | undefined) ?? storedE2EAddress)
      : undefined);
  const isConnected = wagmiConnected || (isE2E && !!address);

  return { address, isConnected, ...rest };
}
