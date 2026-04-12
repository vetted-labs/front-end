import type { ReactNode } from "react";
import { DocsPageHeader } from "./DocsPageHeader";
import { DocsProse } from "./DocsProse";
import { DocsNextPrev } from "./DocsNextPrev";
import { DocsOnThisPage, type TocItem } from "./DocsOnThisPage";
// DocsFeedback removed in Phase 2 — widget recorded nothing (no backend)

interface DocsPageProps {
  href: string;
  /** @deprecated Breadcrumbs removed in Phase 2 — eyebrow carries the context now. Kept for API compat. */
  breadcrumbs?: unknown[];
  eyebrow?: string;
  title: string;
  description?: string;
  lastUpdated?: string;
  /** Optional badge (e.g. ComplexityBadge) rendered next to the eyebrow. */
  badge?: ReactNode;
  toc?: TocItem[];
  children: ReactNode;
  /** Skip the DocsProse wrapper (for pages with custom layouts). */
  raw?: boolean;
  /** Show prev/next pagination at the bottom. Defaults to on. */
  showPrevNext?: boolean;
}

/**
 * Standard layout for a docs content page.
 *
 *   article max-width 768px
 *   right-rail 224px (lg+)
 *   48px column gap
 *   56px top padding, 80px bottom padding
 */
export function DocsPage({
  href,
  eyebrow,
  title,
  description,
  lastUpdated,
  badge,
  toc,
  children,
  raw = false,
  showPrevNext = true,
}: DocsPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1104px] gap-12 px-4 pt-14 pb-14 sm:px-6 md:gap-12 md:px-8 lg:gap-[48px]">
      <article className="min-w-0 flex-1 lg:max-w-[768px]">
        <DocsPageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          lastUpdated={lastUpdated}
          badge={badge}
        />
        {raw ? children : <DocsProse>{children}</DocsProse>}
        {showPrevNext && <DocsNextPrev href={href} />}
      </article>

      {toc && toc.length > 0 && (
        <aside
          className="hidden w-[224px] shrink-0 lg:block"
          aria-label="Table of contents"
        >
          <div className="sticky top-[76px] max-h-[calc(100dvh-92px)] overflow-y-auto pr-4">
            <DocsOnThisPage items={toc} />
          </div>
        </aside>
      )}
    </div>
  );
}
