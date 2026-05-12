import { cn } from "@/lib/utils";
import { getMonogram } from "@/lib/monogramHelper";
import type { GuildTopMember } from "@/types";

interface GuildMembersHeroProps {
  /** Total members in the guild. */
  count: number;
  /** Up to 5 members shown as monogram avatars (typically top-rep). */
  topMembers?: GuildTopMember[];
  /** Current user's member id — gets the orange highlight. */
  currentUserId?: string;
  /** Optional sub-caption shown beneath the avatars (mono, 9px). */
  subCaption?: React.ReactNode;
  /** Compact mode (used in dashboard widget). Hides the sub-caption and tightens padding. */
  compact?: boolean;
}

const MAX_VISIBLE = 5;

export function GuildMembersHero({
  count,
  topMembers,
  currentUserId,
  subCaption,
  compact = false,
}: GuildMembersHeroProps) {
  const visible = (topMembers ?? []).slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, count - visible.length);

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
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center">
          {visible.length === 0 ? (
            <span className="font-mono text-[9px] text-muted-foreground/60 tracking-[0.14em] uppercase">
              ——
            </span>
          ) : (
            <>
              {visible.map((m, i) => {
                const isMe = m.id === currentUserId;
                return (
                  <span
                    key={m.id}
                    className={cn(
                      "w-5 h-5 rounded-full text-[8px] font-bold flex items-center justify-center font-mono border-[1.5px] border-card",
                      i > 0 && "-ml-1.5",
                      isMe
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/30 text-muted-foreground",
                    )}
                    title={m.fullName}
                  >
                    {getMonogram(m.fullName)}
                  </span>
                );
              })}
              {overflow > 0 && (
                <span className="w-5 h-5 flex items-center justify-center text-[8px] text-muted-foreground -ml-1.5 font-mono">
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
