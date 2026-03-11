"use client";

import { SidebarProvider, useSidebar } from "./SidebarProvider";
import { AppSidebar } from "./AppSidebar";
import { MobileTopBar } from "./MobileTopBar";
import { NotificationBell } from "./NotificationBell";
import { CompanyNotificationBell } from "./CompanyNotificationBell";
import { CandidateNotificationBell } from "./CandidateNotificationBell";
import { cn } from "@/lib/utils";
import type { SidebarConfig } from "./sidebar-config";

interface AppShellProps {
  config: SidebarConfig;
  children: React.ReactNode;
}

function ShellContent({ config, children }: AppShellProps) {
  const { isCollapsed, hasMounted } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar config={config} />
      <div
        className={cn(
          "flex flex-1 flex-col",
          hasMounted && "transition-[margin-left] duration-300",
          isCollapsed ? "md:ml-16" : "md:ml-52"
        )}
      >
        <MobileTopBar config={config} />
        {/* Desktop notification bell — fixed position so it's never clipped by overflow */}
        {(config.variant === "expert" || config.variant === "company" || config.variant === "candidate") && (
          <div className="fixed top-4 right-6 z-30 hidden md:block">
            {config.variant === "expert" ? (
              <NotificationBell />
            ) : config.variant === "company" ? (
              <CompanyNotificationBell />
            ) : (
              <CandidateNotificationBell />
            )}
          </div>
        )}
        <main className="relative flex-1 overflow-auto content-gradient min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ config, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <ShellContent config={config}>{children}</ShellContent>
    </SidebarProvider>
  );
}
