"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useMotion } from "../hooks/useMotion";
import type { DurationToken } from "../presets";

export interface FadeInProps extends HTMLMotionProps<"div"> {
  /** Stagger delay in seconds */
  delay?: number;
  /** Duration token from presets */
  duration?: DurationToken;
  /** Direction of the fade slide */
  direction?: "up" | "down" | "none";
  /** Slide distance in pixels */
  distance?: number;
}

/**
 * Fades children in on mount with an optional vertical slide.
 *
 * Usage:
 *   <FadeIn>content</FadeIn>
 *   <FadeIn direction="down" distance={16} delay={0.1}>content</FadeIn>
 */
export function FadeIn({
  delay = 0,
  duration = "normal",
  direction = "up",
  distance = 8,
  children,
  ...rest
}: FadeInProps) {
  const { duration: getDuration } = useMotion();
  const d = getDuration(duration);

  const yOffset =
    direction === "up" ? distance : direction === "down" ? -distance : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: d, delay, ease: "easeOut" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
