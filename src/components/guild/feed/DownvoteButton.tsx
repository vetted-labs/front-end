"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface DownvoteButtonProps {
  /** Whether the viewer has currently marked a dislike (visual only). */
  disliked?: boolean;
  onToggle?: (disliked: boolean) => void;
}

/**
 * Downvote (dislike) toggle for a feed post.
 *
 * NOTE: the backend feed vote endpoint (`guildFeedApi.vote`) is upvote-only —
 * it has no vote direction and no downvote count field on `GuildPost`. Until a
 * downvote endpoint exists, this button only flips a local visual state so the
 * Upvote / Downvote / Comment row called for in the design can render; the
 * dislike is NOT persisted. Wire `onToggle` to a real mutation once the
 * backend exposes one.
 */
export function DownvoteButton({ disliked = false, onToggle }: DownvoteButtonProps) {
  const [active, setActive] = useState(disliked);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !active;
    setActive(next);
    onToggle?.(next);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="downvote-button"
      aria-pressed={active}
      aria-label="Dislike"
      title="Dislike"
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-negative/10 text-negative"
          : "text-muted-foreground hover:bg-negative/5 hover:text-negative"
      }`}
    >
      <ChevronDown className="h-4 w-4" />
    </button>
  );
}
