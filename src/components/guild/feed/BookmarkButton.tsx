"use client";

import { Bookmark } from "lucide-react";

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
  if (!onBookmarkToggle) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onBookmarkToggle(targetId);
      }}
      title="Bookmark"
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
        isBookmarked
          ? "text-blue-500 bg-blue-500/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      <Bookmark
        className={`w-3.5 h-3.5 ${isBookmarked ? "fill-blue-500" : ""}`}
      />
    </button>
  );
}
