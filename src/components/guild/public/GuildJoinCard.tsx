import { getGuildIdentity } from "@/lib/guildIdentity";

interface GuildJoinCardProps {
  guildName: string;
  onApply: () => void;
  /** Hide the card entirely when the user is already a member. */
  hidden?: boolean;
  blurb?: string;
  cta?: string;
  title?: string;
}

/**
 * Apply-to-guild CTA card with the guild's signature color tint.
 * Sits in the public guild Feed sidebar.
 */
export function GuildJoinCard({
  guildName,
  onApply,
  hidden = false,
  title = "Want to review with us?",
  blurb = "Application requires 1 reference review and minimum 100 VETD stake. Avg time to first review: 11 days.",
  cta = "Apply to join",
}: GuildJoinCardProps) {
  if (hidden) return null;
  const identity = getGuildIdentity(guildName);

  return (
    <div
      className={`rounded-xl border ${identity.classes.border} p-[18px] bg-gradient-to-b ${identity.classes.bg} to-surface-1`}
    >
      <h3 className="font-display text-[18px] text-foreground mb-1.5">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3.5">
        {blurb}
      </p>
      <button
        onClick={onApply}
        className="w-full px-4 py-2 rounded-lg bg-primary text-white font-semibold text-sm transition-colors hover:bg-primary/90"
      >
        {cta}
      </button>
    </div>
  );
}
