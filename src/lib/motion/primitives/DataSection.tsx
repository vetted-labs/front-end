"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMotion } from "../hooks/useMotion";
import type { ReactNode } from "react";

export interface DataSectionProps {
  /** Whether the section is still loading data */
  isLoading: boolean;
  /** @deprecated No longer rendered — kept for API compat */
  skeleton?: ReactNode;
  /** Real content rendered once data is available */
  children: ReactNode;
  /** Optional className on the outer wrapper */
  className?: string;
}

/**
 * Renders nothing while loading, then smoothly fades + slides in the real
 * content when data arrives. The empty space is filled by the static page
 * chrome (headers, tabs, buttons) that's already visible.
 */
export function DataSection({
  isLoading,
  children,
  className,
}: DataSectionProps) {
  const { duration, prefersReducedMotion } = useMotion();
  const d = prefersReducedMotion ? 0 : duration("normal");

  return (
    <div className={className}>
      <AnimatePresence initial={false}>
        {!isLoading && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: d, ease: "easeOut" }}
            className="flex-1 min-w-0 min-h-0 h-full"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
