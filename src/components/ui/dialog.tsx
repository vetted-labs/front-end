"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined);

function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within a Dialog");
  }
  return context;
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  // eslint-disable-next-line no-restricted-syntax -- body overflow depends on open runtime value
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function DialogContent({ children, className, "aria-label": ariaLabel }: DialogContentProps) {
  const { open, onOpenChange } = useDialog();
  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<Element | null>(null);

  // eslint-disable-next-line no-restricted-syntax -- mount detection for portal rendering
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Animation: toggle visible state with delay on close for exit animation
  // eslint-disable-next-line no-restricted-syntax -- animation timing depends on open runtime value
  React.useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Focus restoration on close
  // eslint-disable-next-line no-restricted-syntax -- must restore focus when visible transitions to false
  React.useEffect(() => {
    if (!visible && !open && previousFocusRef.current) {
      const el = previousFocusRef.current as HTMLElement;
      if (typeof el.focus === "function") {
        el.focus();
      }
      previousFocusRef.current = null;
    }
  }, [visible, open]);

  // Focus first focusable element when opened
  // eslint-disable-next-line no-restricted-syntax -- must focus into dialog after open + visible render
  React.useEffect(() => {
    if (open && visible && contentRef.current) {
      const focusable = contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  }, [open, visible]);

  // Escape key to close + focus trap
  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        return;
      }

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
    [onOpenChange]
  );

  // eslint-disable-next-line no-restricted-syntax -- keyboard listener depends on open runtime value
  React.useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!mounted || (!open && !visible)) return null;

  const isAnimatingIn = open && visible;

  // Portal to document.body so parent transforms (e.g. animate-page-enter)
  // don't break fixed positioning
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity duration-200 ${
          isAnimatingIn ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
          className={cn(
            "relative bg-card rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] border border-border",
            "transition-all duration-200",
            isAnimatingIn
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6 border-b border-border", className)}>
      {children}
    </div>
  );
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn("flex items-center justify-end gap-2 p-6 border-t border-border", className)}>
      {children}
    </div>
  );
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <h2 className={cn("text-xl font-bold text-foreground", className)}>
      {children}
    </h2>
  );
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogDescription({ children, className }: DialogDescriptionProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}
