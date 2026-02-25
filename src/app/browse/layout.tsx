"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useSidebarConfig } from "@/lib/hooks/useSidebarConfig";

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  const config = useSidebarConfig();
  return <AppShell config={config}>{children}</AppShell>;
}
