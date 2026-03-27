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

/** Colored left accent border based on post tag */
const tagAccentColors: Record<string, string> = {
  insight: "bg-warning",
  question: "bg-info-blue",
  discussion: "bg-primary",
  job_related: "bg-positive",
};

export function PostCard({
  post,
  onClick,
  isBookmarked,
  onBookmarkToggle,
}: PostCardProps) {
  const isSolved = !!post.acceptedReplyId && post.tag === "question";
  const isClosed = post.isClosed ?? false;
  const accentColor = tagAccentColors[post.tag] || "bg-primary";

  return (
    <div
      onClick={onClick}
      className="group flex overflow-hidden rounded-xl border border-border bg-card hover:border-primary/30 transition-all cursor-pointer"
    >
      {/* Colored left accent border */}
      <div className={`w-[3px] flex-shrink-0 rounded-l-xl ${accentColor}`} />

      {/* Content */}
      <div className="flex-1 min-w-0 p-5">
        {/* Pinned indicator */}
        {post.isPinned && (
          <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
            <svg className="w-[11px] h-[11px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
            Pinned
          </div>
        )}

        {/* Author + Tag + Time */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <AuthorBadge author={post.author} showReputation />
          <PostTagBadge tag={post.tag} />
          {isSolved && <AcceptedAnswerBadge variant="post-card" />}
          <span className="text-xs text-muted-foreground">
            {formatTimeAgo(post.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold font-display text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
          {isClosed && <span className="text-muted-foreground mr-1.5">[Closed]</span>}
          {post.title}
        </h3>

        {/* Body Preview */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {stripMarkdown(post.body)}
        </p>

        {/* Footer: inline upvote + replies + bookmark */}
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <VoteButton
            targetId={post.id}
            targetType="post"
            upvoteCount={post.upvoteCount}
            hasVoted={post.hasVoted}
            scoreHidden={post.scoreHidden}
          />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{post.replyCount} {post.replyCount === 1 ? "reply" : "replies"}</span>
          </div>
          <BookmarkButton
            targetId={post.id}
            isBookmarked={isBookmarked}
            onBookmarkToggle={onBookmarkToggle}
          />
        </div>
      </div>
    </div>
  );
}
