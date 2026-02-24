"use client";

import { useEffect, RefObject } from "react";

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  active = true
) {
  useEffect(() => {
    if (!active) return;

    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };

    document.addEventListener("click", listener);
    return () => document.removeEventListener("click", listener);
  }, [ref, handler, active]);
}
