import Link from "next/link";
import type { ReactNode } from "react";

interface DocsGlossaryLinkProps {
  /** Glossary anchor id — e.g. "iqr-consensus", "nonce", "slashing". */
  term: string;
  children: ReactNode;
}

/**
 * Inline link that wraps a jargon term on first use, deep-linking to the
 * corresponding glossary entry. Uses a subtle dotted underline — present
 * enough to signal "this is a defined term" without the noise of a blue
 * hyperlink.
 *
 *   <DocsGlossaryLink term="iqr-consensus">IQR consensus</DocsGlossaryLink>
 */
export function DocsGlossaryLink({ term, children }: DocsGlossaryLinkProps) {
  return (
    <Link
      href={`/docs/glossary#${term}`}
      className="decoration-muted-foreground/40 decoration-dotted underline-offset-[3px] [text-decoration-line:underline] hover:text-primary hover:decoration-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
    >
      {children}
    </Link>
  );
}
