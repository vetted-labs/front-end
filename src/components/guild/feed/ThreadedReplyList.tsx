"use client";

import { useCallback, useRef, useState } from "react";
import {
  Send,
  CheckCircle2,
  MessageSquare,
  ChevronDown,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { guildFeedApi } from "@/lib/api";
import { useApi } from "@/lib/hooks/useFetch";
import { useExpertSession } from "@/lib/hooks/useExpertSession";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { useAuthContext } from "@/hooks/useAuthContext";
import { formatTimeAgo } from "@/lib/utils";
import { toast } from "sonner";
import { STATUS_COLORS } from "@/config/colors";
import { Modal } from "@/components/ui/modal";
import { useFeedContext } from "./FeedContext";
import { VoteButton } from "./VoteButton";
import { AuthorBadge } from "./AuthorBadge";
import { MarkdownBody } from "./MarkdownBody";
import { AcceptedAnswerBadge } from "./AcceptedAnswerBadge";
import type { GuildPostReply } from "@/types";

const MAX_DEPTH = 3;

interface ThreadedReplyListProps {
  postId: string;
  replies: GuildPostReply[];
  acceptedReplyId?: string;
  isPostAuthor: boolean;
  onAcceptAnswer: (replyId: string) => void;
  onRepliesChanged: () => void;
}

export function ThreadedReplyList({
  postId,
  replies,
  acceptedReplyId,
  isPostAuthor,
  onAcceptAnswer,
  onRepliesChanged,
}: ThreadedReplyListProps) {
  // Separate accepted reply to pin at top
  const acceptedReply = acceptedReplyId
    ? replies.find((r) => r.id === acceptedReplyId)
    : undefined;
  const otherReplies = acceptedReplyId
    ? replies.filter((r) => r.id !== acceptedReplyId)
    : replies;

  return (
    <div className="space-y-3">
      {/* Accepted answer pinned to top */}
      {acceptedReply && (
        <div className={`rounded-lg border-2 ${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.bgSubtle} p-3`}>
          <AcceptedAnswerBadge
            variant="reply"
            postId={postId}
            isPostAuthor={isPostAuthor}
            onRemoved={() => onRepliesChanged()}
          />
          <div className="mt-2">
            <ReplyNode
              reply={acceptedReply}
              postId={postId}
              acceptedReplyId={acceptedReplyId}
              isPostAuthor={isPostAuthor}
              onAcceptAnswer={onAcceptAnswer}
              onRepliesChanged={onRepliesChanged}
              depth={0}
            />
          </div>
        </div>
      )}

      {/* Other replies */}
      {otherReplies.map((reply) => (
        <ReplyNode
          key={reply.id}
          reply={reply}
          postId={postId}
          acceptedReplyId={acceptedReplyId}
          isPostAuthor={isPostAuthor}
          onAcceptAnswer={onAcceptAnswer}
          onRepliesChanged={onRepliesChanged}
          depth={0}
        />
      ))}
    </div>
  );
}

/* ── Recursive Reply Node ── */

interface ReplyNodeProps {
  reply: GuildPostReply;
  postId: string;
  acceptedReplyId?: string;
  isPostAuthor: boolean;
  onAcceptAnswer: (replyId: string) => void;
  onRepliesChanged: () => void;
  depth: number;
}

function ReplyNode({
  reply,
  postId,
  acceptedReplyId,
  isPostAuthor,
  onAcceptAnswer,
  onRepliesChanged,
  depth,
}: ReplyNodeProps) {
  const { guildId, isAuthenticated, isMember, privileges } = useFeedContext();
  const { userId, userType } = useAuthContext();
  const { ensureSession, isSigning } = useExpertSession();
  const [showInlineReply, setShowInlineReply] = useState(false);
  const [inlineReplyText, setInlineReplyText] = useState("");
  const [showChildren, setShowChildren] = useState(true);
  const [loadedChildren, setLoadedChildren] = useState<GuildPostReply[]>(reply.children ?? []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [moderationMenuOpen, setModerationMenuOpen] = useState(false);
  const moderationMenuRef = useRef<HTMLDivElement>(null);
  const { execute: loadChildren, isLoading: loadingChildren } = useApi<{ data: GuildPostReply[] }>();
  const { execute: submitReply, isLoading: isSubmitting } = useApi<GuildPostReply>();
  const { execute: runDeleteReply, isLoading: isDeleting } = useApi<{ success: boolean }>();

  const closeModerationMenu = useCallback(() => setModerationMenuOpen(false), []);
  useClickOutside(moderationMenuRef, closeModerationMenu, moderationMenuOpen);

  const childCount = reply.childCount ?? 0;
  const hasUnloadedChildren = childCount > 0 && loadedChildren.length === 0 && !reply.children;
  const canReplyInline = depth < MAX_DEPTH && isAuthenticated && isMember;
  const canAccept =
    !acceptedReplyId && (isPostAuthor || privileges.canAcceptOnBehalf);

  // Author-self delete: visible to the user who authored this reply. The
  // backend authorizes author-self OR officer/master moderation; we route them
  // through different UI affordances so officers don't see two Delete buttons
  // when looking at their own reply.
  const isReplyAuthor =
    !!userId && !!userType && reply.author.id === userId && reply.author.type === userType;

  // Officer+ per-reply moderation menu: visible to guild officers/masters who
  // are NOT the reply author (the author already has the direct Delete link).
  // Mirrors the post-level ModerationMenu role-gate (officer-or-above via
  // canPinUnpin) plus master via canDelete, matching the backend's
  // guild-reply.service.ts:246 check.
  const canModerateReply =
    !isReplyAuthor && (privileges.canPinUnpin || privileges.canDelete);

  const handleLoadChildren = async () => {
    if (loadingChildren) return;
    await loadChildren(
      () => guildFeedApi.getReplies(guildId, postId, {
        parentReplyId: reply.id,
        sort: "new",
        limit: 50,
      }),
      {
        onSuccess: (res) => {
          if (res) {
            setLoadedChildren(res.data);
            setShowChildren(true);
          }
        },
        onError: () => toast.error("Failed to load replies"),
      }
    );
  };

  const handleInlineReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inlineReplyText.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      toast.error("Reply must be at most 2000 characters");
      return;
    }

    // Gate reply submission behind a fresh expert-session JWT. flag-off falls
    // through to legacy behavior so we never make today's bug worse.
    const session = await ensureSession();
    if (!session.ok && session.reason !== "flag-off") {
      if (session.reason === "user-rejected") {
        toast.error("Sign to participate");
      } else {
        toast.error(session.error ?? "Could not authenticate. Please try again.");
      }
      return;
    }

    await submitReply(
      () =>
        guildFeedApi.createReply(guildId, postId, {
          body: trimmed,
          parentReplyId: reply.id,
        }),
      {
        onSuccess: () => {
          setInlineReplyText("");
          setShowInlineReply(false);
          onRepliesChanged();
        },
        onError: (err) => toast.error(err),
      }
    );
  };

  const handleDeleteRequest = () => {
    setModerationMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteCancel = () => {
    if (isDeleting) return;
    setShowDeleteConfirm(false);
  };

  const handleDeleteConfirm = async () => {
    const session = await ensureSession();
    if (!session.ok && session.reason !== "flag-off") {
      if (session.reason === "user-rejected") {
        toast.error("Sign to participate");
      } else {
        toast.error(session.error ?? "Could not authenticate. Please try again.");
      }
      return;
    }

    await runDeleteReply(
      () => guildFeedApi.deleteReply(guildId, postId, reply.id),
      {
        onSuccess: () => {
          toast.success("Reply deleted");
          setShowDeleteConfirm(false);
          onRepliesChanged();
        },
        onError: (err) => {
          toast.error(err);
          setShowDeleteConfirm(false);
        },
      }
    );
  };

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-border pl-3" : ""}>
      <div className="flex gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex-shrink-0">
          <VoteButton
            targetId={reply.id}
            targetType="reply"
            upvoteCount={reply.upvoteCount}
            hasVoted={reply.hasVoted}
            scoreHidden={reply.scoreHidden}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <AuthorBadge author={reply.author} showReputation />
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(reply.createdAt)}
            </span>
            {reply.isAccepted && (
              <span className={`flex items-center gap-2 text-xs font-medium ${STATUS_COLORS.positive.text}`}>
                <CheckCircle2 className="w-3 h-3" />
                Accepted
              </span>
            )}

            {/* Per-reply moderation menu (officer+ on others' replies). The
                trigger sits in the header row alongside the timestamp so it
                doesn't compete with the action row below. */}
            {canModerateReply && (
              <div ref={moderationMenuRef} className="relative ml-auto">
                <button
                  type="button"
                  data-testid="reply-moderation-actions"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModerationMenuOpen((prev) => !prev);
                  }}
                  disabled={isDeleting || isSigning}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                  aria-label="Reply moderation actions"
                  title="Reply moderation actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {moderationMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-lg border border-border bg-card shadow-lg py-1">
                    <button
                      type="button"
                      data-testid="reply-moderation-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRequest();
                      }}
                      disabled={isDeleting || isSigning}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <MarkdownBody content={reply.body} className="text-sm text-foreground/90 mb-2" />

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {canReplyInline && (
              <button
                onClick={() => setShowInlineReply((prev) => !prev)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                Reply
              </button>
            )}

            {canAccept && (
              <button
                onClick={() => onAcceptAnswer(reply.id)}
                className={`flex items-center gap-2 text-xs ${STATUS_COLORS.positive.text} hover:opacity-80 transition-colors`}
              >
                <CheckCircle2 className="w-3 h-3" />
                Accept
              </button>
            )}

            {isReplyAuthor && (
              <button
                type="button"
                data-testid="delete-reply"
                onClick={handleDeleteRequest}
                disabled={isDeleting || isSigning}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Delete reply"
                title="Delete reply"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>

          {/* Inline reply composer */}
          {showInlineReply && (
            <form onSubmit={handleInlineReply} className="mt-3 flex gap-2">
              <input
                type="text"
                value={inlineReplyText}
                onChange={(e) => setInlineReplyText(e.target.value)}
                placeholder="Write a reply..."
                maxLength={2000}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={isSubmitting || isSigning || !inlineReplyText.trim()}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-3 h-3" />
                {isSigning ? "Signing..." : isSubmitting ? "..." : "Reply"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Load children */}
      {hasUnloadedChildren && (
        <button
          onClick={handleLoadChildren}
          disabled={loadingChildren}
          className="mt-2 ml-6 flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
        >
          <ChevronDown className="w-3 h-3" />
          {loadingChildren ? "Loading..." : `Show ${childCount} ${childCount === 1 ? "reply" : "replies"}`}
        </button>
      )}

      {/* Toggle children visibility */}
      {loadedChildren.length > 0 && (
        <>
          {!showChildren && (
            <button
              onClick={() => setShowChildren(true)}
              className="mt-2 ml-6 flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <ChevronDown className="w-3 h-3" />
              Show {loadedChildren.length} {loadedChildren.length === 1 ? "reply" : "replies"}
            </button>
          )}

          {showChildren && (
            <div className="mt-2 space-y-2">
              {loadedChildren.map((child) => (
                <ReplyNode
                  key={child.id}
                  reply={child}
                  postId={postId}
                  acceptedReplyId={acceptedReplyId}
                  isPostAuthor={isPostAuthor}
                  onAcceptAnswer={onAcceptAnswer}
                  onRepliesChanged={onRepliesChanged}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen
          onClose={handleDeleteCancel}
          title="Delete this reply?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This permanently removes the reply. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={isDeleting || isSigning}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-reply"
                onClick={handleDeleteConfirm}
                disabled={isDeleting || isSigning}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigning ? "Signing..." : isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
