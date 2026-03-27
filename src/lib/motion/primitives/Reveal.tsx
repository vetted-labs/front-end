"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useMotion } from "../hooks/useMotion";
import type { DurationToken } from "../presets";

export interface RevealProps {
  /** Fraction of the element that must be visible to trigger (0-1) */
  threshold?: number;
  /** Only animate once (default true) */
  once?: boolean;
  /** Duration token from presets */
  duration?: DurationToken;
  /** Direction of the fade slide */
  direction?: "up" | "down" | "none";
  /** Slide distance in pixels */
  distance?: number;
  /** Stagger delay in seconds */
  delay?: number;
  /** Extra class names */
  className?: string;
  children: React.ReactNode;
}

/**
 * Scroll-triggered fade-in using Intersection Observer via framer-motion's useInView.
 *
 * Usage:
 *   <Reveal>
 *     <section>Appears as you scroll to it</section>
 *   </Reveal>
 */
export function Reveal({
  threshold = 0.2,
  once = true,
  duration = "normal",
  direction = "up",
  distance = 16,
  delay = 0,
  className,
  children,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: threshold });
  const { duration: getDuration } = useMotion();
  const d = getDuration(duration);

  const yOffset =
    direction === "up" ? distance : direction === "down" ? -distance : 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: yOffset }}
      transition={{ duration: d, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
