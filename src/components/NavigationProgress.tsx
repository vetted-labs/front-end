"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin progress bar at the top of the viewport that gives immediate feedback
 * when navigating between routes. Starts on link click, completes when the
 * new route renders.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "completing">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Track current URL so we know when navigation completes
  const currentUrl = useRef(`${pathname}?${searchParams}`);

  const startLoading = useCallback(() => {
    // Small delay so instant navigations (cached routes) don't flash the bar
    startTimeoutRef.current = setTimeout(() => {
      setState("loading");
    }, 120);
  }, []);

  // Listen for click on <a> tags (Next.js Link renders as <a>)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return;

      // Don't trigger for same-page links
      const url = new URL(href, window.location.origin);
      if (url.pathname === pathname && url.search === window.location.search) return;

      // Don't trigger if modifier keys (new tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      startLoading();
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, [pathname, startLoading]);

  // When pathname/searchParams change, the new route has rendered — complete the bar
  useEffect(() => {
    const newUrl = `${pathname}?${searchParams}`;
    if (newUrl === currentUrl.current) return;
    currentUrl.current = newUrl;

    // Clear the start delay if navigation was instant
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = undefined;
    }

    if (state === "loading") {
      setState("completing");
      timeoutRef.current = setTimeout(() => setState("idle"), 300);
    } else {
      setState("idle");
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === "idle") return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px]">
      <div
        className={`h-full bg-primary origin-left ${
          state === "loading"
            ? "animate-nav-progress"
            : "animate-nav-complete"
        }`}
      />
    </div>
  );
}
