import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DocsProseProps {
  children: ReactNode;
  className?: string;
}

/**
 * Typography container for doc page body content.
 *
 * All typographic rules live in `globals.css` under `.docs-prose`.
 * This component is a thin wrapper that applies the class so pages
 * get consistent heading, list, code, table, and link styling.
 */
export function DocsProse({ children, className }: DocsProseProps) {
  return <div className={cn("docs-prose", className)}>{children}</div>;
}
