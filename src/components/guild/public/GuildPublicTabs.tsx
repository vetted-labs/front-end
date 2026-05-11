"use client";

import type { ReactNode } from "react";

export interface PublicTabConfig<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface GuildPublicTabsProps<T extends string> {
  tabs: PublicTabConfig<T>[];
  active: T;
  onChange: (value: T) => void;
  /** Right-side meta line (e.g. "Updated 2m ago"). */
  meta?: ReactNode;
}

/**
 * Public guild page tab row. Active tab uses brand-orange underline (NOT
 * guild color). Counts render in pill chips that switch to orange tint when
 * the tab is active.
 */
export function GuildPublicTabs<T extends string>({
  tabs,
  active,
  onChange,
  meta,
}: GuildPublicTabsProps<T>) {
  return (
    <div className="flex items-end justify-between border-b border-surface-border mb-6 px-1">
      <div className="flex gap-1.5 -mb-px overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = tab.value === active;
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "text-foreground border-primary font-semibold"
                  : "text-muted-foreground border-transparent hover:text-foreground font-medium"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                    isActive
                      ? "bg-primary/[0.12] text-primary"
                      : "bg-surface-2 text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {meta && (
        <div className="text-xs text-muted-foreground hidden md:flex items-center gap-3 pb-3.5">
          {meta}
        </div>
      )}
    </div>
  );
}
