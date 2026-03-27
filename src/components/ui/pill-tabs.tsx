"use client";

import type { ReactNode } from "react";

interface PillTab<T extends string> {
  value: T;
  label: ReactNode;
}

interface PillTabsProps<T extends string> {
  tabs: PillTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
}

export function PillTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  className,
}: PillTabsProps<T>) {
  return (
    <div role="tablist" className={`flex gap-0 overflow-x-auto scrollbar-none ${className ?? ""}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={activeTab === tab.value}
          onClick={() => onTabChange(tab.value)}
          className={`px-5 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
            activeTab === tab.value
              ? "text-primary font-bold border-primary"
              : "text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
