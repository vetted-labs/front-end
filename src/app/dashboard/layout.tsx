"use client";

import { AppShell } from "@/components/layout/AppShell";
import { companySidebarConfig } from "@/components/layout/sidebar-config";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell config={companySidebarConfig}>{children}</AppShell>;
}
