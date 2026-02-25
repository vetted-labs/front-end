"use client";

import type { LucideIcon } from "lucide-react";

export interface AuthTab {
  type: string;
  label: string;
  icon: LucideIcon;
}

interface AuthTabSelectorProps {
  tabs: AuthTab[];
  activeType: string;
  onSelect: (type: string) => void;
}

export function AuthTabSelector({ tabs, activeType, onSelect }: AuthTabSelectorProps) {
  return (
    <div className="flex border-b border-border/50 bg-muted/30">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeType === tab.type;
        return (
          <button
            key={tab.type}
            type="button"
            onClick={() => onSelect(tab.type)}
            className={`relative flex-1 flex flex-col items-center gap-1 px-2 py-3.5 text-xs font-medium transition-colors ${
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 inset-x-3 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
