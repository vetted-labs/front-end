import { useAccount, useChainId, useReadContract, useSignTypedData } from "wagmi";
import { useCallback } from "react";
import { VETTED_TOKEN_ABI, CONTRACT_ADDRESSES } from "@/contracts/abis";

/** Deadline for permit signatures — 30 minutes from now */
const PERMIT_DEADLINE_SECONDS = 30 * 60;

/** Result of a successful permit signing */
export interface PermitSignature {
  deadline: bigint;
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
}

/**
 * Reusable hook for EIP-2612 permit signing on the VettedToken.
 *
 * Reads the current nonce for the connected wallet, constructs the EIP-712
 * typed data, signs it via the wallet, and splits the signature into v/r/s.
 */
export function usePermitSignature() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();

  // Read permit nonce for connected wallet
  const { data: nonce, refetch: refetchNonce } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN,
    abi: VETTED_TOKEN_ABI,
    functionName: "nonces",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: false,
      staleTime: 5000,
    },
  });

  /**
   * Sign an EIP-2612 permit granting `spender` an allowance of `amount`.
   * Returns the deadline + v/r/s components needed for on-chain permit calls.
   */
  const signPermit = useCallback(
    async (spender: `0x${string}`, amount: bigint): Promise<PermitSignature> => {
      if (!address) throw new Error("Wallet not connected");
      if (nonce === undefined) throw new Error("Permit nonce not loaded");

      const deadline = BigInt(Math.floor(Date.now() / 1000) + PERMIT_DEADLINE_SECONDS);

      const signature = await signTypedDataAsync({
        domain: {
          name: "Vetted Token",
          version: "1",
          chainId,
          verifyingContract: CONTRACT_ADDRESSES.TOKEN,
        },
        types: {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "Permit",
        message: {
          owner: address,
          spender,
          value: amount,
          nonce: nonce as bigint,
          deadline,
        },
      });

      // Split the 65-byte signature into v, r, s
      const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
      const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
      const v = parseInt(signature.slice(130, 132), 16);

      return { deadline, v, r, s };
    },
    [address, chainId, nonce, signTypedDataAsync]
  );

  return {
    signPermit,
    refetchNonce,
    isReady: address !== undefined && nonce !== undefined,
  };
}
