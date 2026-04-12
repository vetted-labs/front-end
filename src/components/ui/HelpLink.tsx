import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HelpLinkProps {
  /** Docs URL — should start with `/docs/`. Import from `@/config/docLinks`. */
  href: string;
  /** Link text. Defaults to "Learn more". */
  children?: ReactNode;
  /** Visual variant. */
  variant?: "inline" | "subtle" | "button";
  /** Size preset. */
  size?: "sm" | "md";
  /** Optional "from" label — rendered as `?from=...&label=...` query params
   *  so docs pages can show a "Back to [feature]" pill.  */
  fromLabel?: string;
  /** If set, passes the current app path as the return destination. */
  fromPath?: string;
  className?: string;
}

/**
 * In-app "Learn more" link that deep-links to a documentation page.
 *
 * Use this anywhere the product needs a one-click escape hatch to docs.
 * The default is an inline `<a>` styled like a primary-coloured link with
 * a trailing `↗` icon to signal "docs" without looking like an external
 * link (docs are still same-origin, no new tab).
 */
export function HelpLink({
  href,
  children = "Learn more",
  variant = "inline",
  size = "md",
  fromLabel,
  fromPath,
  className,
}: HelpLinkProps) {
  // Build the query-string so docs can render a "Back to [feature]" pill.
  const url = (() => {
    if (!fromLabel && !fromPath) return href;
    const params = new URLSearchParams();
    if (fromPath) params.set("from", fromPath);
    if (fromLabel) params.set("label", fromLabel);
    const sep = href.includes("?") ? "&" : "?";
    return `${href}${sep}${params.toString()}`;
  })();

  const sizeClasses =
    size === "sm"
      ? "text-[12.5px] gap-1 [&_svg]:h-3 [&_svg]:w-3"
      : "text-[13.5px] gap-1 [&_svg]:h-3.5 [&_svg]:w-3.5";

  if (variant === "button") {
    return (
      <Link
        href={url}
        className={cn(
          "inline-flex items-center rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          sizeClasses,
          className
        )}
      >
        {children}
        <ArrowUpRight />
      </Link>
    );
  }

  if (variant === "subtle") {
    return (
      <Link
        href={url}
        className={cn(
          "inline-flex items-center font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm",
          sizeClasses,
          className
        )}
      >
        {children}
        <ArrowUpRight />
      </Link>
    );
  }

  return (
    <Link
      href={url}
      className={cn(
        "inline-flex items-center font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm",
        sizeClasses,
        className
      )}
    >
      {children}
      <ArrowUpRight />
    </Link>
  );
}
