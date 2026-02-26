"use client";

import { MessageSquare } from "lucide-react";
import { formatTimeAgo, stripMarkdown } from "@/lib/utils";
import { VoteButton } from "./VoteButton";
import { BookmarkButton } from "./BookmarkButton";
import { AuthorBadge } from "./AuthorBadge";
import { PostTagBadge } from "./PostTag";
import { AcceptedAnswerBadge } from "./AcceptedAnswerBadge";
import type { GuildPost } from "@/types";

interface PostCardProps {
  post: GuildPost;
  isBookmarked?: boolean;
  onBookmarkToggle?: (id: string) => void;
  onClick: () => void;
}

export function PostCard({
  post,
  onClick,
  isBookmarked,
  onBookmarkToggle,
}: PostCardProps) {
  const isSolved = !!post.acceptedReplyId && post.tag === "question";
  const isClosed = post.isClosed ?? false;

  return (
    <div
      onClick={onClick}
      className="flex gap-3 rounded-xl border border-border bg-card/80 backdrop-blur p-4 hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer"
    >
      {/* Vote + Bookmark Column */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5" onClick={(e) => e.stopPropagation()}>
        <VoteButton
          targetId={post.id}
          targetType="post"
          upvoteCount={post.upvoteCount}
          hasVoted={post.hasVoted}
          scoreHidden={post.scoreHidden}
        />
        <BookmarkButton
          targetId={post.id}
          isBookmarked={isBookmarked}
          onBookmarkToggle={onBookmarkToggle}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Author + Tag + Time + Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <AuthorBadge author={post.author} showReputation />
          <PostTagBadge tag={post.tag} />
          {isSolved && <AcceptedAnswerBadge variant="post-card" />}
          <span className="text-xs text-muted-foreground">
            {formatTimeAgo(post.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
          {post.isPinned && (
            <span className="text-primary mr-1.5">[Pinned]</span>
          )}
          {isClosed && (
            <span className="text-muted-foreground mr-1.5">[Closed]</span>
          )}
          {post.title}
        </h3>

        {/* Body Preview */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {stripMarkdown(post.body)}
        </p>

        {/* Reply Count */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>
            {post.replyCount} {post.replyCount === 1 ? "reply" : "replies"}
          </span>
        </div>
      </div>
    </div>
  );
}
