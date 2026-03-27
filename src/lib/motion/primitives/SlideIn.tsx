"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useMotion } from "../hooks/useMotion";
import type { SpringPreset } from "../presets";

export interface SlideInProps extends HTMLMotionProps<"div"> {
  /** Edge to slide from */
  from?: "left" | "right" | "top" | "bottom";
  /** Slide distance in pixels */
  distance?: number;
  /** Stagger delay in seconds */
  delay?: number;
  /** Spring preset name */
  spring?: SpringPreset;
}

function getOffset(from: SlideInProps["from"], distance: number) {
  switch (from) {
    case "left":
      return { x: -distance, y: 0 };
    case "right":
      return { x: distance, y: 0 };
    case "top":
      return { x: 0, y: -distance };
    case "bottom":
      return { x: 0, y: distance };
    default:
      return { x: -distance, y: 0 };
  }
}

/**
 * Slides children in from a given direction with spring physics.
 *
 * Usage:
 *   <SlideIn from="left">sidebar</SlideIn>
 *   <SlideIn from="bottom" distance={40} spring="heavy">drawer</SlideIn>
 */
export function SlideIn({
  from = "left",
  distance = 24,
  delay = 0,
  spring = "smooth",
  children,
  ...rest
}: SlideInProps) {
  const { spring: getSpring } = useMotion();
  const offset = getOffset(from, distance);

  return (
    <motion.div
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ ...getSpring(spring), delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
