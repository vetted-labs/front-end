"use client";

import { useState, type MouseEvent } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewTransitionDoc = Document & {
  startViewTransition?: (callback: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

const DURATION_TO_DARK_MS = 620;
const DURATION_TO_LIGHT_MS = 540;
const THEME_REVEAL_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

/**
 * Dark/light mode toggle for the docs chrome.
 * Reads system preference on first load, then persists choice to localStorage.
 */
export function DocsThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;

    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    return stored === "dark" || (!stored && prefersDark);
  });

  function applyDocsTheme(nextIsDark: boolean) {
    setIsDark(nextIsDark);
    document.documentElement.classList.toggle("dark", nextIsDark);
    document.documentElement.style.colorScheme = nextIsDark ? "dark" : "light";
    localStorage.setItem("theme", nextIsDark ? "dark" : "light");
  }

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const next = !isDark;
    const doc = document as ViewTransitionDoc;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!doc.startViewTransition || reduceMotion) {
      applyDocsTheme(next);
      return;
    }

    const root = document.documentElement;
    const origin = { x: event.clientX, y: event.clientY };
    const endRadius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y)
    );

    root.classList.add(next ? "theme-going-dark" : "theme-going-light");

    const transition = doc.startViewTransition(() => {
      applyDocsTheme(next);
    });

    transition.ready
      .then(() => {
        root.animate(
          {
            clipPath: next
              ? [
                  `circle(0px at ${origin.x}px ${origin.y}px)`,
                  `circle(${endRadius}px at ${origin.x}px ${origin.y}px)`,
                ]
              : [
                  `circle(${endRadius}px at ${origin.x}px ${origin.y}px)`,
                  `circle(0px at ${origin.x}px ${origin.y}px)`,
                ],
          },
          {
            duration: next ? DURATION_TO_DARK_MS : DURATION_TO_LIGHT_MS,
            easing: THEME_REVEAL_EASING,
            fill: "forwards",
            pseudoElement: next
              ? "::view-transition-new(root)"
              : "::view-transition-old(root)",
          }
        );
      })
      .catch(() => {
        // Rapid toggles can abort the transition; the theme state has already
        // been committed inside startViewTransition.
      });

    transition.finished.finally(() => {
      root.classList.remove("theme-going-dark", "theme-going-light");
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
