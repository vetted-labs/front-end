import { cn } from "@/lib/utils";

export interface TickerCell {
  /** The primary number / value. */
  value: string;
  /** Optional small unit suffix (e.g. "VETD", "USD"). */
  unit?: string;
  /** The label under the value (uppercase, mono). */
  label: string;
  /** Visual tint. */
  tone?: "default" | "accent" | "positive";
}

interface GuildTickerStripProps {
  cells: [TickerCell, TickerCell, TickerCell];
  compact?: boolean;
}

export function GuildTickerStrip({ cells, compact = false }: GuildTickerStripProps) {
  return (
    <div className="grid grid-cols-3 border-t border-border bg-muted/40">
      {cells.map((cell, i) => (
        <div
          key={i}
          className={cn(
            "border-r border-border last:border-r-0",
            compact ? "py-2.5 px-3" : "py-3 px-4",
          )}
        >
          <div
            className={cn(
              "font-mono font-semibold tracking-[-0.01em] tabular-nums leading-none",
              compact ? "text-[13px]" : "text-[15px]",
              cell.tone === "accent" && "text-primary",
              cell.tone === "positive" && "text-positive",
              (cell.tone === "default" || !cell.tone) && "text-foreground",
            )}
          >
            {cell.value}
            {cell.unit && (
              <span className="ml-1 text-[10px] text-muted-foreground font-medium tracking-[0.04em]">
                {cell.unit}
              </span>
            )}
          </div>
          <div className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-muted-foreground mt-1.5">
            {cell.label}
          </div>
        </div>
      ))}
    </div>
  );
}
