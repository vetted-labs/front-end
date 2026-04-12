"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PatternBackground } from "@/components/ui/pattern-background";
import { DocsTopBar } from "./DocsTopBar";
import { DocsSidebar } from "./DocsSidebar";
import { DocsSearchPalette } from "./DocsSearchPalette";

interface DocsChromeProps {
  children: React.ReactNode;
}

/**
 * Single-row docs chrome (60px header).
 *
 *   Header:     60px  logo + persona tabs + search + back-to-app
 *   Sidebar:    288px sticky below header
 *   Content:    768px centered article column
 *   Right rail: 224px on lg+
 *   Gaps:       48px between columns
 */
export function DocsChrome({ children }: DocsChromeProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // eslint-disable-next-line no-restricted-syntax -- responds to pathname
  useEffect(() => {
    setIsMobileNavOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  // Body scroll lock for the mobile drawer
  // eslint-disable-next-line no-restricted-syntax -- DOM side-effect
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isMobileNavOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMobileNavOpen]);

  // ESC closes drawer
  // eslint-disable-next-line no-restricted-syntax -- keyboard listener
  useEffect(() => {
    if (!isMobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMobileNavOpen]);

  // Cmd+K / Ctrl+K opens the search palette
  // eslint-disable-next-line no-restricted-syntax -- global keyboard shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      {/* Brand pattern background — matches the rest of the app */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <PatternBackground
          mask="none"
          intensity="subtle"
          className="!opacity-[0.45] dark:!opacity-[0.18]"
        />
      </div>

      <div className="relative z-10">
        <DocsTopBar
          isMobileNavOpen={isMobileNavOpen}
          onToggleMobileNav={() => setIsMobileNavOpen((v) => !v)}
          onOpenSearch={() => setIsSearchOpen(true)}
          hamburgerRef={hamburgerRef}
        />

        <div className="mx-auto flex w-full max-w-[1440px]">
          <aside
            aria-label="Documentation sidebar"
            className="sticky top-[60px] hidden h-[calc(100dvh-60px)] w-[288px] shrink-0 overflow-y-auto border-r border-border/40 md:block"
          >
            <DocsSidebar />
          </aside>

          <main id="docs-main" className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>

      <MobileDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        hamburgerRef={hamburgerRef}
      />

      <DocsSearchPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}

function MobileDrawer({
  isOpen,
  onClose,
  hamburgerRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  hamburgerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Focus trap: cycle focus within the drawer when open
  // eslint-disable-next-line no-restricted-syntax -- focus trap needs DOM access
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;

    const drawer = drawerRef.current;
    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Focus the first element when opening
    first.focus();

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    drawer.addEventListener("keydown", trapFocus);
    return () => drawer.removeEventListener("keydown", trapFocus);
  }, [isOpen]);

  // Return focus to hamburger button on close
  // eslint-disable-next-line no-restricted-syntax -- return focus on close
  useEffect(() => {
    if (!isOpen) {
      hamburgerRef.current?.focus();
    }
  }, [isOpen, hamburgerRef]);

  return (
    <>
      <div
        aria-hidden={!isOpen}
        className={cn(
          "fixed inset-0 top-[60px] z-40 bg-foreground/40 backdrop-blur-sm transition-opacity md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        id="docs-mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Documentation mobile menu"
        className={cn(
          "fixed top-[60px] bottom-0 left-0 z-50 w-[288px] overflow-y-auto border-r border-border bg-background shadow-2xl transition-transform duration-200 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Back to app — first item in mobile drawer */}
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-2 border-b border-border px-5 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Link>
        <DocsSidebar onNavigate={onClose} />
      </div>
    </>
  );
}
