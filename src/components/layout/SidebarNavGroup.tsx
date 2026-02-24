"use client";

import { useSidebar } from "./SidebarProvider";
import { SidebarNavItem } from "./SidebarNavItem";
import type { NavGroup } from "./sidebar-config";

interface SidebarNavGroupProps {
  group: NavGroup;
  badgeCounts?: Record<string, number>;
}

export function SidebarNavGroup({ group, badgeCounts }: SidebarNavGroupProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="space-y-1">
      {!isCollapsed && (
        <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {group.label}
        </p>
      )}
      {isCollapsed && <div className="mx-auto my-1 h-px w-8 bg-border" />}
      {group.items.map((item) => (
        <SidebarNavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          badge={item.badge === "notifications" ? badgeCounts?.notifications : undefined}
        />
      ))}
    </div>
  );
}
