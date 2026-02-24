"use client";

import { AppShell } from "@/components/layout/AppShell";
import { browseSidebarConfig } from "@/components/layout/sidebar-config";

export default function GuildsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell config={browseSidebarConfig}>{children}</AppShell>;
}
