"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMotion } from "../hooks/useMotion";
import type { DurationToken } from "../presets";

export interface ExpandProps {
  /** Controls whether the content is visible */
  isOpen: boolean;
  /** Duration token from presets */
  duration?: DurationToken;
  /** Extra class names on the outer wrapper */
  className?: string;
  children: React.ReactNode;
}

/**
 * Animates height from 0 to auto — the clean replacement for `{show && <div>}`.
 *
 * Usage:
 *   <Expand isOpen={isOpen}>
 *     <p>Collapsible content here</p>
 *   </Expand>
 */
export function Expand({
  isOpen,
  duration = "slow",
  className,
  children,
}: ExpandProps) {
  const { duration: getDuration } = useMotion();
  const d = getDuration(duration);

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="expand-content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: d, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
