"use client";

import { SidebarProvider, useSidebar } from "./SidebarProvider";
import { AppSidebar } from "./AppSidebar";
import { MobileTopBar } from "./MobileTopBar";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils";
import type { SidebarConfig } from "./sidebar-config";

interface AppShellProps {
  config: SidebarConfig;
  children: React.ReactNode;
}

function ShellContent({ config, children }: AppShellProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex min-h-screen">
      <AppSidebar config={config} />
      <div
        className={cn(
          "flex flex-1 flex-col transition-[margin-left] duration-300",
          isCollapsed ? "md:ml-16" : "md:ml-52"
        )}
      >
        <MobileTopBar config={config} />
        {/* Desktop top bar with notification bell */}
        {config.variant === "expert" && (
          <div className="sticky top-0 z-20 hidden h-12 items-center justify-end px-6 md:flex">
            <NotificationBell />
          </div>
        )}
        <main className="flex-1 overflow-auto content-gradient min-h-screen">{children}</main>
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
