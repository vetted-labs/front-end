import Link from "next/link";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { getGuildIdentity } from "@/lib/guildIdentity";
import { cn } from "@/lib/utils";

export interface GuildBadgeProps {
  /** Anything `getGuildIdentity` accepts: name, slug, `{ name }`, null. */
  guild: string | { name?: string | null } | null | undefined;
  /** Visual size — default `"sm"`. */
  size?: "xs" | "sm" | "md";
  /**
   * When true the badge renders as a `next/link` to the guild's detail page
   * so users can drill in from any chip. Unknown guilds render as a
   * non-link span.
   *
   * Prefers (in order): `guildId` → `/guilds/<guildId>`, then the slug
   * derived from the guild name → `/guilds/<slug>`. Pass `guildId` whenever
   * you have the real backend ID — the backend's public detail route is
   * keyed by id, not slug, so slug-only links can 404.
   */
  asLink?: boolean;
  /** Real backend guild id (UUID). When present, takes precedence over slug. */
  guildId?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<GuildBadgeProps["size"]>, string> = {
  xs: "h-5 px-2 text-[10.5px]",
  sm: "h-6 px-2.5 text-xs",
  md: "h-7 px-3 text-sm",
};

const ICON_CLASSES: Record<NonNullable<GuildBadgeProps["size"]>, string> = {
  xs: "w-3 h-3",
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
};

/**
 * `GuildBadge` — the canonical small chip used wherever the app mentions a
 * guild: job rows, list items, sidebar callouts. Replaces every ad-hoc
 * `inline-flex items-center gap-1 rounded-full ...` you would otherwise
 * hand-roll.
 *
 * The icon and text both inherit the per-guild text color so the chip stays
 * visually cohesive on light + dark themes.
 */
export function GuildBadge({
  guild,
  size = "sm",
  asLink = false,
  guildId,
  className,
}: GuildBadgeProps) {
  const identity = getGuildIdentity(guild);
  const classes = cn(
    "inline-flex items-center gap-1.5 rounded-full border font-medium tracking-tight whitespace-nowrap",
    SIZE_CLASSES[size],
    identity.classes.bg,
    identity.classes.text,
    identity.classes.border,
    className,
  );

  const content = (
    <>
      <VettedIcon name={identity.iconName} className={ICON_CLASSES[size]} />
      <span className="truncate">{identity.shortName}</span>
    </>
  );

  const linkTarget = guildId
    ? `/guilds/${encodeURIComponent(guildId)}`
    : identity.slug !== "unknown"
      ? `/guilds/${identity.slug}`
      : null;

  if (asLink && linkTarget) {
    return (
      <Link
        href={linkTarget}
        className={cn(classes, "transition-colors hover:opacity-90")}
        aria-label={`${identity.displayName} guild`}
      >
        {content}
      </Link>
    );
  }

  return (
    <span className={classes} aria-label={`${identity.displayName} guild`}>
      {content}
    </span>
  );
}
