import { useState, useCallback } from "react";
import { useSignMessage } from "wagmi";
import { blockchainApi } from "@/lib/api";
import { isUserRejection } from "@/lib/blockchain";
import { logger } from "@/lib/logger";

interface PendingSignature {
  signature: string;
  message: string;
}

interface UseWalletVerificationReturn {
  isVerified: boolean | null;
  isChecking: boolean;
  isSigning: boolean;
  error: string | null;
  pendingSignature: PendingSignature | null;
  checkVerification: (address: string) => Promise<boolean>;
  requestVerification: (address: string) => Promise<boolean>;
  signChallenge: (address: string) => Promise<boolean>;
  submitVerification: (address: string) => Promise<boolean>;
}

export function useWalletVerification(): UseWalletVerificationReturn {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSignature, setPendingSignature] = useState<PendingSignature | null>(null);
  const { signMessageAsync } = useSignMessage();

  const checkVerification = useCallback(async (address: string): Promise<boolean> => {
    setIsChecking(true);
    setError(null);
    try {
      const result = await blockchainApi.isWalletVerified(address);
      const verified = result?.verified === true;
      setIsVerified(verified);
      return verified;
    } catch (err) {
      logger.error("Wallet verification check failed", err);
      setError("Unable to check wallet verification status");
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
      const challenge = await blockchainApi.getWalletChallenge(address);
      if (!challenge?.message) {
        throw new Error("Failed to get verification challenge");
      }

      // Step 2: Sign the message with the wallet
      const signature = await signMessageAsync({ message: challenge.message });

      // Step 3: Send signature to backend for verification
      await blockchainApi.verifyWallet(address, signature, challenge.message);

      setIsVerified(true);
      return true;
    } catch (err: unknown) {
      if (isUserRejection(err)) {
        setError("Wallet signature was rejected. You can verify later from your dashboard.");
      } else {
        setError(err instanceof Error ? err.message : "Wallet verification failed");
      }
      return false;
    } finally {
      setIsSigning(false);
    }
  }, [signMessageAsync]);

  // Sign the SIWE challenge without sending to backend (for pre-submit flows)
  const signChallenge = useCallback(async (address: string): Promise<boolean> => {
    setIsSigning(true);
    setError(null);
    try {
      const challenge = await blockchainApi.getWalletChallenge(address);
      if (!challenge?.message) {
        throw new Error("Failed to get verification challenge");
      }
      const signature = await signMessageAsync({ message: challenge.message });
      setPendingSignature({ signature, message: challenge.message });
      return true;
    } catch (err: unknown) {
      if (isUserRejection(err)) {
        setError("Wallet signature was rejected. Please try again.");
      } else {
        setError(err instanceof Error ? err.message : "Wallet verification failed");
      }
      return false;
    } finally {
      setIsSigning(false);
    }
  }, [signMessageAsync]);

  // Send a previously-signed challenge to the backend (after expert row exists)
  const submitVerification = useCallback(async (address: string): Promise<boolean> => {
    if (!pendingSignature) return false;
    try {
      await blockchainApi.verifyWallet(address, pendingSignature.signature, pendingSignature.message);
      setIsVerified(true);
      setPendingSignature(null);
      return true;
    } catch (err) {
      logger.warn("Backend wallet verification failed — will retry on dashboard", err);
      return false;
    }
  }, [pendingSignature]);

  return {
    isVerified,
    isChecking,
    isSigning,
    error,
    pendingSignature,
    checkVerification,
    requestVerification,
    signChallenge,
    submitVerification,
  };
}
