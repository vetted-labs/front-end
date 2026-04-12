import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocsTldrProps {
  /** 3–5 short bullet points summarising the page. */
  points: ReactNode[];
  /** Override the default "TL;DR" title. */
  title?: string;
  className?: string;
}

/**
 * Top-of-page summary block.
 *
 * Neutral card (not primary-tinted) so it doesn't fight downstream orange
 * CTAs. Only the sparkle icon + label carry the brand colour.
 */
export function DocsTldr({ points, title = "TL;DR", className }: DocsTldrProps) {
  return (
    <aside
      className={cn(
        "mb-10 rounded-xl bg-muted/40 p-5 ring-1 ring-border dark:bg-muted/50",
        className
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-primary">
          {title}
        </p>
      </div>
      <ul className="space-y-1.5 pl-0 text-[14.5px] leading-[22px] text-foreground/90">
        {points.map((point, i) => (
          <li key={i} className="flex gap-2.5">
            <span
              aria-hidden
              className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-primary"
            />
            <span className="flex-1">{point}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
