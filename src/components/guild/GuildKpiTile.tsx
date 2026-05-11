import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "urgent" | "positive" | "warning";

interface GuildKpiTileProps {
  label: string;
  value: ReactNode;
  /** Sub-line shown beneath the value. */
  sub?: ReactNode;
  /** Tone — `urgent` adds an orange-tint background and a corner notch. */
  tone?: Tone;
  /** Optional tone for the sub-line text only. */
  subTone?: Tone;
}

const SUB_TONE_CLASS: Record<Tone, string> = {
  default: "text-muted-foreground",
  urgent: "text-primary",
  positive: "text-positive",
  warning: "text-warning",
};

/**
 * One of the five KPI tiles in the workspace top strip.
 *
 * `urgent` tone is reserved for the "Your queue" tile when there are items
 * due in <24h — it adds the orange-tinted background gradient + corner notch
 * called out in the mock.
 */
export function GuildKpiTile({
  label,
  value,
  sub,
  tone = "default",
  subTone,
}: GuildKpiTileProps) {
  const isUrgent = tone === "urgent";
  const resolvedSubTone = subTone ?? (isUrgent ? "urgent" : "default");

  return (
    <div
      className={cn(
        "relative rounded-xl border px-4 py-4 sm:px-[18px]",
        isUrgent
          ? "border-primary/35 bg-gradient-to-b from-primary/[0.12] to-card/60"
          : "border-border bg-card",
      )}
    >
      {isUrgent && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-0 w-0 border-y-[12px] border-r-[12px] border-y-transparent border-r-primary"
          style={{ borderLeftWidth: 0 }}
        />
      )}
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </div>
      <div className="font-display text-[28px] leading-none text-foreground">
        {value}
      </div>
      {sub && (
        <div className={cn("mt-1 text-xs", SUB_TONE_CLASS[resolvedSubTone])}>
          {sub}
        </div>
      )}
    </div>
  );
}
