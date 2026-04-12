"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  title: string;
  level: 2 | 3;
}

interface DocsOnThisPageProps {
  items: TocItem[];
}

/**
 * Right-rail table of contents with scroll-spy and visual scroll progress.
 *
 * Active heading: primary color + bold.
 * Passed headings: dimmed (opacity-40).
 * Upcoming headings: default muted color.
 */
export function DocsOnThisPage({ items }: DocsOnThisPageProps) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());

  // eslint-disable-next-line no-restricted-syntax -- observes DOM headings for scroll-spy
  useEffect(() => {
    if (typeof window === "undefined" || items.length === 0) return;

    const headingIds = items.map((i) => i.id);
    const headings = headingIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) {
          const id = visible[0].target.id;
          setActiveId(id);
          const idx = headingIds.indexOf(id);
          setPassedIds(new Set(headingIds.slice(0, idx)));
        }
      },
      {
        rootMargin: "-76px 0px -66% 0px",
        threshold: [0, 1],
      }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
        On this page
      </p>
      <ul className="space-y-2">
        {items.map((item) => {
          const isActive = activeId === item.id;
          const isPassed = passedIds.has(item.id);
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cn(
                  "block rounded-sm py-0.5 leading-[1.45] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  item.level === 2 ? "text-[13.5px]" : "pl-4 text-[13px]",
                  isActive && "font-semibold text-primary",
                  isPassed && !isActive && "text-muted-foreground/40",
                  !isPassed && !isActive && "text-muted-foreground/85 hover:text-foreground"
                )}
              >
                {item.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
