"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Search,
  ArrowLeft,
  Shield,
  Users,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DocsThemeToggle } from "./DocsThemeToggle";

interface DocsTopBarProps {
  isMobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  onOpenSearch: () => void;
  hamburgerRef?: React.RefObject<HTMLButtonElement | null>;
}

const PERSONAS = [
  { key: "experts", label: "Experts", icon: Shield, href: "/docs/experts" },
  { key: "candidates", label: "Candidates", icon: Users, href: "/docs/candidates" },
  { key: "companies", label: "Companies", icon: Building2, href: "/docs/companies" },
] as const;

/**
 * Single-row docs header (~60px).
 *
 *   Desktop: [vetted logo] [Experts] [Candidates] [Companies] [Reference] [── search ──] [← back]
 *   Mobile:  [☰] [vetted logo] [search icon]
 */
export function DocsTopBar({
  isMobileNavOpen,
  onToggleMobileNav,
  onOpenSearch,
  hamburgerRef,
}: DocsTopBarProps) {
  const pathname = usePathname() ?? "";
  const currentPersona =
    PERSONAS.find((p) => pathname.includes(`/${p.key}`)) ?? null;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="flex h-[60px] items-center gap-3 px-4 md:px-6">
        {/* Mobile hamburger */}
        <button
          ref={hamburgerRef}
          type="button"
          onClick={onToggleMobileNav}
          aria-expanded={isMobileNavOpen}
          aria-controls="docs-mobile-drawer"
          aria-label={isMobileNavOpen ? "Close navigation" : "Open navigation"}
          className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:hidden"
        >
          {isMobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>

        {/* Logo — real Vetted wordmark */}
        <Link
          href="/docs"
          className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Vetted Docs home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vetted-logo.svg"
            alt="Vetted"
            width={96}
            height={18}
            className="block h-[18px] w-[96px]"
          />
          <span className="hidden rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground md:inline-block">
            Docs
          </span>
        </Link>

        {/* Desktop persona tabs */}
        <nav
          aria-label="Docs sections"
          className="ml-2 hidden items-center gap-0.5 md:flex"
        >
          {PERSONAS.map((p) => {
            const PIcon = p.icon;
            const isActive = currentPersona?.key === p.key;
            return (
              <Link
                key={p.key}
                href={p.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-[60px] items-center gap-1.5 px-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-none",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <PIcon className="h-3.5 w-3.5" />
                {p.label}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-2.5 bottom-0 h-[2px] rounded-full bg-primary"
                  />
                )}
              </Link>
            );
          })}
          <span aria-hidden className="mx-1.5 h-5 w-px bg-border" />
          <Link
            href="/docs/glossary"
            className={cn(
              "relative inline-flex h-[60px] items-center gap-1.5 px-2.5 text-[13px] font-semibold transition-colors",
              pathname.startsWith("/docs/glossary") || pathname.startsWith("/docs/faq")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Reference
            {(pathname.startsWith("/docs/glossary") || pathname.startsWith("/docs/faq")) && (
              <span
                aria-hidden
                className="absolute inset-x-2.5 bottom-0 h-[2px] rounded-full bg-primary"
              />
            )}
          </Link>
        </nav>

        {/* Desktop search — opens palette */}
        <div className="ml-auto hidden md:block">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search the docs — Cmd+K"
            className="group flex h-9 w-[280px] items-center gap-2 rounded-lg bg-muted/50 px-3 text-left text-[13px] text-muted-foreground ring-1 ring-border transition-all hover:bg-muted hover:text-foreground hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">Search…</span>
            <kbd className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Desktop: theme toggle + back to app */}
        <DocsThemeToggle className="hidden md:inline-flex" />
        <Link
          href="/"
          className="hidden shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:inline-flex"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to app
        </Link>

        {/* Mobile: theme toggle + search */}
        <DocsThemeToggle className="ml-auto md:hidden" />
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search the docs"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
