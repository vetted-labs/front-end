"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { AppShell } from "@/components/layout/AppShell";
import { PendingExpertShell } from "@/components/layout/PendingExpertShell";
import {
  expertSidebarConfig,
  restrictedExpertSidebarConfig,
} from "@/components/layout/sidebar-config";
import { expertApi } from "@/lib/api";
import { useExpertStatus } from "@/lib/hooks/useExpertStatus";
import { useAuthContext } from "@/hooks/useAuthContext";
import { isRecentExplicitLogout } from "@/contexts/AuthContext";


/** Routes a restricted expert (pending / rejected) is allowed to visit */
const RESTRICTED_ALLOWED_PREFIXES = [
  "/expert/application-pending",
  "/expert/apply",
  "/guilds",
];

/**
 * Routes that render a full-screen chromeless shell (no sidebar). This is
 * reserved for the onboarding application form itself — every other expert
 * route uses the sidebar layout, including the status page for
 * pending / rejected users.
 */
const CHROMELESS_PREFIXES = ["/expert/apply"];

function isAllowedForRestricted(pathname: string) {
  return RESTRICTED_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

function isChromelessRoute(pathname: string) {
  return CHROMELESS_PREFIXES.some(
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

  // Both "pending" and "rejected" experts are restricted — they can only see
  // the status page, apply flow, and guild browsing. Anything else (dashboard,
  // voting, rewards, etc.) redirects back to the status page.
  const isRestrictedStatus = expertStatus === "pending" || expertStatus === "rejected";

  // Sidebar config picked by status. Defaults to the restricted config until
  // we have confirmed "approved" — this prevents the brief flash of the full
  // expert sidebar during initial hydration / backend verification when
  // localStorage might still hold a stale "approved" value.
  const sidebarConfig =
    expertStatus === "approved" ? expertSidebarConfig : restrictedExpertSidebarConfig;

  // Resolve checked synchronously when possible to avoid an extra render cycle.
  // If hydrated + wallet connected + not restricted → show children immediately.
  const canShow = isHydrated && (isE2E || status !== "reconnecting" && status !== "connecting")
    && (isE2E ? !!address : (isConnected || status === "disconnected"))
    && !isRestrictedStatus;
  const [checked, setChecked] = useState(canShow);
  const verifiedRef = useRef(false);

  // Auth guard — redirect disconnected wallets or restricted experts
  // eslint-disable-next-line no-restricted-syntax -- guards route access based on wagmi + expert status
  useEffect(() => {
    if (!isHydrated) return;
    if (status === "reconnecting" || status === "connecting") return;

    if (!isConnected && !address && !isE2E) {
      // If the user just clicked a logout/disconnect button, skip the debounce
      // and trust the navigation already in flight from that handler.
      if (isRecentExplicitLogout()) return;

      const timer = setTimeout(() => {
        setChecked(false);
        router.replace(`/auth/login?type=expert&redirect=${encodeURIComponent(pathname)}`);
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (isRestrictedStatus && !isAllowedForRestricted(pathname)) {
      router.replace("/expert/application-pending");
    } else {
      setChecked(true);
    }
  }, [pathname, router, expertStatus, isRestrictedStatus, isHydrated, status, isConnected, address]);

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
    if (!address || !expertId || verifiedRef.current) return;
    verifiedRef.current = true;

    let cancelled = false;

    expertApi.getProfile(address).then((result) => {
      if (cancelled) return;
      const resolvedStatus = result?.status;
      if (resolvedStatus) {
        setExpertStatus(resolvedStatus);
      }
      if (
        (resolvedStatus === "pending" || resolvedStatus === "rejected") &&
        !isAllowedForRestricted(pathname)
      ) {
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

  // /expert/apply is a full-screen onboarding form with its own chrome.
  // Render it without the sidebar, regardless of expert status.
  if (isChromelessRoute(pathname)) {
    return <PendingExpertShell>{children}</PendingExpertShell>;
  }

  // Synchronous route-access check — runs on every render, NOT inside a
  // useEffect. This is what prevents the "dashboard flashes before redirect"
  // bug: if a restricted user is on a forbidden route, we render the shell
  // but suppress children until the useEffect redirect lands them on the
  // status page. React never commits the forbidden page to the DOM.
  const isForbiddenRoute =
    isRestrictedStatus && !isAllowedForRestricted(pathname);

  // While the wallet is reconnecting or the auth guard hasn't settled, we
  // render AppShell with the restricted config (safe default) so the user
  // never sees a full-access sidebar they're not entitled to.
  const isWaitingForAuth =
    !checked || (!isE2E && (status === "reconnecting" || status === "connecting"));

  // Suppress children if:
  //  1. The user is in a restricted status on a forbidden route (redirect
  //     is being handled by the useEffect above), OR
  //  2. We haven't finished verifying auth yet and localStorage status is
  //     unknown — avoids rendering any privileged page content speculatively.
  const shouldSuppressChildren =
    isForbiddenRoute || (isWaitingForAuth && !isRestrictedStatus && expertStatus !== "approved");

  const activeConfig = isWaitingForAuth ? restrictedExpertSidebarConfig : sidebarConfig;

  return (
    <AppShell config={activeConfig}>
      {shouldSuppressChildren ? null : children}
    </AppShell>
  );
}
