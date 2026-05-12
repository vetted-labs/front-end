import { cn } from "@/lib/utils";

interface GuildCardWatermarkProps {
  /** The numeral to render, e.g. 4 → "04", 12 → "12". */
  index: number;
  /** Render-size variant. */
  size?: "default" | "sm" | "xs";
}

/**
 * Low-contrast numeric watermark that anchors the bottom-right of a
 * guild card. Behind everything (z-index 0); does not intercept clicks.
 */
export function GuildCardWatermark({ index, size = "default" }: GuildCardWatermarkProps) {
  const display = String(index).padStart(2, "0");
  const positionClasses =
    size === "default"
      ? "right-[-6px] bottom-8"
      : size === "sm"
      ? "right-[-4px] bottom-[18px]"
      : "right-[-2px] bottom-[6px]";

  return (
    <div
      aria-hidden
      className={cn(
        "absolute pointer-events-none select-none z-0 guild-card-watermark",
        size === "sm" && "size-sm",
        size === "xs" && "size-xs",
        positionClasses,
      )}
    >
      {display}
    </div>
  );
}
