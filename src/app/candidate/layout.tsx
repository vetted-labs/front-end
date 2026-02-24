"use client";

import { AppShell } from "@/components/layout/AppShell";
import { candidateSidebarConfig } from "@/components/layout/sidebar-config";

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return <AppShell config={candidateSidebarConfig}>{children}</AppShell>;
}
