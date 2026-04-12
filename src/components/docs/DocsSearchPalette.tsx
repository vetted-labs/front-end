"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, CornerDownLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchDocs, getAllEntries } from "@/lib/docs-search";
import type { FuseResultMatch } from "fuse.js";

interface DocsSearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DisplayItem {
  title: string;
  description: string;
  href: string;
  persona: string;
  /** Fuse match data for title field — used for substring highlighting. */
  titleMatches?: readonly [number, number][];
}

const PERSONA_LABELS: Record<string, string> = {
  experts: "Experts",
  candidates: "Candidates",
  companies: "Companies",
  shared: "General",
};

const PERSONA_ORDER = ["shared", "experts", "candidates", "companies"];

/** Extract match indices for a specific key from Fuse result matches. */
function getMatchIndices(
  matches: readonly FuseResultMatch[] | undefined,
  key: string
): readonly [number, number][] | undefined {
  if (!matches) return undefined;
  const match = matches.find((m) => m.key === key);
  if (!match?.indices?.length) return undefined;
  return match.indices as readonly [number, number][];
}

function toDisplayItems(query: string): DisplayItem[] {
  if (!query || query.length < 2) {
    return getAllEntries()
      .slice(0, 8)
      .map((e) => ({
        title: e.title,
        description: e.description,
        href: e.href,
        persona: e.persona,
      }));
  }

  const results = searchDocs(query);
  return results.map((r) => ({
    title: r.item.title,
    description: r.item.description,
    href: r.item.href,
    persona: r.item.persona,
    titleMatches: getMatchIndices(r.matches, "title"),
  }));
}

/** Highlight matched character ranges in text using Fuse.js match indices. */
function highlightMatch(
  text: string,
  indices: readonly [number, number][] | undefined
): React.ReactNode {
  if (!indices || indices.length === 0) return text;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const [start, end] of indices) {
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }
    parts.push(
      <mark
        key={start}
        className="rounded-[2px] bg-primary/20 px-[1px] text-inherit"
      >
        {text.slice(start, end + 1)}
      </mark>
    );
    lastIndex = end + 1;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/** Group items by persona, maintaining the order within each group. */
function groupByPersona(items: DisplayItem[]): { persona: string; label: string; items: DisplayItem[] }[] {
  const groups: Record<string, DisplayItem[]> = {};
  for (const item of items) {
    (groups[item.persona] ??= []).push(item);
  }
  return PERSONA_ORDER
    .filter((p) => groups[p]?.length)
    .map((p) => ({
      persona: p,
      label: PERSONA_LABELS[p] ?? p,
      items: groups[p],
    }));
}

/**
 * Cmd+K search palette with Fuse.js fuzzy matching.
 * Indexes page titles, headings, descriptions, and keywords.
 * Results grouped by persona.
 */
export function DocsSearchPalette({ isOpen, onClose }: DocsSearchPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => toDisplayItems(query), [query]);
  const groups = useMemo(() => groupByPersona(items), [items]);

  // Reset state when opening
  // eslint-disable-next-line no-restricted-syntax -- responds to prop
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Clamp active index when results change
  // eslint-disable-next-line no-restricted-syntax -- derived index guard
  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(0);
  }, [items.length, activeIndex]);

  // Keyboard navigation
  // eslint-disable-next-line no-restricted-syntax -- keyboard listener
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const target = items[activeIndex];
        if (target) {
          router.push(target.href);
          onClose();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, items, activeIndex, router, onClose]);

  // Body scroll lock
  // eslint-disable-next-line no-restricted-syntax -- DOM side-effect
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build a flat index for keyboard navigation (used to map activeIndex → item)
  let flatIdx = 0;

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-label="Search docs"
      className="fixed inset-0 z-[60] flex items-start justify-center bg-foreground/30 backdrop-blur-sm pt-[10vh] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the docs…"
            className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Search query"
          />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="mt-2 text-[12px] text-muted-foreground/70">
                Try &ldquo;quickstart&rdquo;, &ldquo;voting&rdquo;, or &ldquo;endorsements&rdquo;
              </p>
            </div>
          ) : (
            <ul role="listbox">
              {groups.map((group) => (
                <li key={group.persona} role="presentation">
                  <p className="px-3 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                    {group.label}
                  </p>
                  <ul role="group" aria-label={group.label}>
                    {group.items.map((item) => {
                      const idx = flatIdx++;
                      const isActive = idx === activeIndex;
                      return (
                        <li key={item.href} role="option" aria-selected={isActive}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                              isActive ? "bg-primary/10" : "hover:bg-muted"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "text-[14px] leading-5 truncate",
                                  isActive
                                    ? "font-semibold text-primary"
                                    : "text-foreground"
                                )}
                              >
                                {highlightMatch(item.title, item.titleMatches)}
                              </p>
                              <p className="truncate text-[11.5px] text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                            <ArrowRight
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 transition-opacity",
                                isActive
                                  ? "text-primary opacity-100"
                                  : "text-muted-foreground opacity-40"
                              )}
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Hint footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>
                <CornerDownLeft className="h-2.5 w-2.5" />
              </Kbd>
              open
            </span>
            <span className="flex items-center gap-1">
              <Kbd>esc</Kbd>
              close
            </span>
          </div>
          <span className="text-muted-foreground/70">
            {items.length} result{items.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border bg-background px-1 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}
