"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { AppShell } from "@/components/layout/AppShell";
import { expertSidebarConfig } from "@/components/layout/sidebar-config";
import { expertApi } from "@/lib/api";

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
  const [checked, setChecked] = useState(false);
  const verifiedRef = useRef(false);

  // Quick localStorage check to block immediately (prevents flash)
  useEffect(() => {
    const status = localStorage.getItem("expertStatus");
    if (status === "pending" && !isAllowedForPending(pathname)) {
      router.replace("/expert/application-pending");
    } else {
      setChecked(true);
    }
  }, [pathname, router]);

  // Reset verification when wallet address changes
  useEffect(() => {
    verifiedRef.current = false;
  }, [address]);

  // Backend verification — source of truth, prevents localStorage tampering
  useEffect(() => {
    if (!address || verifiedRef.current) return;
    verifiedRef.current = true;

    expertApi.getProfile(address).then((result) => {
      const status = result?.status;
      if (status) {
        localStorage.setItem("expertStatus", status);
      }
      if (status === "pending" && !isAllowedForPending(pathname)) {
        router.replace("/expert/application-pending");
      }
    }).catch(() => {
      // 404 or network error — don't block, let page handle it
    });
  }, [address, pathname, router]);

  if (!checked) return null;

  return <AppShell config={expertSidebarConfig}>{children}</AppShell>;
}
