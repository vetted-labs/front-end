import type { ExpertMember } from "@/types";

interface GuildOnlineNowCardProps {
  experts: ExpertMember[];
  /** How many avatars to show before collapsing into a "+N" tile. */
  maxAvatars?: number;
  /**
   * Optional real "reviewing now" count from a presence/queue source.
   * Omit to drop the line entirely rather than render a fabricated value.
   */
  reviewingCount?: number;
}

/**
 * Stacked-avatar card showing currently-online members.
 * Presence is not yet wired — we surface up to N members as the visual
 * sample but only show counts the backend can actually substantiate.
 */
export function GuildOnlineNowCard({
  experts,
  maxAvatars = 5,
  reviewingCount,
}: GuildOnlineNowCardProps) {
  const onlineSample = experts.slice(0, maxAvatars);
  const overflow = Math.max(0, experts.length - maxAvatars);
  // We can't yet distinguish "online" from "member" until presence ships.
  // Show the total guild size as a stable count so the card remains useful;
  // when realtime presence lands, swap to the filtered list.
  const totalMembers = experts.length;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-1 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground">
          Members
        </span>
        <button className="text-[11px] font-semibold text-primary hover:underline">
          View all
        </button>
      </div>

      <div className="flex items-center">
        {onlineSample.map((expert) => (
          <div
            key={expert.id}
            className="-ml-2 first:ml-0 w-7 h-7 rounded-lg bg-surface-2 border-2 border-surface-1 flex items-center justify-center text-[11px] font-semibold text-muted-foreground"
            title={expert.fullName}
          >
            {expert.fullName.slice(0, 1).toUpperCase()}
          </div>
        ))}
        {overflow > 0 && (
          <div className="-ml-2 w-7 h-7 rounded-lg bg-surface-3 border-2 border-surface-1 flex items-center justify-center text-[11px] font-semibold text-foreground">
            +{overflow}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-positive" />
        {totalMembers} {totalMembers === 1 ? "member" : "members"}
        {reviewingCount !== undefined && reviewingCount > 0 && (
          <> · {reviewingCount} reviewing now</>
        )}
      </div>
    </div>
  );
}
