import { VettedIcon } from "@/components/ui/vetted-icon";
import { getGuildIdentity } from "@/lib/guildIdentity";
import { cn } from "@/lib/utils";

export interface GuildAvatarProps {
  /** Anything `getGuildIdentity` accepts: name, slug, `{ name }`, null. */
  guild: string | { name?: string | null } | null | undefined;
  /** Tile size — sm 32px, md 40px (default), lg 56px, xl 72px. */
  size?: "sm" | "md" | "lg" | "xl";
  /** Corner radius preset — default `"2xl"`. */
  rounded?: "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const SIZE_BOX: Record<NonNullable<GuildAvatarProps["size"]>, string> = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
  xl: "w-[72px] h-[72px]",
};

const SIZE_ICON: Record<NonNullable<GuildAvatarProps["size"]>, string> = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-7 h-7",
  xl: "w-9 h-9",
};

const ROUNDED: Record<NonNullable<GuildAvatarProps["rounded"]>, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

/**
 * `GuildAvatar` — large iconic tile used in headers, dashboards, and listing
 * cards. Renders a tinted square in the guild's identity color with a
 * centered Vetted icon. Replace any per-page `bg-primary/10` icon tile with
 * this so guilds read as visually distinct entities.
 */
export function GuildAvatar({
  guild,
  size = "md",
  rounded = "2xl",
  className,
}: GuildAvatarProps) {
  const identity = getGuildIdentity(guild);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center flex-shrink-0",
        SIZE_BOX[size],
        ROUNDED[rounded],
        identity.classes.bg,
        identity.classes.text,
        className,
      )}
      aria-label={`${identity.displayName} guild`}
    >
      <VettedIcon name={identity.iconName} className={SIZE_ICON[size]} />
    </span>
  );
}
