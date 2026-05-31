"use client";

import { useState, useRef, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGuildIdentity } from "@/lib/guildIdentity";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { ALL_GUILDS_ID } from "./allGuilds";
import type { GuildRecord } from "@/types";

interface MarketplaceGuildSwitcherProps {
  guilds: GuildRecord[];
  value: string | undefined;
  onChange: (guildId: string) => void;
  className?: string;
}

export function MarketplaceGuildSwitcher({
  guilds,
  value,
  onChange,
  className,
}: MarketplaceGuildSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);

  const isAllGuilds = value === ALL_GUILDS_ID;
  const selectedGuild = guilds.find((g) => g.id === value);
  const selectedIdentity = selectedGuild ? getGuildIdentity(selectedGuild.name) : null;
  const triggerLabel = isAllGuilds
    ? "All guilds"
    : selectedIdentity?.shortName ?? "Select guild";

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger — icon tile + label stack + chevron */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "group flex items-center gap-2.5 cursor-pointer pl-1.5 pr-3 py-1.5",
          "rounded-xl border bg-card/40 backdrop-blur-md text-left",
          "transition-all duration-200",
          "hover:bg-card/60",
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
          "dark:bg-white/[0.04] dark:hover:bg-white/[0.07]",
          open
            ? "border-primary/45 ring-2 ring-primary/15 shadow-[0_0_0_1px_rgba(255,106,0,0.08)]"
            : "border-border/60 hover:border-primary/40 dark:border-white/[0.08]"
        )}
      >
        {/* Icon tile — brand gradient, always visible */}
        <span
          className={cn(
            "relative flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0",
            "bg-gradient-to-br from-primary/25 via-primary/12 to-primary/5",
            "ring-1 ring-primary/30",
            "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
          )}
        >
          {selectedIdentity && !isAllGuilds ? (
            <VettedIcon name={selectedIdentity.iconName} className="h-4 w-4 text-primary" />
          ) : (
            <VettedIcon name="guilds" className="h-4 w-4 text-primary/70" />
          )}
        </span>

        {/* Label — guild name only (no "Marketplace" prefix) */}
        <span className="flex items-center leading-none">
          <span className="text-sm font-semibold text-foreground tracking-tight">
            {triggerLabel}
          </span>
        </span>

        <ChevronDown
          className={cn(
            "ml-1 h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-primary"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute left-0 top-full mt-2 z-50 w-[22rem] overflow-hidden",
            "rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl",
            "shadow-2xl shadow-black/30",
            "dark:bg-card/85 dark:border-white/[0.08]",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
          )}
        >
          {/* Header strip */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/40 dark:border-white/[0.06]">
            <span className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Endorsement scope
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/70">
              {guilds.length} {guilds.length === 1 ? "guild" : "guilds"}
            </span>
          </div>

          {/* List */}
          <div className="p-1.5 max-h-80 overflow-y-auto">
            {/* All guilds (cross-guild aggregate) */}
            {(() => {
              const isSelected = isAllGuilds;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(ALL_GUILDS_ID)}
                  className={cn(
                    "group w-full text-left px-2.5 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-150",
                    isSelected
                      ? "bg-primary/[0.08] dark:bg-primary/[0.10]"
                      : "hover:bg-muted/50 dark:hover:bg-white/[0.04]"
                  )}
                >
                  <span
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0",
                      "transition-all duration-150",
                      isSelected
                        ? "bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5 ring-2 ring-primary/45"
                        : "bg-gradient-to-br from-primary/15 via-primary/8 to-primary/3 ring-1 ring-border/60 group-hover:ring-primary/35 dark:ring-white/[0.08]"
                    )}
                  >
                    <VettedIcon
                      name="guilds"
                      className={cn(
                        "h-5 w-5 transition-colors",
                        isSelected ? "text-primary" : "text-primary/70 group-hover:text-primary"
                      )}
                    />
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span
                      className={cn(
                        "text-sm font-semibold leading-tight truncate transition-colors",
                        isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
                      )}
                    >
                      All guilds
                    </span>
                    <span className="mt-0.5 text-[11px] text-muted-foreground/80 truncate">
                      Across every guild you belong to
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0 transition-all",
                      isSelected
                        ? "bg-primary/15 ring-1 ring-primary/40 opacity-100 scale-100"
                        : "opacity-0 scale-75"
                    )}
                  >
                    <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                  </span>
                </button>
              );
            })()}

            {guilds.map((guild) => {
              const identity = getGuildIdentity(guild.name);
              const isSelected = value === guild.id;

              return (
                <button
                  key={guild.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(guild.id)}
                  className={cn(
                    "group w-full text-left px-2.5 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-150",
                    isSelected
                      ? "bg-primary/[0.08] dark:bg-primary/[0.10]"
                      : "hover:bg-muted/50 dark:hover:bg-white/[0.04]"
                  )}
                >
                  {/* Icon tile */}
                  <span
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0",
                      "transition-all duration-150",
                      isSelected
                        ? "bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5 ring-2 ring-primary/45"
                        : "bg-gradient-to-br from-primary/15 via-primary/8 to-primary/3 ring-1 ring-border/60 group-hover:ring-primary/35 dark:ring-white/[0.08]"
                    )}
                  >
                    <VettedIcon
                      name={identity.iconName}
                      className={cn(
                        "h-5 w-5 transition-colors",
                        isSelected ? "text-primary" : "text-primary/70 group-hover:text-primary"
                      )}
                    />
                  </span>

                  {/* Name + description */}
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span
                      className={cn(
                        "text-sm font-semibold leading-tight truncate transition-colors",
                        isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
                      )}
                    >
                      {identity.shortName}
                    </span>
                    <span className="mt-0.5 text-[11px] text-muted-foreground/80 truncate">
                      {identity.displayName}
                    </span>
                  </span>

                  {/* Check */}
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0 transition-all",
                      isSelected
                        ? "bg-primary/15 ring-1 ring-primary/40 opacity-100 scale-100"
                        : "opacity-0 scale-75"
                    )}
                  >
                    <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
