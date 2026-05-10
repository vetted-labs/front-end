import { VettedIcon } from "@/components/ui/vetted-icon";
import { getGuildIdentity } from "@/lib/guildIdentity";
import { cn } from "@/lib/utils";

export interface GuildPillProps {
  /** Anything `getGuildIdentity` accepts: name, slug, `{ name }`. */
  guild: string | { name?: string | null };
  /** Whether this filter is currently active. */
  selected?: boolean;
  /** Optional trailing tabular count. Hidden when undefined. */
  count?: number;
  onClick?: () => void;
  /** Visual size — default `"md"`. */
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<GuildPillProps["size"]>, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-8 px-3 text-xs gap-2",
};

const ICON_CLASSES: Record<NonNullable<GuildPillProps["size"]>, string> = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
};

/**
 * `GuildPill` — interactive filter pill for chip rows (browse filters, modal
 * filter list, dashboard guild filter). Always renders the per-guild icon in
 * the identity color, even in the resting state, so users learn the color
 * mapping passively.
 *
 * Selected state lifts the chip onto the guild's tinted surface; resting
 * state keeps `bg-card` so a long row of pills stays calm.
 */
export function GuildPill({
  guild,
  selected = false,
  count,
  onClick,
  size = "md",
  className,
}: GuildPillProps) {
  const identity = getGuildIdentity(guild);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center rounded-full border font-medium transition-colors whitespace-nowrap",
        SIZE_CLASSES[size],
        selected
          ? cn(
              identity.classes.bg,
              identity.classes.text,
              identity.classes.border,
              "ring-1",
              identity.classes.ring,
            )
          : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30",
        className,
      )}
    >
      <VettedIcon
        name={identity.iconName}
        className={cn(ICON_CLASSES[size], identity.classes.text)}
      />
      <span>{identity.shortName}</span>
      {typeof count === "number" && (
        <span
          className={cn(
            "tabular-nums",
            selected ? "opacity-80" : "text-muted-foreground/70",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
