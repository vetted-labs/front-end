"use client";

import { AppShell } from "@/components/layout/AppShell";
import { browseSidebarConfig } from "@/components/layout/sidebar-config";
import { HomePage } from "@/components/HomePage";

export default function Home() {
  return (
    <AppShell config={browseSidebarConfig}>
      <HomePage />
    </AppShell>
  );
}
