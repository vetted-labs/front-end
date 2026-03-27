"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useMotion } from "../hooks/useMotion";
import type { SpringPreset } from "../presets";
import { SPRINGS } from "../presets";

// eslint-disable-next-line no-restricted-syntax -- syncing spring target with changing `value` prop requires useEffect
import { useEffect } from "react";

export interface CounterProps {
  /** The target number to animate to */
  value: number;
  /** Number formatting mode */
  format?: "number" | "currency" | "percent";
  /** Spring preset for the animation */
  spring?: SpringPreset;
  /** Extra class names */
  className?: string;
}

function formatValue(n: number, format: CounterProps["format"]): string {
  const rounded = Math.round(n);
  switch (format) {
    case "currency":
      return `$${rounded.toLocaleString()}`;
    case "percent":
      return `${rounded.toLocaleString()}%`;
    default:
      return rounded.toLocaleString();
  }
}

/**
 * Animated number that springs from the old value to the new value.
 *
 * Usage:
 *   <Counter value={totalEarnings} format="currency" />
 *   <Counter value={reputation} />
 */
export function Counter({
  value,
  format = "number",
  spring = "snappy",
  className,
}: CounterProps) {
  const { prefersReducedMotion } = useMotion();

  const motionValue = useMotionValue(value);
  const springValue = useSpring(motionValue, SPRINGS[spring]);
  const display = useTransform(springValue, (v) => formatValue(v, format));

  // eslint-disable-next-line no-restricted-syntax -- syncing motion value with changing prop
  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  // Reduced motion — static text
  if (prefersReducedMotion) {
    return <span className={className}>{formatValue(value, format)}</span>;
  }

  return <motion.span className={className}>{display}</motion.span>;
}
