"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui/loadingstate";

export function RouteChangeOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const isFirst = useRef(true);
  const timeoutRef = useRef<number | null>(null);
  const fallbackRef = useRef<number | null>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    if (!pendingRef.current) return;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      pendingRef.current = false;
      setActive(false);
    }, 350);
  }, [pathname, searchParams?.toString()]);

  useEffect(() => {
    const showOverlay = () => {
      pendingRef.current = true;
      setActive(true);

      if (fallbackRef.current) {
        window.clearTimeout(fallbackRef.current);
      }

      fallbackRef.current = window.setTimeout(() => {
        pendingRef.current = false;
        setActive(false);
      }, 1500);
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      const link = target.closest("a");
      if (!link) return;
      if (link.getAttribute("target") === "_blank") return;
      if (link.hasAttribute("download")) return;
      if (link.getAttribute("data-no-loading") === "true") return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const isExternal =
        href.startsWith("http") && !href.startsWith(window.location.origin);
      if (isExternal) return;

      showOverlay();
    };

    const handlePopState = () => {
      showOverlay();
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  if (!active) return null;

  return <LoadingState message="Switching views..." />;
}
