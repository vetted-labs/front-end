import type { ReactNode } from "react";
import { X, Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComparisonColumn {
  /** Column header — short phrase. */
  title: string;
  /** Optional icon shown left of the title. */
  icon?: LucideIcon;
  /** Short tagline under the title, e.g. "Web2 pattern" or "Vetted pattern". */
  tagline?: string;
  /** Bullet points describing this column. */
  rows: ReactNode[];
  /** Stylistic accent: "negative" for the bad-example column, "positive" for the good-example. */
  accent?: "neutral" | "positive" | "negative";
}

interface DocsComparisonProps {
  left: ComparisonColumn;
  right: ComparisonColumn;
  /** Optional label above the two columns. */
  label?: string;
  className?: string;
}

/**
 * Two-column comparison card. Use for "X vs Y" explanations that are currently
 * prose or bullet lists — e.g. LinkedIn recommendations vs Vetted endorsements,
 * voting vs endorsements, traditional ATS vs Vetted vetting.
 *
 * Visual: a side-by-side 2-column grid with distinct headers, stacked bullets.
 * On mobile the columns stack vertically with the same styling.
 */
export function DocsComparison({ left, right, label, className }: DocsComparisonProps) {
  return (
    <div className={cn("my-8", className)}>
      {label && (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          {label}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Column column={left} side="left" />
        <Column column={right} side="right" />
      </div>
    </div>
  );
}

function Column({ column, side }: { column: ComparisonColumn; side: "left" | "right" }) {
  const Icon = column.icon;
  const accent = column.accent ?? "neutral";

  const accentClasses = {
    neutral: "bg-card ring-border",
    positive: "bg-positive/[0.06] ring-positive/20 dark:bg-positive/[0.12]",
    negative: "bg-muted/40 ring-border",
  }[accent];

  const RowIcon = accent === "negative" ? X : accent === "positive" ? Check : null;
  const rowIconClass = accent === "negative" ? "text-muted-foreground/70" : "text-positive";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl p-5 ring-1",
        accentClasses
      )}
    >
      <div className="flex items-start gap-2.5 border-b border-border/60 pb-3">
        {Icon && (
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              accent === "positive"
                ? "bg-positive/10 text-positive"
                : accent === "negative"
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-foreground">{column.title}</p>
          {column.tagline && (
            <p className="mt-0.5 text-[12px] text-muted-foreground">{column.tagline}</p>
          )}
        </div>
      </div>
      <ul className="space-y-2.5 text-[14px] leading-[21px] text-foreground/85">
        {column.rows.map((row, i) => (
          <li key={i} className="flex gap-2.5">
            {RowIcon ? (
              <RowIcon className={cn("mt-[3px] h-3.5 w-3.5 shrink-0", rowIconClass)} />
            ) : (
              <span
                aria-hidden
                className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50"
              />
            )}
            <span className="flex-1">{row}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
