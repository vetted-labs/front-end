"use client";

import { useState } from "react";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui";
import { guildFeedApi } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { formatTimeAgo } from "@/lib/utils";
import { toast } from "sonner";
import { useFeedContext } from "./FeedContext";
import { AuthorBadge } from "./AuthorBadge";
import { PostTagBadge } from "./PostTag";
import { VoteButton } from "./VoteButton";
import { BookmarkButton } from "./BookmarkButton";
import { ThreadedReplyList } from "./ThreadedReplyList";
import { PollDisplay } from "./PollDisplay";
import { MarkdownBody } from "./MarkdownBody";
import { ModerationMenu } from "./ModerationMenu";
import type {
  GuildPost,
  GuildPostReply,
  ModerationAction,
} from "@/types";

interface PostDetailModalProps {
  post: GuildPost;
  isBookmarked?: boolean;
  onBookmarkToggle?: (id: string) => void;
  onClose: () => void;
  onPostModerated?: (postId: string, action: ModerationAction) => void;
}

export function PostDetailModal({
  post,
  isBookmarked,
  onBookmarkToggle,
  onClose,
  onPostModerated,
}: PostDetailModalProps) {
  const { guildId, isAuthenticated, isMember, privileges, userId, onVoteUpdate } = useFeedContext();
  const [replyText, setReplyText] = useState("");
  const [acceptedReplyId, setAcceptedReplyId] = useState<string | undefined>(
    post.acceptedReplyId
  );
  const [localPost, setLocalPost] = useState(post);
  const {
    execute: submitReply,
    isLoading: isSubmitting,
    error: replyError,
  } = useApi<GuildPostReply>();

  const {
    data: repliesData,
    isLoading: repliesLoading,
    error: repliesError,
    refetch: refetchReplies,
  } = useFetch(() =>
    guildFeedApi.getReplies(guildId, post.id, { sort: "new", limit: 50 })
  );

  const replies = repliesData?.data ?? [];
  const replyCount = repliesData?.total ?? post.replyCount;
  const isPostAuthor = !!userId && post.author.id === userId;
  const isClosed = localPost.isClosed ?? false;

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      toast.error("Reply must be at most 2000 characters");
      return;
    }

    await submitReply(
      () => guildFeedApi.createReply(guildId, post.id, { body: trimmed }),
      {
        onSuccess: () => {
          setReplyText("");
          refetchReplies();
          toast.success("Reply posted!");
        },
        onError: (err) => toast.error(err),
      }
    );
  };

  const handleAcceptAnswer = async (replyId: string) => {
    try {
      await guildFeedApi.acceptAnswer(guildId, post.id, { replyId });
      setAcceptedReplyId(replyId);
      toast.success("Answer accepted!");
    } catch {
      toast.error("Failed to accept answer");
    }
  };

  const handleModerated = (action: ModerationAction) => {
    if (action === "pin") {
      setLocalPost((p) => ({ ...p, isPinned: true }));
    } else if (action === "unpin") {
      setLocalPost((p) => ({ ...p, isPinned: false }));
    } else if (action === "close") {
      setLocalPost((p) => ({ ...p, isClosed: true }));
    } else if (action === "reopen") {
      setLocalPost((p) => ({ ...p, isClosed: false }));
    } else if (action === "delete") {
      onClose();
    }
    onPostModerated?.(post.id, action);
  };

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Back Button + Moderation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </button>

          <ModerationMenu
            guildId={guildId}
            postId={post.id}
            isPinned={localPost.isPinned}
            isClosed={isClosed}
            privileges={privileges}
            onModerated={handleModerated}
          />
        </div>

        {/* Post Header */}
        <div>
          {/* Author Info */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <AuthorBadge author={post.author} showReputation />
            <PostTagBadge tag={post.tag} />
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(post.createdAt)}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-foreground mb-3">
            {localPost.isPinned && (
              <span className="text-primary mr-1.5">[Pinned]</span>
            )}
            {isClosed && (
              <span className="text-muted-foreground mr-1.5">[Closed]</span>
            )}
            {post.title}
          </h2>

          {/* Body */}
          <MarkdownBody content={post.body} className="text-sm text-foreground/90" />

          {/* Poll */}
          {localPost.poll && (
            <div className="mt-4">
              <PollDisplay
                guildId={guildId}
                postId={post.id}
                poll={localPost.poll}
                isAuthenticated={isAuthenticated}
              />
            </div>
          )}

          {/* Post Voting + Bookmark */}
          <div className="mt-2 mb-1 flex items-center gap-2">
            <VoteButton
              targetId={post.id}
              targetType="post"
              upvoteCount={post.upvoteCount}
              hasVoted={post.hasVoted}
              scoreHidden={post.scoreHidden}
              onVoteUpdate={onVoteUpdate ? () => onVoteUpdate() : undefined}
            />
            <BookmarkButton
              targetId={post.id}
              isBookmarked={isBookmarked}
              onBookmarkToggle={onBookmarkToggle}
            />
          </div>
        </div>

        {/* Replies Section */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              {replyCount} {replyCount === 1 ? "Reply" : "Replies"}
            </h3>
          </div>

          {/* Top-level Reply Composer */}
          {isAuthenticated && isMember && !isClosed && (
            <div className="mb-5 space-y-2">
              <form onSubmit={handleReplySubmit}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    maxLength={2000}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !replyText.trim()}
                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmitting ? "..." : "Reply"}
                  </button>
                </div>
              </form>
              {replyError && (
                <Alert variant="error">{replyError}</Alert>
              )}
            </div>
          )}

          {/* Closed notice */}
          {isClosed && (
            <p className="text-xs text-muted-foreground mb-4 italic">
              This post is closed. No new replies can be added.
            </p>
          )}

          {/* Non-member notice */}
          {!isClosed && (!isAuthenticated || !isMember) && (
            <p className="text-xs text-muted-foreground mb-4 italic">
              {!isAuthenticated
                ? "Sign in to reply to this post."
                : "Join this guild to reply to posts."}
            </p>
          )}

          {/* Replies Error */}
          {repliesError && <Alert variant="error">{repliesError}</Alert>}

          {/* Replies Loading */}
          {repliesLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse p-3 rounded-lg bg-muted/30"
                >
                  <div className="h-3 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Replies List (Threaded) */}
          {!repliesLoading && replies.length === 0 && !repliesError && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No replies yet. Be the first to respond!
            </p>
          )}

          {!repliesLoading && replies.length > 0 && (
            <ThreadedReplyList
              postId={post.id}
              replies={replies}
              acceptedReplyId={acceptedReplyId}
              isPostAuthor={isPostAuthor}
              onAcceptAnswer={handleAcceptAnswer}
              onRepliesChanged={refetchReplies}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
