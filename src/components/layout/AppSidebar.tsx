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
import { useCompanyNotificationCount } from "@/lib/hooks/useCompanyNotificationCount";
import { useCandidateNotificationCount } from "@/lib/hooks/useCandidateNotificationCount";
import { useMessageCount } from "@/lib/hooks/useMessageCount";
import { useExpertStatus } from "@/lib/hooks/useExpertStatus";
import { cn } from "@/lib/utils";
import type { SidebarConfig } from "./sidebar-config";

interface AppSidebarProps {
  config: SidebarConfig;
}

export function AppSidebar({ config }: AppSidebarProps) {
  const router = useRouter();
  const { isCollapsed, isMobileOpen, hasMounted, toggle, closeMobile } = useSidebar();
  const { address, isConnected } = useAccount();
  const { expertStatus, isHydrated } = useExpertStatus();

  const expertNotificationCount = useNotificationCount(
    address,
    config.variant === "expert" && isConnected && expertStatus === "approved"
  );

  const companyNotificationCount = useCompanyNotificationCount(
    config.variant === "company"
  );

  const candidateNotificationCount = useCandidateNotificationCount(
    config.variant === "candidate"
  );

  const notificationCount = config.variant === "company"
    ? companyNotificationCount
    : config.variant === "candidate"
    ? candidateNotificationCount
    : expertNotificationCount;

  const messageCount = useMessageCount(
    config.variant === "company" || config.variant === "candidate"
  );

  const badgeCounts = { notifications: notificationCount, messages: messageCount };

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
                <span className={cn(
                  "text-[10px] font-medium uppercase tracking-widest pt-0.5",
                  config.variant === "expert" || config.variant === "candidate"
                    ? "text-primary/60"
                    : "text-muted-foreground/40"
                )}>
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
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
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
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-card dark:bg-gradient-to-b dark:from-[hsl(var(--surface-1))] dark:to-[hsl(var(--surface-0))] dark:backdrop-blur-2xl dark:border-primary/10 md:block",
          hasMounted && "transition-[width] duration-300",
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
          "fixed inset-y-0 left-0 z-50 w-52 border-r border-border bg-card dark:bg-gradient-to-b dark:from-[hsl(var(--surface-1))] dark:to-[hsl(var(--surface-0))] dark:backdrop-blur-2xl dark:border-primary/10 transition-transform duration-300 md:hidden",
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
