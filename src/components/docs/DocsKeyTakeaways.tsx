import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocsKeyTakeawaysProps {
  /** 3–6 bullet points the reader should remember. */
  points: ReactNode[];
  /** Override the default heading. */
  title?: string;
  className?: string;
}

/**
 * Bottom-of-page summary. Place BEFORE DocsNextSteps/DocsCTA, AFTER the last
 * content section. Reinforces what matters without a full re-read.
 */
export function DocsKeyTakeaways({
  points,
  title = "Key takeaways",
  className,
}: DocsKeyTakeawaysProps) {
  return (
    <aside
      className={cn(
        "mt-12 rounded-xl border border-border bg-muted/30 p-6 dark:bg-muted/40",
        className
      )}
    >
      <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-foreground">
        <CheckCircle2 className="h-[18px] w-[18px] text-positive" />
        {title}
      </h3>
      <ul className="space-y-2.5 pl-0 text-[14.5px] leading-[22px] text-foreground/90">
        {points.map((point, i) => (
          <li key={i} className="flex gap-2.5">
            <span
              aria-hidden
              className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-positive"
            />
            <span className="flex-1">{point}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
