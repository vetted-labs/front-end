import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocsCTAProps {
  title: string;
  description?: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
}

/**
 * "Ready to try it?" card at the bottom of content pages.
 * Uses a subtle gradient + ring instead of a loud border so it doesn't
 * fight the surrounding prose.
 */
export function DocsCTA({
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  className,
}: DocsCTAProps) {
  return (
    <aside
      className={cn(
        "my-10 overflow-hidden rounded-2xl ring-1 ring-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card p-7 md:p-8",
        className
      )}
    >
      <h3 className="text-[1.35rem] font-bold tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={primaryHref}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
        {secondaryLabel && secondaryHref && (
          <Link
            href={secondaryHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </aside>
  );
}
