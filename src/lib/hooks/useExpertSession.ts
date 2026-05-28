"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { blockchainApi, extractApiError } from "@/lib/api";
import { isUserRejection } from "@/lib/blockchain";
import { logger } from "@/lib/logger";

/**
 * Window event dispatched when an expert's session needs to be re-established
 * via a fresh SIWE signature. `apiRequest`'s 401 refresh path emits this when
 * the refresh token is also dead, so `useExpertSession` can transparently
 * re-prompt the wallet.
 */
export const EXPERT_SESSION_RESIGN_EVENT = "expert-session-resign-required";

export type EnsureSessionReason =
  | "no-wallet"
  | "user-rejected"
  | "expert-not-found"
  | "verify-failed"
  | "network"
  | "flag-off";

export interface EnsureSessionResult {
  ok: boolean;
  accessToken?: string;
  expertId?: string;
  error?: string;
  reason?: EnsureSessionReason;
}

export interface UseExpertSessionApi {
  ensureSession: () => Promise<EnsureSessionResult>;
  isSigning: boolean;
}

/**
 * Returns true when the SIWE auth flow is disabled by env flag.
 * Default behavior (flag undefined) is ON so dev/E2E work out of the box.
 * Setting `NEXT_PUBLIC_EXPERT_SIWE_AUTH=false` (or `0`) reverts to the legacy
 * wallet-header-only mutation path during the soft rollout window.
 */
function isSiweAuthDisabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_EXPERT_SIWE_AUTH;
  return flag === "false" || flag === "0";
}

/**
 * Minimal JWT exp decoder — extracts the `exp` (seconds since epoch) claim
 * from a JWT's middle base64url-encoded payload segment. Returns null when
 * the token is malformed or has no `exp`. Intentionally avoids adding a
 * `jwt-decode` dependency since we only need this one field.
 */
function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payloadSegment = parts[1];
    // base64url → base64
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    if (typeof atob !== "function") return null;
    const json = atob(padded);
    const payload = JSON.parse(json) as { exp?: unknown };
    if (typeof payload.exp === "number") return payload.exp;
    return null;
  } catch {
    return null;
  }
}

function isTokenStillValid(token: string, skewSeconds = 30): boolean {
  const exp = decodeJwtExp(token);
  if (exp == null) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return exp > nowSec + skewSeconds;
}

