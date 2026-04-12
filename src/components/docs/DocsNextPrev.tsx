import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getDocsAdjacent } from "./docs-nav";

interface DocsNextPrevProps {
  /** The current doc page href — used to look up siblings. */
  href: string;
}

export function DocsNextPrev({ href }: DocsNextPrevProps) {
  const { prev, next } = getDocsAdjacent(href);

  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Page navigation"
      className="mt-12 grid gap-3 border-t border-border pt-8 sm:grid-cols-2"
    >
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-col gap-1 rounded-xl bg-card px-5 py-4 text-left ring-1 ring-border transition-all hover:-translate-y-0.5 hover:ring-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </span>
          <span className="text-[15px] font-semibold text-foreground group-hover:text-primary">
            {prev.label}
          </span>
        </Link>
      ) : (
        <div aria-hidden />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group flex flex-col items-end gap-1 rounded-xl bg-card px-5 py-4 text-right ring-1 ring-border transition-all hover:-translate-y-0.5 hover:ring-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
          <span className="text-[15px] font-semibold text-foreground group-hover:text-primary">
            {next.label}
          </span>
        </Link>
      ) : (
        <div aria-hidden />
      )}
    </nav>
  );
}
