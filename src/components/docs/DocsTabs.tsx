"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DocsTab {
  label: string;
  content: ReactNode;
}

interface DocsTabsProps {
  tabs: DocsTab[];
  /** Optional small label above the tab strip. */
  label?: string;
  className?: string;
  /** Index of the initially-active tab. */
  defaultIndex?: number;
}

/**
 * Mintlify-style tab group for platform / persona switching inside a single
 * doc page. Use this when the same concept has substantively different steps
 * for different audiences (e.g. MetaMask vs Coinbase Wallet flows).
 *
 * Visual: underline-style tab strip on top, content panel below, no card.
 */
export function DocsTabs({ tabs, label, className, defaultIndex = 0 }: DocsTabsProps) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  return (
    <div className={cn("my-8", className)}>
      {label && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
      )}
      <div role="tablist" className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`docs-tab-panel-${i}`}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "relative inline-flex h-10 items-center px-3 text-[13.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-t-md",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>
      <div
        id={`docs-tab-panel-${activeIndex}`}
        role="tabpanel"
        className="pt-5 text-[15px] leading-[26px] text-foreground/90 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
      >
        {tabs[activeIndex]?.content}
      </div>
    </div>
  );
}
