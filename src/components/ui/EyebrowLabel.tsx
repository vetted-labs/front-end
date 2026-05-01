import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface EyebrowLabelProps extends HTMLAttributes<HTMLSpanElement> {
  as?: "span" | "div" | "h2" | "h3";
}

/**
 * Small uppercase label used as a chart/section header eyebrow.
 * Consistent across the analytics workspace.
 */
export function EyebrowLabel({
  as: Tag = "span",
  className,
  children,
  ...rest
}: EyebrowLabelProps) {
  return (
    <Tag
      className={cn(
        "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
