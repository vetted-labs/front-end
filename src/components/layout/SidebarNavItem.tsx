"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { useSidebar } from "./SidebarProvider";
import { cn } from "@/lib/utils";

interface SidebarNavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  disabled?: boolean;
  exact?: boolean;
}

export function SidebarNavItem({ href, icon: Icon, label, badge, disabled, exact }: SidebarNavItemProps) {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  if (disabled) {
    return (
      <span
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
          "opacity-40 cursor-not-allowed text-muted-foreground",
          isCollapsed && "justify-center px-2"
        )}
        aria-disabled="true"
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!isCollapsed && <span className="truncate">{label}</span>}
        {isCollapsed && (
          <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md border border-border group-hover:block">
            {label}
          </span>
        )}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />

      {!isCollapsed && (
        <>
          <span className="truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}

      {/* Tooltip when collapsed */}
      {isCollapsed && (
        <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md border border-border group-hover:block">
          {label}
          {badge !== undefined && badge > 0 && (
            <span className="ml-1 text-red-400">({badge})</span>
          )}
        </span>
      )}

      {/* Badge dot when collapsed */}
      {isCollapsed && badge !== undefined && badge > 0 && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
      )}
    </Link>
  );
}
