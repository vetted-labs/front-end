"use client";

import { SidebarProvider, useSidebar } from "./SidebarProvider";
import { AppSidebar } from "./AppSidebar";
import { MobileTopBar } from "./MobileTopBar";
import { NotificationBell } from "./NotificationBell";
import { CompanyNotificationBell } from "./CompanyNotificationBell";
import { CandidateNotificationBell } from "./CandidateNotificationBell";
import { cn } from "@/lib/utils";
import { PatternBackground, PatternOpacityToggle } from "@/components/ui/pattern-background";
import type { SidebarConfig } from "./sidebar-config";

interface AppShellProps {
  config: SidebarConfig;
  children: React.ReactNode;
}

function ShellContent({ config, children }: AppShellProps) {
  const { isCollapsed, hasMounted } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Full-page pattern background — behind sidebar only, content has its own bg */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <PatternBackground mask="none" className="!opacity-[0.80] dark:!opacity-[0.28]" />
      </div>
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
        <main className="relative flex-1 overflow-auto min-h-0 content-gradient">
          <div className="relative z-10 h-full">
            {children}
          </div>
        </main>
      </div>
      {process.env.NODE_ENV === "development" && <PatternOpacityToggle />}
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
