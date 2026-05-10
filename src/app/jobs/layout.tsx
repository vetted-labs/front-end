"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { browseSidebarConfig } from "@/components/layout/sidebar-config";

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthoring =
    pathname === "/jobs/new" || /^\/jobs\/[^/]+\/edit$/.test(pathname ?? "");

  if (isAuthoring) {
    return <>{children}</>;
  }

  return <AppShell config={browseSidebarConfig}>{children}</AppShell>;
}
