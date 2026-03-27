"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";
import { DURATIONS } from "@/lib/motion";

interface ContentLoaderProps {
  isLoading: boolean;
  fallback: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ContentLoader({ isLoading, fallback, children, className }: ContentLoaderProps) {
  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="skeleton" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: DURATIONS.fast }}>
            {fallback}
          </motion.div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DURATIONS.normal }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
