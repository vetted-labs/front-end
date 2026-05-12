import { cn } from "@/lib/utils";
import { getMonogram } from "@/lib/monogramHelper";
import { getAssetUrl } from "@/lib/api";
import type { GuildTopMember } from "@/types";

interface GuildMembersHeroProps {
  /** Total members in the guild. */
  count: number;
  /** Up to 3 top-rep members rendered as profile-photo (or monogram fallback) avatars. */
  topMembers?: GuildTopMember[];
  /** Current user's member id — gets the orange ring. */
  currentUserId?: string;
  /** Optional sub-caption shown beneath the avatar stack (mono, 9px). */
  subCaption?: React.ReactNode;
  /** Compact mode (used in dashboard widget). Hides the sub-caption and tightens padding. */
  compact?: boolean;
}

const MAX_VISIBLE = 3;

export function GuildMembersHero({
  count,
  topMembers,
  currentUserId,
  subCaption,
  compact = false,
}: GuildMembersHeroProps) {
  const visible = (topMembers ?? []).slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, count - visible.length);

  const avatarSize = compact ? "w-7 h-7 text-[9px]" : "w-9 h-9 text-[10px]";
  const overflowSize = compact
    ? "w-7 h-7 text-[9px]"
    : "w-9 h-9 text-[10px]";

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-md bg-primary/[0.04] border border-primary/20",
        compact ? "py-2 px-3" : "py-3 px-4",
      )}
    >
      <div
        className={cn(
          "flex flex-col items-start gap-0.5 border-r border-primary/20 pr-4",
          compact ? "min-w-[44px]" : "min-w-[56px]",
        )}
      >
        <span
          className={cn(
            "font-mono font-extrabold leading-[0.9] tracking-[-0.04em] text-primary tabular-nums",
            compact ? "text-2xl" : "text-[32px]",
          )}
        >
          {count}
        </span>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-muted-foreground">
          Members
        </span>
      </div>
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-center">
          {visible.length === 0 ? (
            <span className="font-mono text-[9px] text-muted-foreground/60 tracking-[0.14em] uppercase">
              ——
            </span>
          ) : (
            <>
              {visible.map((m, i) => {
                const isMe = m.id === currentUserId;
                const photoUrl = m.profilePictureUrl
                  ? getAssetUrl(m.profilePictureUrl)
                  : null;
                return (
                  <span
                    key={m.id}
                    className={cn(
                      "relative rounded-full font-bold flex items-center justify-center font-mono overflow-hidden border-2",
                      avatarSize,
                      i > 0 && "-ml-2",
                      isMe
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-card bg-muted/40 text-muted-foreground",
                    )}
                    title={m.fullName}
                  >
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- external avatar; next/image overkill at this size
                      <img
                        src={photoUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span>{getMonogram(m.fullName)}</span>
                    )}
                  </span>
                );
              })}
              {overflow > 0 && (
                <span
                  className={cn(
                    "rounded-full flex items-center justify-center font-mono text-muted-foreground bg-muted/30 border-2 border-card -ml-2 font-bold",
                    overflowSize,
                  )}
                >
                  +{overflow}
                </span>
              )}
            </>
          )}
        </div>
        {!compact && subCaption && (
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground leading-none">
            {subCaption}
          </div>
        )}
      </div>
    </div>
  );
}
