"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMotion } from "../hooks/useMotion";
import type { ReactNode } from "react";

export interface DataSectionProps {
  /** Whether the section is still loading data */
  isLoading: boolean;
  /** Skeleton placeholder shown while loading */
  skeleton: ReactNode;
  /** Real content rendered once data is available */
  children: ReactNode;
  /** Optional className on the outer wrapper */
  className?: string;
}

/**
 * Shows a skeleton placeholder while loading, then smoothly fades + slides
 * in the real content when data arrives. The skeleton disappears instantly
 * so the transition feels snappy.
 *
 * Usage:
 *   <DataSection isLoading={isLoading} skeleton={<SkeletonStatCard />}>
 *     <StatCard label="Reputation" value={350} />
 *   </DataSection>
 */
export function DataSection({
  isLoading,
  skeleton,
  children,
  className,
}: DataSectionProps) {
  const { duration, prefersReducedMotion } = useMotion();
  const d = prefersReducedMotion ? 0 : duration("normal");

  return (
    <div className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={false}
            exit={{ opacity: 0 }}
            transition={{ duration: d * 0.4 }}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: d, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
