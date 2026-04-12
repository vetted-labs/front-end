import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DocsPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  lastUpdated?: string;
  /** Optional badge slot rendered inline with the eyebrow (e.g. ComplexityBadge). */
  badge?: ReactNode;
  className?: string;
}

/**
 * Matches docs.gitbook.com measurements exactly:
 *   eyebrow: 12px/16px/600/0.09em uppercase tracking
 *   H1:      36px/45px/700, -0.015em tracking
 *   lead:    18px/28px muted
 *   spacing: 16px below eyebrow, 12px below H1, 40px below lead
 */
export function DocsPageHeader({
  eyebrow,
  title,
  description,
  lastUpdated,
  badge,
  className,
}: DocsPageHeaderProps) {
  return (
    <header className={cn("mb-10", className)}>
      {(eyebrow || badge) && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {eyebrow && (
            <p className="text-[12px] font-semibold uppercase leading-4 tracking-[0.09em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          {badge}
        </div>
      )}
      <h1 className="text-[32px] font-bold leading-[40px] tracking-[-0.015em] text-foreground md:text-[36px] md:leading-[45px]">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-[680px] text-[18px] leading-[28px] text-muted-foreground">
          {description}
        </p>
      )}
      {lastUpdated && (
        <p className="mt-5 text-[12px] text-muted-foreground/70">
          Last updated <time>{lastUpdated}</time>
        </p>
      )}
    </header>
  );
}
