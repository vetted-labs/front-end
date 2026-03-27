"use client";

import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";
import { ReactNode } from "react";
import { motion } from "framer-motion";
import { DURATIONS } from "@/lib/motion";

interface AlertProps {
  variant?: "error" | "success" | "warning" | "info";
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Alert({ variant = "info", children, onClose, className = "" }: AlertProps) {
  const styles = {
    error: {
      container: "bg-destructive/10 border-destructive/20 text-destructive",
      icon: <XCircle className="w-5 h-5 text-destructive" />
    },
    success: {
      container: "bg-positive/10 border-positive/20 text-positive",
      icon: <CheckCircle2 className="w-5 h-5 text-positive" />
    },
    warning: {
      container: "bg-warning/10 border-warning/20 text-warning",
      icon: <AlertCircle className="w-5 h-5 text-warning" />
    },
    info: {
      container: "bg-primary/10 border-primary/20 text-primary",
      icon: <Info className="w-5 h-5 text-primary" />
    }
  };

  const { container, icon } = styles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATIONS.normal, ease: "easeOut" }}
      className={`p-4 border rounded-lg flex items-start gap-3 ${container} ${className}`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 text-sm">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-current opacity-70 hover:opacity-100"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}
