import { highlightCode } from "@/lib/docs-highlight";
import { cn } from "@/lib/utils";
import { DocsCodeBlockCopyButton } from "./DocsCodeBlockCopyButton";

interface DocsCodeBlockProps {
  children: string;
  language?: string;
  /** Short label shown in the top bar, e.g. a filename or purpose. */
  filename?: string;
  className?: string;
}

/**
 * Server-rendered code block with syntax highlighting via shiki.
 *
 * The copy button is a tiny client island; everything else (highlighting,
 * language label, wrapper) is server-rendered at build time for zero client
 * JS and instant-paint code samples.
 */
export async function DocsCodeBlock({
  children,
  language,
  filename,
  className,
}: DocsCodeBlockProps) {
  const html = await highlightCode(children, language);
  const label = filename ?? language ?? "Code";

  return (
    <figure
      className={cn(
        "my-7 overflow-hidden rounded-xl ring-1 ring-border bg-[hsl(var(--surface-1))] shadow-sm",
        className
      )}
      role="group"
      aria-label={`Code sample: ${label}`}
    >
      <figcaption className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <DocsCodeBlockCopyButton code={children} />
      </figcaption>
      <div
        tabIndex={0}
        className="docs-shiki overflow-x-auto px-4 py-4 text-[13px] leading-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </figure>
  );
}
