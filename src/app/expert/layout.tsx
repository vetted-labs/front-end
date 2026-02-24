"use client";

import { AppShell } from "@/components/layout/AppShell";
import { expertSidebarConfig } from "@/components/layout/sidebar-config";

export default function ExpertLayout({ children }: { children: React.ReactNode }) {
  return <AppShell config={expertSidebarConfig}>{children}</AppShell>;
}