export function useExpertSession(): UseExpertSessionApi {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isSigning, setIsSigning] = useState<boolean>(false);

  // Keep a stable ref to ensureSession so the resign-event listener can call
  // the latest closure without re-binding the listener on every render.
  const ensureSessionRef = useRef<() => Promise<EnsureSessionResult>>(
    async () => ({ ok: false, reason: "network" }),
  );

  const ensureSession = useCallback(async (): Promise<EnsureSessionResult> => {
    // Step 1: legacy escape hatch — flag explicitly off → mutations fall
    // through to the old behavior so we never make today's bug worse during
    // rollout. Default (flag undefined) is ON.
    if (isSiweAuthDisabled()) {
      return { ok: true, reason: "flag-off" };
    }

    // Step 2: reuse a still-valid access token from localStorage.
    if (typeof window !== "undefined") {
      const existing = window.localStorage.getItem("authToken");
      if (existing && isTokenStillValid(existing)) {
        return { ok: true, accessToken: existing };
      }
    }

    // Step 3: must have a connected wallet to sign the challenge.
    if (!address) {
      return { ok: false, reason: "no-wallet" };
    }

    setIsSigning(true);
    try {
      // Step 4: fetch SIWE challenge.
      let challenge: { message: string };
      try {
        challenge = await blockchainApi.getWalletChallenge(address);
      } catch (err) {
        const message = extractApiError(err, "Failed to fetch wallet challenge");
        logger.warn("[useExpertSession] challenge fetch failed", err);
        return { ok: false, reason: "network", error: message };
      }
      if (!challenge?.message) {
        return {
          ok: false,
          reason: "network",
          error: "Wallet challenge response was empty",
        };
      }

      // Step 5: prompt wallet to sign. User-rejection is the common case.
      let signature: string;
      try {
        signature = await signMessageAsync({ message: challenge.message });
      } catch (err) {
        if (isUserRejection(err)) {
          return {
            ok: false,
            reason: "user-rejected",
            error: "Wallet signature was rejected.",
          };
        }
        const message = extractApiError(err, "Wallet signing failed");
        logger.warn("[useExpertSession] signMessageAsync failed", err);
        return { ok: false, reason: "verify-failed", error: message };
      }

      // Step 6: verify signature with backend → receive JWT pair.
      let verifyRes: import("@/types").WalletVerifyResponse;
      try {
        verifyRes = await blockchainApi.verifyWallet(
          address,
          signature,
          challenge.message,
        );
      } catch (err) {
        const message = extractApiError(err, "Wallet verification failed");
        logger.warn("[useExpertSession] verifyWallet failed", err);
        // 404 from the backend = expert row doesn't exist for this wallet.
        const reason: EnsureSessionReason =
          err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404
            ? "expert-not-found"
            : "verify-failed";
        return { ok: false, reason, error: message };
      }

      const accessToken = verifyRes.accessToken ?? verifyRes.token;
      const expert = verifyRes.expert;
      if (!accessToken || !expert?.id || !expert.walletAddress) {
        logger.warn(
          "[useExpertSession] verifyWallet response missing token or expert",
          verifyRes,
        );
        return {
          ok: false,
          reason: "verify-failed",
          error: "Wallet verification response was incomplete.",
        };
      }

      // Step 7: persist session keys read by AuthContext.tsx:46-55.
      if (typeof window !== "undefined") {
        window.localStorage.setItem("authToken", accessToken);
        if (verifyRes.refreshToken) {
          window.localStorage.setItem("refreshToken", verifyRes.refreshToken);
        }
        window.localStorage.setItem("userType", "expert");
        window.localStorage.setItem("expertId", expert.id);
        window.localStorage.setItem(
          "walletAddress",
          expert.walletAddress.toLowerCase(),
        );
        // Avoid the shadowing bug at api.ts:139 where companyAuthToken would
        // be preferred over authToken for refresh-target detection.
        window.localStorage.removeItem("companyAuthToken");

        // Step 8: nudge AuthContext to re-hydrate from the new keys.
        window.dispatchEvent(new Event("auth-token-refreshed"));
      }

      return {
        ok: true,
        accessToken,
        expertId: expert.id,
      };
    } finally {
      setIsSigning(false);
    }
  }, [address, signMessageAsync]);

  // Keep the latest closure available to the window-event listener without
  // re-binding it on every render. Updating the ref inside an effect keeps
  // the react-hooks/refs lint rule happy.
  // eslint-disable-next-line no-restricted-syntax -- ref sync for stable event handler
  useEffect(() => {
    ensureSessionRef.current = ensureSession;
  }, [ensureSession]);

  // Subscribe to the resign event dispatched by apiRequest's 401 refresh
  // failure path. Re-running ensureSession transparently re-prompts for a
  // wallet signature when both access and refresh tokens are dead.
  // eslint-disable-next-line no-restricted-syntax -- subscribes to window event from apiRequest 401 refresh failure
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      // Fire-and-forget; the caller of ensureSession will surface errors via
      // its own UI gate. Any rejection here is logged but not rethrown.
      ensureSessionRef.current().catch((err) => {
        logger.warn("[useExpertSession] resign handler failed", err);
      });
    };
    window.addEventListener(EXPERT_SESSION_RESIGN_EVENT, handler);
    return () => window.removeEventListener(EXPERT_SESSION_RESIGN_EVENT, handler);
  }, []);

  return { ensureSession, isSigning };
}
