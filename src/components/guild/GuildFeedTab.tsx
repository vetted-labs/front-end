"use client";

import { useState, useCallback } from "react";
import { Plus, MessageSquare, Flame, Clock, TrendingUp, Bookmark } from "lucide-react";
import { guildFeedApi } from "@/lib/api";
import { usePaginatedFetch } from "@/lib/hooks/usePaginatedFetch";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useAccount } from "wagmi";
import { getFeedPrivileges } from "@/lib/feedPrivileges";
import { useBookmarks } from "@/lib/hooks/useBookmarks";
import { Alert } from "@/components/ui";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedProvider } from "./feed/FeedContext";
import { PostCard } from "./feed/PostCard";
import { NewPostModal } from "./feed/NewPostModal";
import { PostDetailModal } from "./feed/PostDetailModal";
import type {
  GuildPost,
  PostSortMode,
  PostTag,
  TopTimeWindow,
  ExpertRole,
  ModerationAction,
} from "@/types";

interface GuildFeedTabProps {
  guildId: string;
  isMember: boolean;
  membershipRole?: ExpertRole;
  userType?: "candidate" | "company" | "expert" | null;
}

const TAG_OPTIONS: { value: PostTag | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "discussion", label: "Discussion" },
  { value: "question", label: "Question" },
  { value: "insight", label: "Insight" },
  { value: "job_related", label: "Job-Related" },
];

export function GuildFeedTab({
  guildId,
  isMember,
  membershipRole,
  userType,
}: GuildFeedTabProps) {
  const auth = useAuthContext();
  const { isConnected } = useAccount();
  const isAuthenticated = auth.isAuthenticated || isConnected;

  const privileges = getFeedPrivileges(
    userType ?? auth.userType,
    membershipRole,
    isMember
  );
  const { isBookmarked, toggleBookmark, bookmarkCount } = useBookmarks();

  const [sortMode, setSortMode] = useState<PostSortMode>("hot");
  const [tagFilter, setTagFilter] = useState<PostTag | "all">("all");
  const [timeWindow, setTimeWindow] = useState<TopTimeWindow>("week");
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<GuildPost | null>(null);

  const {
    data: posts = [],
    isLoading,
    error,
    page,
    totalPages,
    setPage,
    refetch,
  } = usePaginatedFetch<GuildPost>(
    useCallback(
      (pg: number, limit: number) =>
        guildFeedApi
          .getPosts(guildId, {
            sort: sortMode,
            tag: tagFilter,
            timeWindow: sortMode === "top" ? timeWindow : undefined,
            page: pg,
            limit,
          })
          .then((res) => ({ data: res.data, total: res.total })),
      [guildId, sortMode, tagFilter, timeWindow]
    ),
    { limit: 20 }
  );

  const handlePostCreated = () => {
    setShowNewPost(false);
    refetch();
  };

  const handlePostModerated = (_postId: string, action: ModerationAction) => {
    if (action === "delete") {
      setSelectedPost(null);
    }
    refetch();
  };

  // Gate new post button: authenticated member with canPost privilege
  const showNewPostButton = isAuthenticated && isMember && privileges.canPost;

  return (
    <FeedProvider
      value={{
        guildId,
        isAuthenticated,
        isMember,
        privileges,
        userId: auth.userId,
        onVoteUpdate: () => refetch(),
        onRepliesChanged: () => refetch(),
      }}
    >
    <div className="space-y-6">
      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* New Post Button */}
        {showNewPostButton && (
          <button
            onClick={() => setShowNewPost(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        )}

        {/* Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSortMode("hot")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              sortMode === "hot"
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-muted-foreground border border-border hover:text-foreground hover:border-primary/30"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Hot
          </button>
          <button
            onClick={() => setSortMode("new")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              sortMode === "new"
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-muted-foreground border border-border hover:text-foreground hover:border-primary/30"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            New
          </button>
          <button
            onClick={() => setSortMode("top")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              sortMode === "top"
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-muted-foreground border border-border hover:text-foreground hover:border-primary/30"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Top
          </button>

          {/* Time window dropdown for Top sort */}
          {sortMode === "top" && (
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value as TopTimeWindow)}
              className="px-3 py-1.5 rounded-full text-sm font-medium border border-border bg-card text-foreground"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          )}

          {/* Bookmarked filter */}
          {bookmarkCount > 0 && (
            <button
              onClick={() => setShowBookmarked((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                showBookmarked
                  ? "bg-blue-500/20 text-blue-500 border border-blue-500/40"
                  : "text-muted-foreground border border-border hover:text-foreground hover:border-primary/30"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${showBookmarked ? "fill-blue-500" : ""}`} />
              Saved
            </button>
          )}
        </div>
      </div>

      {/* Tag Filters */}
      <div className="flex flex-wrap gap-2">
        {TAG_OPTIONS.map((tag) => (
          <button
            key={tag.value}
            onClick={() => setTagFilter(tag.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              tagFilter === tag.value
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground border border-border/60 hover:text-foreground hover:border-border"
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card/60 p-5 animate-pulse"
            >
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Posts List */}
      {(() => {
        const displayPosts = showBookmarked
          ? posts.filter((p) => isBookmarked(p.id))
          : posts;

        if (!isLoading && !error && displayPosts.length === 0) {
          return (
            <EmptyState
              icon={showBookmarked ? Bookmark : MessageSquare}
              title={showBookmarked ? "No saved posts" : "No posts yet"}
              description={
                showBookmarked
                  ? "Bookmark posts to save them for later."
                  : isMember
                    ? "Be the first to start a discussion in this guild!"
                    : "No discussions have been started in this guild yet."
              }
              action={
                showBookmarked
                  ? { label: "Show All Posts", onClick: () => setShowBookmarked(false) }
                  : showNewPostButton
                    ? { label: "Create First Post", onClick: () => setShowNewPost(true) }
                    : undefined
              }
            />
          );
        }

        return null;
      })()}

      {!isLoading && !error && posts.length > 0 && (() => {
        const displayPosts = showBookmarked
          ? posts.filter((p) => isBookmarked(p.id))
          : posts;
        if (displayPosts.length === 0) return null;
        return (
          <div className="space-y-3">
            {displayPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isBookmarked={isBookmarked(post.id)}
                onBookmarkToggle={toggleBookmark}
                onClick={() => setSelectedPost(post)}
              />
            ))}
          </div>
        );
      })()}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* New Post Modal */}
      {showNewPost && (
        <NewPostModal
          guildId={guildId}
          onClose={() => setShowNewPost(false)}
          onCreated={handlePostCreated}
        />
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          isBookmarked={isBookmarked(selectedPost.id)}
          onBookmarkToggle={toggleBookmark}
          onClose={() => setSelectedPost(null)}
          onPostModerated={handlePostModerated}
        />
      )}
    </div>
    </FeedProvider>
  );
}
