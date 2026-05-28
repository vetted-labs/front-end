"use client";

import { useState } from "react";
import { ArrowLeft, MessageSquare, Send, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui";
import { guildFeedApi } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { useExpertSession } from "@/lib/hooks/useExpertSession";
import { validateMinLength } from "@/lib/validation";
import { formatTimeAgo } from "@/lib/utils";
import { toast } from "sonner";
import { useFeedContext } from "./FeedContext";
import { AuthorBadge } from "./AuthorBadge";
import { PostTagBadge } from "./PostTag";
import { VoteButton } from "./VoteButton";
import { BookmarkButton } from "./BookmarkButton";
import { ReactionBar } from "./ReactionBar";
import { ThreadedReplyList } from "./ThreadedReplyList";
import { PollDisplay } from "./PollDisplay";
import { MarkdownBody } from "./MarkdownBody";
import { ModerationMenu } from "./ModerationMenu";
import type {
  GuildPost,
  GuildPostReply,
  ModerationAction,
  PostTag,
} from "@/types";

interface PostDetailModalProps {
  post: GuildPost;
  isBookmarked?: boolean;
  onBookmarkToggle?: (id: string) => void;
  onClose: () => void;
  onPostModerated?: (postId: string, action: ModerationAction) => void;
}

const TAG_OPTIONS: { value: PostTag; label: string }[] = [
  { value: "discussion", label: "Discussion" },
  { value: "question", label: "Question" },
  { value: "insight", label: "Insight" },
  { value: "job_related", label: "Job-Related" },
];

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
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const [editTag, setEditTag] = useState<PostTag>(post.tag);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    execute: submitReply,
    isLoading: isSubmitting,
    error: replyError,
  } = useApi<GuildPostReply>();
  const { execute: saveEdit, isLoading: isSavingEdit, error: editError } = useApi<GuildPost>();
  const { execute: runDelete, isLoading: isDeleting } = useApi<{ success: boolean }>();
  const { ensureSession, isSigning } = useExpertSession();

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
    } else if (action === "mark_duplicate") {
      // mark_duplicate also closes the post (backend semantics — see
      // guild-post.service.ts moderatePost case).
      setLocalPost((p) => ({ ...p, isClosed: true }));
    }
    onPostModerated?.(post.id, action);
  };

  const enterEditMode = () => {
    setEditTitle(localPost.title);
    setEditBody(localPost.body);
    setEditTag(localPost.tag);
    setEditFieldErrors({});
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditFieldErrors({});
  };

  const validateEdit = (): boolean => {
    const errors: Record<string, string> = {};
    const titleMinErr = validateMinLength(editTitle, 5, "Title");
    if (titleMinErr) errors.title = titleMinErr;
    else if (editTitle.length > 200) errors.title = "Title must be at most 200 characters";

    const bodyMinErr = validateMinLength(editBody, 10, "Body");
    if (bodyMinErr) errors.body = bodyMinErr;
    else if (editBody.length > 5000) errors.body = "Body must be at most 5000 characters";

    setEditFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEdit()) return;

    // Gate: ensure the expert has a fresh signed-session JWT before mutating.
    // flag-off falls through to legacy behavior so the soft rollout works.
    const session = await ensureSession();
    if (!session.ok && session.reason !== "flag-off") {
      if (session.reason === "user-rejected") {
        toast.error("Sign to participate");
      } else {
        toast.error(session.error ?? "Could not authenticate. Please try again.");
      }
      return;
    }

    await saveEdit(
      () =>
        guildFeedApi.updatePost(guildId, post.id, {
          title: editTitle.trim(),
          body: editBody.trim(),
          tag: editTag,
        }),
      {
        onSuccess: (updated) => {
          if (updated) {
            setLocalPost((prev) => ({
              ...prev,
              title: updated.title,
              body: updated.body,
              tag: updated.tag,
              updatedAt: updated.updatedAt,
            }));
          }
          setIsEditing(false);
          toast.success("Post updated");
        },
        onError: (err) => toast.error(err),
      }
    );
  };

  const handleDeleteRequest = () => {
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

    await runDelete(
      () => guildFeedApi.deletePost(guildId, post.id),
      {
        onSuccess: () => {
          toast.success("Post deleted");
          setShowDeleteConfirm(false);
          onPostModerated?.(post.id, "delete");
          onClose();
        },
        onError: (err) => {
          toast.error(err);
          setShowDeleteConfirm(false);
        },
      }
    );
  };

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Back Button + Author Actions + Moderation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </button>

          <div className="flex items-center gap-1">
            {isPostAuthor && !isEditing && (
              <>
                <button
                  type="button"
                  data-testid="edit-post"
                  onClick={enterEditMode}
                  disabled={isSavingEdit || isDeleting || isSigning}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Edit post"
                  title="Edit post"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  data-testid="delete-post"
                  onClick={handleDeleteRequest}
                  disabled={isSavingEdit || isDeleting || isSigning}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Delete post"
                  title="Delete post"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </>
            )}

            <ModerationMenu
              guildId={guildId}
              postId={post.id}
              isPinned={localPost.isPinned}
              isClosed={isClosed}
              privileges={privileges}
              onModerated={handleModerated}
            />
          </div>
        </div>

        {/* Post Header — Edit Mode vs Read Mode */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && <Alert variant="error">{editError}</Alert>}

            {/* Tag Selector */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tag
              </label>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEditTag(option.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      editTag === option.value
                        ? "bg-primary/20 text-primary border-primary/40"
                        : "text-muted-foreground border-border hover:text-foreground hover:border-primary/30"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="edit-post-title"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Title
              </label>
              <input
                id="edit-post-title"
                data-testid="edit-post-title-input"
                type="text"
                value={editTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  if (editFieldErrors.title) {
                    setEditFieldErrors((prev) => ({ ...prev, title: "" }));
                  }
                }}
                maxLength={200}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
              />
              {editFieldErrors.title && (
                <p className="mt-1 text-xs text-destructive">{editFieldErrors.title}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground text-right">
                {editTitle.length}/200
              </p>
            </div>

            {/* Body */}
            <div>
              <label
                htmlFor="edit-post-body"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Body <span className="text-muted-foreground font-normal">(Markdown supported)</span>
              </label>
              <textarea
                id="edit-post-body"
                data-testid="edit-post-body-input"
                value={editBody}
                onChange={(e) => {
                  setEditBody(e.target.value);
                  if (editFieldErrors.body) {
                    setEditFieldErrors((prev) => ({ ...prev, body: "" }));
                  }
                }}
                rows={8}
                maxLength={5000}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 resize-y"
              />
              {editFieldErrors.body && (
                <p className="mt-1 text-xs text-destructive">{editFieldErrors.body}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground text-right">
                {editBody.length}/5000
              </p>
            </div>

            {/* Edit actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isSavingEdit || isSigning}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="save-post-edit"
                disabled={isSavingEdit || isSigning}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigning ? "Signing..." : isSavingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <div>
            {/* Author Info */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <AuthorBadge author={post.author} showReputation />
              <PostTagBadge tag={localPost.tag} />
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(post.createdAt)}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-foreground mb-3">
              {localPost.isPinned && (
                <span className="text-primary mr-1.5">[Pinned]</span>
              )}
              {isClosed && (
                <span className="text-muted-foreground mr-1.5">[Closed]</span>
              )}
              {localPost.title}
            </h2>

            {/* Body */}
            <MarkdownBody content={localPost.body} className="text-sm text-foreground/90" />

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

            {/* Post Voting + Reactions + Bookmark */}
            <div className="mt-2 mb-1 flex items-center gap-2">
              <VoteButton
                targetId={post.id}
                targetType="post"
                upvoteCount={post.upvoteCount}
                hasVoted={post.hasVoted}
                scoreHidden={post.scoreHidden}
                onVoteUpdate={onVoteUpdate ? () => onVoteUpdate() : undefined}
              />
              <ReactionBar
                targetId={post.id}
                targetType="post"
                guildId={guildId}
                summary={localPost.reactions}
              />
              <BookmarkButton
                targetId={post.id}
                isBookmarked={isBookmarked}
                onBookmarkToggle={onBookmarkToggle}
              />
            </div>
          </div>
        )}

        {/* Replies Section */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {replyCount} {replyCount === 1 ? "Reply" : "Replies"}
            </h3>
          </div>

          {/* Top-level Reply Composer */}
          {isAuthenticated && isMember && !isClosed && !isEditing && (
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
                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen
          onClose={handleDeleteCancel}
          title="Delete this post?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This permanently removes the post and all of its replies. This
              action cannot be undone.
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
                data-testid="confirm-delete-post"
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
    </Modal>
  );
}
