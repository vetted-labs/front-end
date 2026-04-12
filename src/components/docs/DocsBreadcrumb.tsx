import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface DocsCrumb {
  label: string;
  href?: string;
}

interface DocsBreadcrumbProps {
  items: DocsCrumb[];
}

export function DocsBreadcrumb({ items }: DocsBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-muted-foreground">
        {items.map((crumb, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="transition-colors hover:text-foreground hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className={isLast ? "font-medium text-foreground" : undefined}>
                  {crumb.label}
                </span>
              )}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
