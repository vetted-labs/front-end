import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: { label: string; status?: "positive" | "negative" | "warning" | "info" | "neutral" | "pending" };
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, badge, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          {badge && (
            <div className="mb-3">
              <StatusBadge status={badge.status ?? "info"} label={badge.label} />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
