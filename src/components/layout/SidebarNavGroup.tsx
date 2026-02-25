"use client";

import { useSidebar } from "./SidebarProvider";
import { SidebarNavItem } from "./SidebarNavItem";
import type { NavGroup } from "./sidebar-config";

/** Hrefs that remain enabled even when the expert's application is pending */
const EXPERT_PENDING_ALLOWED_HREFS = new Set([
  "/expert/application-pending",
]);

interface SidebarNavGroupProps {
  group: NavGroup;
  badgeCounts?: Record<string, number>;
  isExpertPending?: boolean;
}

export function SidebarNavGroup({ group, badgeCounts, isExpertPending }: SidebarNavGroupProps) {
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
          badge={item.badge ? badgeCounts?.[item.badge] : undefined}
          disabled={isExpertPending && !EXPERT_PENDING_ALLOWED_HREFS.has(item.href)}
          exact={item.exact}
        />
      ))}
    </div>
  );
}
