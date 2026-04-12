import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocsTopicLinkProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  /** Optional section this topic belongs to — used for grouping visually. */
  section?: string;
  className?: string;
}

/**
 * Reusable topic card used on overview pages (experts / candidates / companies)
 * and on the landing "Popular topics" grid.
 *
 * Uses `ring-1 ring-border` + brand-neutral hover to match the rest of the
 * card component library. Persona colours live on `DocsPersonaCard` only —
 * topic grids all hover the same primary accent so they feel consistent.
 */
export function DocsTopicLink({
  icon: Icon,
  title,
  description,
  href,
  className,
}: DocsTopicLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-4 rounded-xl bg-card p-5 ring-1 ring-border transition-all hover:-translate-y-[1px] hover:ring-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        className
      )}
    >
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold text-foreground group-hover:text-primary">
          {title}
        </h3>
        <p className="mt-1.5 text-[13.5px] leading-[19px] text-muted-foreground">
          {description}
        </p>
      </div>
      <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
