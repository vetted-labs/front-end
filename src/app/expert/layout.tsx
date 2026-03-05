"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { AppShell } from "@/components/layout/AppShell";
import { expertSidebarConfig } from "@/components/layout/sidebar-config";
import { expertApi } from "@/lib/api";
import { useExpertStatus } from "@/lib/hooks/useExpertStatus";

/** Routes a pending expert is allowed to visit */
const PENDING_ALLOWED_PREFIXES = [
  "/expert/application-pending",
  "/expert/apply",
  "/guilds",
];

function isAllowedForPending(pathname: string) {
  return PENDING_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export default function ExpertLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { address } = useAccount();
  const { expertStatus, setExpertStatus, clearExpertStatus } = useExpertStatus();
  const [checked, setChecked] = useState(false);
  const verifiedRef = useRef(false);

  // Quick check to block immediately (prevents flash)
  useEffect(() => {
    if (expertStatus === "pending" && !isAllowedForPending(pathname)) {
      router.replace("/expert/application-pending");
    } else {
      setChecked(true);
    }
  }, [pathname, router, expertStatus]);

  // Reset verification when wallet address changes
  useEffect(() => {
    verifiedRef.current = false;
  }, [address]);

  // Backend verification — source of truth, prevents localStorage tampering
  useEffect(() => {
    if (!address || !localStorage.getItem("expertId") || verifiedRef.current || isAllowedForPending(pathname)) return;
    verifiedRef.current = true;

    expertApi.getProfile(address).then((result) => {
      const status = result?.status;
      if (status) {
        setExpertStatus(status);
      }
      if (status === "pending" && !isAllowedForPending(pathname)) {
        router.replace("/expert/application-pending");
      }
    }).catch((err) => {
      // No expert profile exists for this wallet — redirect to apply
      if (err?.status === 404) {
        localStorage.removeItem("expertId");
        clearExpertStatus();
        router.replace("/expert/apply");
      }
    });
  }, [address, pathname, router, setExpertStatus, clearExpertStatus]);

  if (!checked) return null;

  return <AppShell config={expertSidebarConfig}>{children}</AppShell>;
}
