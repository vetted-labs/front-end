"use client";

import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { STATUS_COLORS } from "@/config/colors";
import { useExpertSession } from "@/lib/hooks/useExpertSession";

interface BookmarkButtonProps {
  targetId: string;
  isBookmarked?: boolean;
  onBookmarkToggle?: (id: string) => void;
}

export function BookmarkButton({
  targetId,
  isBookmarked = false,
  onBookmarkToggle,
}: BookmarkButtonProps) {
  const { ensureSession } = useExpertSession();

  if (!onBookmarkToggle) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Gate the bookmark mutation behind a fresh expert-session JWT. The
    // optimistic flip lives in the parent's onBookmarkToggle, so aborting here
    // (before invoking the callback) keeps UI state in sync without rollback.
    const session = await ensureSession();
    if (!session.ok && session.reason !== "flag-off") {
      if (session.reason === "user-rejected") {
        toast.error("Sign to participate");
      } else {
        toast.error(session.error ?? "Could not authenticate. Please try again.");
      }
      return;
    }

    onBookmarkToggle(targetId);
  };

  return (
    <button
      onClick={handleClick}
      title="Bookmark"
      data-testid="bookmark-button"
      className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
        isBookmarked
          ? `${STATUS_COLORS.info.text} ${STATUS_COLORS.info.bgSubtle}`
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      <Bookmark
        className={`w-3.5 h-3.5 ${isBookmarked ? "fill-info-blue" : ""}`}
      />
    </button>
  );
}
