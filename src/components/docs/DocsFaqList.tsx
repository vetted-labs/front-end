import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export interface FaqItem {
  q: string;
  a: ReactNode;
}

interface DocsFaqListProps {
  items: FaqItem[];
}

/**
 * Flat GitBook-style FAQ accordion.
 *
 * No cards — each Q/A is a borderless row with a chevron that rotates on
 * expand. Uses native <details>/<summary> for keyboard accessibility and
 * zero client-side state.
 */
export function DocsFaqList({ items }: DocsFaqListProps) {
  return (
    <div className="my-6 divide-y divide-border">
      {items.map((item, i) => (
        <details
          key={i}
          className="group py-4 [&[open]>summary>svg]:rotate-90"
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-sm text-[15px] font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
            <span className="flex-1">{item.q}</span>
          </summary>
          <div className="mt-3 pl-7 text-[14.5px] leading-[22px] text-muted-foreground">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  );
}
