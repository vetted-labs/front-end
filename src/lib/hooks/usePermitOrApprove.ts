"use client";

import { useCallback } from "react";
import { parseEther } from "viem";
import { usePermitSignature, type PermitSignature } from "@/lib/hooks/usePermitSignature";
import { isUserRejection } from "@/lib/blockchain";
import { logger } from "@/lib/logger";

/**
 * Result of `executeWithPermit` — tells the caller which path was taken.
 *
 * - `"permit"` — permit signed + single TX submitted via `permitAction`
 * - `"fallback"` — permit failed for a non-rejection reason; caller should
 *   run its own approve → execute flow
 */
export type PermitResult = "permit" | "fallback";

interface UsePermitOrApproveReturn {
  /**
   * Try the EIP-2612 permit path first. If the wallet rejects the signature,
   * the user-rejection error is re-thrown. If the permit fails for any other
   * reason (unsupported wallet, nonce mismatch, etc.), returns `"fallback"`
   * so the caller can run the traditional approve → execute flow.
   *
   * @param spender   Contract address that will spend the tokens
   * @param amount    Human-readable token amount (e.g. "100")
   * @param permitAction  Called with the signed permit — should submit the
   *                      single `withPermit` transaction and return its hash
   */
  executeWithPermit: (
    spender: `0x${string}`,
    amount: string,
    permitAction: (permit: PermitSignature) => Promise<`0x${string}`>,
  ) => Promise<{ path: PermitResult; hash?: `0x${string}` }>;
}

/**
 * Shared hook that encapsulates the "try permit, fall back to approve" pattern.
 *
 * Usage:
 * ```ts
 * const { executeWithPermit } = usePermitOrApprove();
 *
 * const result = await executeWithPermit(spender, amount, async (permit) => {
 *   return await stakeWithPermit(guildId, amount, permit.deadline, permit.v, permit.r, permit.s);
 * });
 *
 * if (result.path === "fallback") {
 *   // run approve → stake
 * }
 * ```
 */
export function usePermitOrApprove(): UsePermitOrApproveReturn {
  const { signPermit } = usePermitSignature();

  const executeWithPermit = useCallback(
    async (
      spender: `0x${string}`,
      amount: string,
      permitAction: (permit: PermitSignature) => Promise<`0x${string}`>,
    ): Promise<{ path: PermitResult; hash?: `0x${string}` }> => {
      try {
        const amountWei = parseEther(amount);
        const permit = await signPermit(spender, amountWei);
        const hash = await permitAction(permit);
        return { path: "permit", hash };
      } catch (error: unknown) {
        if (isUserRejection(error)) {
          throw error; // Let the caller handle user rejection
        }
        logger.debug("Permit signing failed, falling back to approve+execute", error);
        return { path: "fallback" };
      }
    },
    [signPermit],
  );

  return { executeWithPermit };
}
