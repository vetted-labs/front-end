"use client";

import { useState, useRef, useCallback } from "react";
import { MoreHorizontal, Pin, PinOff, Lock, Unlock, Trash2 } from "lucide-react";
import { guildFeedApi } from "@/lib/api";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { toast } from "sonner";
import type { FeedPrivileges, ModerationAction } from "@/types";

interface ModerationMenuProps {
  guildId: string;
  postId: string;
  isPinned: boolean;
  isClosed: boolean;
  privileges: FeedPrivileges;
  onModerated: (action: ModerationAction) => void;
}

export function ModerationMenu({
  guildId,
  postId,
  isPinned,
  isClosed,
  privileges,
  onModerated,
}: ModerationMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(menuRef, close, open);

  const hasAnyAction =
    privileges.canPinUnpin || privileges.canCloseReopen || privileges.canDelete;

  if (!hasAnyAction) return null;

  const handleAction = async (e: React.MouseEvent, action: ModerationAction) => {
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      await guildFeedApi.moderatePost(guildId, postId, { action });
      onModerated(action);
      toast.success(
        action === "pin"
          ? "Post pinned"
          : action === "unpin"
          ? "Post unpinned"
          : action === "close"
          ? "Post closed"
          : action === "reopen"
          ? "Post reopened"
          : action === "delete"
          ? "Post deleted"
          : "Action completed"
      );
    } catch {
      toast.error("Moderation action failed");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        title="Moderation actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-lg border border-border bg-card shadow-lg py-1">
          {privileges.canPinUnpin && (
            <button
              onClick={(e) => handleAction(e, isPinned ? "unpin" : "pin")}
              disabled={loading}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {isPinned ? (
                <>
                  <PinOff className="w-3.5 h-3.5" /> Unpin
                </>
              ) : (
                <>
                  <Pin className="w-3.5 h-3.5" /> Pin
                </>
              )}
            </button>
          )}

          {privileges.canCloseReopen && (
            <button
              onClick={(e) => handleAction(e, isClosed ? "reopen" : "close")}
              disabled={loading}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {isClosed ? (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Reopen
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Close
                </>
              )}
            </button>
          )}

          {privileges.canDelete && (
            <button
              onClick={(e) => handleAction(e, "delete")}
              disabled={loading}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
