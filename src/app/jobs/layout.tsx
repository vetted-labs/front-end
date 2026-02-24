"use client";

import { AppShell } from "@/components/layout/AppShell";
import { browseSidebarConfig } from "@/components/layout/sidebar-config";

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell config={browseSidebarConfig}>{children}</AppShell>;
}
