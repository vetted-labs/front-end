"use client";

import { ReactNode } from "react";

/**
 * Page transition wrapper.
 *
 * Previously used framer-motion fade-in (opacity 0→1, 150ms) which made every
 * page appear blank/invisible for 150ms after navigation — killing perceived
 * speed. Removed the animation entirely so loading.tsx skeletons and page
 * content appear instantly on navigation.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
