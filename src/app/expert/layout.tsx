"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { AppShell } from "@/components/layout/AppShell";
import { PendingExpertShell } from "@/components/layout/PendingExpertShell";
import { expertSidebarConfig } from "@/components/layout/sidebar-config";
import { expertApi } from "@/lib/api";
import { useExpertStatus } from "@/lib/hooks/useExpertStatus";
import { useAuthContext } from "@/hooks/useAuthContext";

/** Routes a pending expert is allowed to visit */
const PENDING_ALLOWED_PREFIXES = [
  "/expert/application-pending",
  "/expert/apply",
  "/guilds",
];

/** Routes that should always render the chromeless shell (no sidebar) */
const CHROMELESS_PREFIXES = [
  "/expert/application-pending",
  "/expert/apply",
];

function isAllowedForPending(pathname: string) {
  return PENDING_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export default function ExpertLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { address: wagmiAddress, isConnected, status } = useAccount();
  const auth = useAuthContext();
  const expertId = auth.userId;
  // In E2E mode, fall back to localStorage wallet address when wagmi isn't connected
  const isE2E = process.env.NEXT_PUBLIC_E2E_MODE === "true";
  const address = wagmiAddress || (isE2E ? auth.walletAddress : undefined);
  const { expertStatus, isHydrated, setExpertStatus, clearExpertStatus } = useExpertStatus();
  const [checked, setChecked] = useState(false);
  const verifiedRef = useRef(false);

  // Quick check to block immediately (prevents flash) — wait for hydration + wallet reconnection
  // eslint-disable-next-line no-restricted-syntax -- guards route access based on wagmi + expert status
  useEffect(() => {
    if (!isHydrated) return;
    // Wait for wagmi to finish reconnecting before deciding
    if (status === "reconnecting" || status === "connecting") return;

    // Wallet not connected after reconnection settled — redirect to login.
    // Debounce: MetaMask can briefly show "disconnected" before reconnecting,
    // so delay the redirect. If the wallet reconnects in time, cleanup cancels it.
    // In E2E test mode, skip the wallet check — tests use localStorage auth instead.
    if (!isConnected && !address && process.env.NEXT_PUBLIC_E2E_MODE !== "true") {
      const timer = setTimeout(() => {
        setChecked(false);
        router.replace("/auth/login?type=expert");
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (expertStatus === "pending" && !isAllowedForPending(pathname)) {
      router.replace("/expert/application-pending");
    } else {
      setChecked(true);
    }
  }, [pathname, router, expertStatus, isHydrated, status, isConnected, address]);

  // Reset verification when wallet address changes
  // eslint-disable-next-line no-restricted-syntax -- resets verification when wallet changes
  useEffect(() => {
    verifiedRef.current = false;
  }, [address]);

  // Backend verification — source of truth, prevents localStorage tampering
  // Skip in E2E mode — tests use mocked APIs and fake wallet addresses
  // eslint-disable-next-line no-restricted-syntax -- verifies expert status against backend
  useEffect(() => {
    if (isE2E) return;
    if (!address || !expertId || verifiedRef.current || isAllowedForPending(pathname)) return;
    verifiedRef.current = true;

    let cancelled = false;

    expertApi.getProfile(address).then((result) => {
      if (cancelled) return;
      const status = result?.status;
      if (status) {
        setExpertStatus(status);
      }
      if (status === "pending" && !isAllowedForPending(pathname)) {
        router.replace("/expert/application-pending");
      }
    }).catch((err) => {
      if (cancelled) return;
      // No expert profile exists for this wallet — redirect to apply
      if (err?.status === 404) {
        localStorage.removeItem("expertId");
        clearExpertStatus();
        router.replace("/expert/apply");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [address, expertId, pathname, router, setExpertStatus, clearExpertStatus]);

  if (!checked || (!isE2E && (status === "reconnecting" || status === "connecting"))) return null;

  const isChromeless =
    expertStatus === "pending" ||
    CHROMELESS_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    );

  if (isChromeless) {
    return <PendingExpertShell>{children}</PendingExpertShell>;
  }

  return <AppShell config={expertSidebarConfig}>{children}</AppShell>;
}
