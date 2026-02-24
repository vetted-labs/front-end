import { useState, useCallback } from "react";
import { useSignMessage } from "wagmi";
import { blockchainApi } from "@/lib/api";

interface UseWalletVerificationReturn {
  isVerified: boolean | null;
  isChecking: boolean;
  isSigning: boolean;
  error: string | null;
  checkVerification: (address: string) => Promise<boolean>;
  requestVerification: (address: string) => Promise<boolean>;
}

export function useWalletVerification(): UseWalletVerificationReturn {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signMessageAsync } = useSignMessage();

  const checkVerification = useCallback(async (address: string): Promise<boolean> => {
    setIsChecking(true);
    setError(null);
    try {
      const result: any = await blockchainApi.isWalletVerified(address);
      const verified = result?.verified === true;
      setIsVerified(verified);
      return verified;
    } catch {
      setIsVerified(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const requestVerification = useCallback(async (address: string): Promise<boolean> => {
    setIsSigning(true);
    setError(null);
    try {
      // Step 1: Get challenge from backend
      const challenge: any = await blockchainApi.getWalletChallenge(address);
      if (!challenge?.message) {
        throw new Error("Failed to get verification challenge");
      }

      // Step 2: Sign the message with the wallet
      const signature = await signMessageAsync({ message: challenge.message });

      // Step 3: Send signature to backend for verification
      await blockchainApi.verifyWallet(address, signature, challenge.message);

      setIsVerified(true);
      return true;
    } catch (err: any) {
      // User rejected the signature request
      if (err?.code === 4001 || err?.message?.includes("User rejected")) {
        setError("Wallet signature was rejected. You can verify later from your dashboard.");
      } else {
        setError(err?.message || "Wallet verification failed");
      }
      return false;
    } finally {
      setIsSigning(false);
    }
  }, [signMessageAsync]);

  return {
    isVerified,
    isChecking,
    isSigning,
    error,
    checkVerification,
    requestVerification,
  };
}
