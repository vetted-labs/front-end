"use client";

import { ReactNode, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { SPRINGS, DURATIONS } from "@/lib/motion";
import { useMountEffect } from "@/lib/hooks/useMountEffect";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useMountEffect(() => {
    setMounted(true);
  });

  // Store reference to previously focused element when opening
  // eslint-disable-next-line no-restricted-syntax -- must capture focus ref synchronously when isOpen changes
  // We use a ref-tracking pattern: when isOpen transitions to true, save activeElement
  const prevIsOpenRef = useRef(false);
  if (isOpen && !prevIsOpenRef.current) {
    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = "hidden";
  }
  prevIsOpenRef.current = isOpen;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap: Tab / Shift+Tab
      if (e.key === "Tab" && contentRef.current) {
        const focusable = contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  const handleContentAnimationComplete = useCallback(() => {
    // Focus first focusable element after open animation finishes
    if (isOpen && contentRef.current) {
      const focusable = contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  }, [isOpen]);

  const handleExitComplete = useCallback(() => {
    // Restore focus and body overflow after exit animation
    document.body.style.overflow = "unset";
    if (previousFocusRef.current) {
      const el = previousFocusRef.current as HTMLElement;
      if (typeof el.focus === "function") {
        el.focus();
      }
      previousFocusRef.current = null;
    }
  }, []);

  if (!mounted) return null;

  const sizeStyles = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl"
  };

  return createPortal(
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          onKeyDown={handleKeyDown}
        >
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 dark:bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATIONS.fast }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <motion.div
              ref={contentRef}
              role="dialog"
              aria-modal="true"
              {...(title ? { "aria-label": title } : {})}
              className={`relative bg-card rounded-xl shadow-lg border border-border w-full ${sizeStyles[size]} max-h-[90vh] flex flex-col overflow-hidden`}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={SPRINGS.heavy}
              onAnimationComplete={handleContentAnimationComplete}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
                  <h2 className="text-xl font-bold text-card-foreground">{title}</h2>
                  <button
                    onClick={onClose}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className={`flex-1 overflow-y-auto min-h-0 ${title ? "p-4 sm:p-6" : "p-4 sm:p-6 relative"}`}>
                {!title && (
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                )}
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
