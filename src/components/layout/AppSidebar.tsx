"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronsLeft, X } from "lucide-react";
import { useAccount } from "wagmi";
import Image from "next/image";
import { Logo } from "@/components/Logo";
import { useSidebar } from "./SidebarProvider";
import { SidebarNavGroup } from "./SidebarNavGroup";
import { SidebarUserSection } from "./SidebarUserSection";
import { useNotificationCount } from "@/lib/hooks/useNotificationCount";
import { cn } from "@/lib/utils";
import type { SidebarConfig } from "./sidebar-config";

interface AppSidebarProps {
  config: SidebarConfig;
}

export function AppSidebar({ config }: AppSidebarProps) {
  const router = useRouter();
  const { isCollapsed, isMobileOpen, toggle, closeMobile } = useSidebar();
  const { address, isConnected } = useAccount();

  const notificationCount = useNotificationCount(
    address,
    config.variant === "expert" && isConnected
  );

  const badgeCounts = { notifications: notificationCount };

  // Escape key closes mobile drawer
  useEffect(() => {
    if (!isMobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isMobileOpen, closeMobile]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header: logo + collapse toggle */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-border px-4",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {isCollapsed ? (
          <button
            onClick={toggle}
            className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label="Expand sidebar"
          >
            <Image
              src="/Vetted-orange.png"
              alt="Vetted"
              width={24}
              height={24}
              className="w-6 h-6 rounded"
            />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Logo size="sm" onClick={() => router.push("/")} />
              {config.variant !== "browse" && (
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40 pt-0.5">
                  {config.variant === "expert" ? "Expert" : config.variant === "candidate" ? "Candidate" : "Hiring"}
                </span>
              )}
            </div>
            <button
              onClick={toggle}
              className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {config.groups.map((group) => (
          <SidebarNavGroup
            key={group.label}
            group={group}
            badgeCounts={badgeCounts}
          />
        ))}
      </nav>

      {/* Bottom user section */}
      <SidebarUserSection variant={config.variant} />
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-card dark:bg-card/80 dark:backdrop-blur-2xl dark:border-white/[0.06] transition-[width] duration-300 md:block",
          isCollapsed ? "w-16" : "w-52"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-52 border-r border-border bg-card dark:bg-card/80 dark:backdrop-blur-2xl dark:border-white/[0.06] transition-transform duration-300 md:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button for mobile */}
        <button
          onClick={closeMobile}
          className="absolute right-2 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
