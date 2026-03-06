"use client";

import { useCallback } from "react";
import { parseEther } from "viem";
import { usePermitSignature, type PermitSignature } from "@/lib/hooks/usePermitSignature";

interface UsePermitOrApproveReturn {
  /**
   * Sign an EIP-2612 permit and execute the `withPermit` contract call
   * in a single transaction.
   *
   * @param spender   Contract address that will spend the tokens
   * @param amount    Human-readable token amount (e.g. "100")
   * @param permitAction  Called with the signed permit — should submit the
   *                      `withPermit` transaction and return its hash
   */
  executeWithPermit: (
    spender: `0x${string}`,
    amount: string,
    permitAction: (permit: PermitSignature) => Promise<`0x${string}`>,
  ) => Promise<{ hash: `0x${string}` }>;
}

/**
 * Hook for EIP-2612 permit-based token spending (1 signature + 1 TX).
 *
 * Usage:
 * ```ts
 * const { executeWithPermit } = usePermitOrApprove();
 *
 * const { hash } = await executeWithPermit(spender, amount, async (permit) => {
 *   return await stakeWithPermit(guildId, amount, permit.deadline, permit.v, permit.r, permit.s);
 * });
 * ```
 */
export function usePermitOrApprove(): UsePermitOrApproveReturn {
  const { signPermit } = usePermitSignature();

  const executeWithPermit = useCallback(
    async (
      spender: `0x${string}`,
      amount: string,
      permitAction: (permit: PermitSignature) => Promise<`0x${string}`>,
    ): Promise<{ hash: `0x${string}` }> => {
      const amountWei = parseEther(amount);
      const permit = await signPermit(spender, amountWei);
      const hash = await permitAction(permit);
      return { hash };
    },
    [signPermit],
  );

  return { executeWithPermit };
}
