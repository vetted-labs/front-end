"use client";

import { Children, type ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { useMotion } from "../hooks/useMotion";
import type { SpringPreset } from "../presets";

export interface StaggerProps {
  /** Delay between each child's entrance (seconds) */
  staggerDelay?: number;
  /** Spring preset for child animations */
  spring?: SpringPreset;
  /** Items beyond this count appear instantly (performance guard) */
  limit?: number;
  /** Extra class names on the container */
  className?: string;
  children: ReactNode;
}

/**
 * Staggers the entrance of child elements one-by-one.
 *
 * Usage:
 *   <Stagger>
 *     {items.map(item => <Card key={item.id} ... />)}
 *   </Stagger>
 */
export function Stagger({
  staggerDelay = 0.06,
  spring = "smooth",
  limit = 12,
  className,
  children,
}: StaggerProps) {
  const { spring: getSpring, prefersReducedMotion } = useMotion();
  const childArray = Children.toArray(children);

  // Reduced motion — render without animation
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const springConfig = getSpring(spring);

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: springConfig,
    },
  };

  const instantVariants: Variants = {
    hidden: { opacity: 1, y: 0 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {childArray.map((child, i) => (
        <motion.div
          key={i}
          variants={i < limit ? itemVariants : instantVariants}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
