"use client";

import type { LucideIcon } from "lucide-react";
import type { VettedIconName } from "@/components/ui/vetted-icon";
import { VettedIcon } from "@/components/ui/vetted-icon";

export interface AuthTab {
  type: string;
  label: string;
  icon: LucideIcon | VettedIconName;
}

interface AuthTabSelectorProps {
  tabs: AuthTab[];
  activeType: string;
  onSelect: (type: string) => void;
}

export function AuthTabSelector({ tabs, activeType, onSelect }: AuthTabSelectorProps) {
  return (
    <div className="flex border-b border-border bg-muted/30">
      {tabs.map((tab) => {
        const isActive = activeType === tab.type;
        const renderIcon = () => {
          if (typeof tab.icon === "string") {
            return <VettedIcon name={tab.icon} className="w-4 h-4" />;
          }
          const Icon = tab.icon;
          return <Icon className="w-4 h-4" />;
        };
        return (
          <button
            key={tab.type}
            type="button"
            onClick={() => onSelect(tab.type)}
            className={`relative flex-1 flex flex-col items-center gap-2 px-2 py-3.5 text-xs font-medium transition-colors ${
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {renderIcon()}
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
