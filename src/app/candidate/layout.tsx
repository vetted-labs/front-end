"use client";

import { AppShell } from "@/components/layout/AppShell";
import { candidateSidebarConfig } from "@/components/layout/sidebar-config";
import { useSidebarConfig } from "@/lib/hooks/useSidebarConfig";

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  const config = useSidebarConfig(candidateSidebarConfig);
  return <AppShell config={config}>{children}</AppShell>;
}
