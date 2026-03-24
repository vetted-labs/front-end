"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

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
  const [visible, setVisible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // eslint-disable-next-line no-restricted-syntax -- mount detection for portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // eslint-disable-next-line no-restricted-syntax -- body overflow depends on isOpen runtime value
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Animation: toggle visible state with delay on close for exit animation
  // eslint-disable-next-line no-restricted-syntax -- animation timing depends on isOpen runtime value
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element for restoration
      previousFocusRef.current = document.activeElement;
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Focus restoration on close
  // eslint-disable-next-line no-restricted-syntax -- must restore focus when visible transitions to false
  useEffect(() => {
    if (!visible && !isOpen && previousFocusRef.current) {
      const el = previousFocusRef.current as HTMLElement;
      if (typeof el.focus === "function") {
        el.focus();
      }
      previousFocusRef.current = null;
    }
  }, [visible, isOpen]);

  // Focus first focusable element when opened
  // eslint-disable-next-line no-restricted-syntax -- must focus into modal after open + visible render
  useEffect(() => {
    if (isOpen && visible && contentRef.current) {
      const focusable = contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  }, [isOpen, visible]);

  // Escape key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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

  // eslint-disable-next-line no-restricted-syntax -- keyboard listener depends on isOpen runtime value
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!mounted || (!isOpen && !visible)) return null;

  const sizeStyles = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl"
  };

  const isAnimatingIn = isOpen && visible;

  // Portal to document.body so parent transforms don't break fixed positioning
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity duration-200 ${
          isAnimatingIn ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          {...(title ? { "aria-label": title } : {})}
          className={`relative bg-card/70 backdrop-blur-sm rounded-2xl shadow-xl w-full ${sizeStyles[size]} max-h-[90vh] flex flex-col overflow-hidden border border-border/60 dark:bg-card/40 dark:backdrop-blur-xl dark:border-white/[0.06] transition-all duration-200 ${
            isAnimatingIn
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-semibold text-card-foreground">{title}</h2>
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
        </div>
      </div>
    </div>,
    document.body
  );
}
