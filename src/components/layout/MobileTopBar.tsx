"use client";

import { Menu } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useRouter } from "next/navigation";
import { useSidebar } from "./SidebarProvider";
import { NotificationBell } from "./NotificationBell";
import type { SidebarConfig } from "./sidebar-config";

interface MobileTopBarProps {
  config?: SidebarConfig;
}

export function MobileTopBar({ config }: MobileTopBarProps) {
  const router = useRouter();
  const { setMobileOpen } = useSidebar();

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-card px-4 md:hidden">
      <button
        onClick={() => setMobileOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="mx-auto">
        <Logo size="sm" onClick={() => router.push("/")} />
      </div>
      {config?.variant === "expert" ? (
        <NotificationBell />
      ) : (
        /* Spacer to keep logo centered */
        <div className="w-9" />
      )}
    </div>
  );
}
