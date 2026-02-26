"use client";

import { useState } from "react";
import { Send, CheckCircle2, MessageSquare, ChevronDown } from "lucide-react";
import { guildFeedApi } from "@/lib/api";
import { useApi } from "@/lib/hooks/useFetch";
import { formatTimeAgo } from "@/lib/utils";
import { toast } from "sonner";
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
        <div className="rounded-lg border-2 border-emerald-500/40 bg-emerald-500/5 p-3">
          <AcceptedAnswerBadge variant="reply" />
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
  const [showInlineReply, setShowInlineReply] = useState(false);
  const [inlineReplyText, setInlineReplyText] = useState("");
  const [showChildren, setShowChildren] = useState(true);
  const [loadedChildren, setLoadedChildren] = useState<GuildPostReply[]>(reply.children ?? []);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const { execute: submitReply, isLoading: isSubmitting } = useApi<GuildPostReply>();

  const childCount = reply.childCount ?? 0;
  const hasUnloadedChildren = childCount > 0 && loadedChildren.length === 0 && !reply.children;
  const canReplyInline = depth < MAX_DEPTH && isAuthenticated && isMember;
  const canAccept =
    !acceptedReplyId && (isPostAuthor || privileges.canAcceptOnBehalf);

  const handleLoadChildren = async () => {
    if (loadingChildren) return;
    setLoadingChildren(true);
    try {
      const res = await guildFeedApi.getReplies(guildId, postId, {
        parentReplyId: reply.id,
        sort: "new",
        limit: 50,
      });
      setLoadedChildren(res.data);
      setShowChildren(true);
    } catch {
      toast.error("Failed to load replies");
    } finally {
      setLoadingChildren(false);
    }
  };

  const handleInlineReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inlineReplyText.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      toast.error("Reply must be at most 2000 characters");
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

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-border/40 pl-3" : ""}>
      <div className="flex gap-2.5 rounded-lg border border-border/60 bg-card/50 p-3">
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
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
                <CheckCircle2 className="w-3 h-3" />
                Accepted
              </span>
            )}
          </div>
          <MarkdownBody content={reply.body} className="text-sm text-foreground/90 mb-2" />

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {canReplyInline && (
              <button
                onClick={() => setShowInlineReply((prev) => !prev)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                Reply
              </button>
            )}

            {canAccept && (
              <button
                onClick={() => onAcceptAnswer(reply.id)}
                className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" />
                Accept
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
                disabled={isSubmitting || !inlineReplyText.trim()}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                {isSubmitting ? "..." : "Reply"}
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
          className="mt-2 ml-6 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
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
              className="mt-2 ml-6 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
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
    </div>
  );
}
