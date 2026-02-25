"use client";

import { useState, useRef, useCallback } from "react";
import { Shield, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGuildIcon } from "@/lib/guildHelpers";
import { useClickOutside } from "@/lib/hooks/useClickOutside";

export interface GuildOption {
  id: string;
  name: string;
}

interface GuildSelectorProps {
  guilds: GuildOption[];
  value: string;
  onChange: (guildId: string) => void;
  allLabel?: string;
  className?: string;
  /** Compact variant for inline filter bars */
  size?: "default" | "sm";
}

export function GuildSelector({
  guilds,
  value,
  onChange,
  allLabel = "All Guilds",
  className,
  size = "default",
}: GuildSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);

  const selectedGuild = guilds.find((g) => g.id === value);
  const label = value === "all" ? allLabel : selectedGuild?.name ?? allLabel;

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 cursor-pointer",
          "rounded-full border border-border/60 bg-card/40 backdrop-blur-md",
          "text-foreground font-medium",
          "transition-all duration-200",
          "hover:border-primary/40 hover:bg-card/60",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
          "dark:bg-white/[0.04] dark:border-white/[0.08] dark:hover:bg-white/[0.06] dark:hover:border-primary/30",
          size === "sm"
            ? "pl-3 pr-2.5 py-1.5 text-xs"
            : "pl-3.5 pr-3 py-2 text-sm"
        )}
        aria-label={allLabel}
        aria-expanded={open}
      >
        <Shield
          className={cn(
            "text-muted-foreground flex-shrink-0",
            size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"
          )}
        />
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn(
            "text-muted-foreground flex-shrink-0 transition-transform duration-200",
            open && "rotate-180",
            size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-xl dark:bg-card/80 dark:border-white/[0.08] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="p-1.5 max-h-64 overflow-y-auto space-y-0.5">
            {/* All guilds option */}
            <button
              type="button"
              onClick={() => handleSelect("all")}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors",
                value === "all"
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50 text-foreground"
              )}
            >
              <div className="w-8 h-8 rounded-lg border border-border/60 bg-muted/50 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="flex-1 text-sm font-medium">{allLabel}</span>
              {value === "all" && (
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </button>

            {/* Guild options */}
            {guilds.map((guild) => {
              const GuildIcon = getGuildIcon(guild.name);
              const isSelected = value === guild.id;

              return (
                <button
                  key={guild.id}
                  type="button"
                  onClick={() => handleSelect(guild.id)}
                  className={cn(
                    "group w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50 text-foreground"
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/10 border border-border/60 flex items-center justify-center flex-shrink-0">
                    <GuildIcon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="flex-1 text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {guild.name}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
