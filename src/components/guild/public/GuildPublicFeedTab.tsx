"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { ChevronDown, MessageSquare, Plus, BarChart3, Code as CodeIcon, Paperclip } from "lucide-react";
import { guildFeedApi } from "@/lib/api";
import { usePaginatedFetch } from "@/lib/hooks/usePaginatedFetch";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useBookmarks } from "@/lib/hooks/useBookmarks";
import { getFeedPrivileges } from "@/lib/feedPrivileges";
import { Alert } from "@/components/ui";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedProvider } from "@/components/guild/feed/FeedContext";
import { PostCard } from "@/components/guild/feed/PostCard";
import { NewPostModal } from "@/components/guild/feed/NewPostModal";
import { PostDetailModal } from "@/components/guild/feed/PostDetailModal";
import type {
  ExpertMember,
  ExpertRole,
  GuildPost,
  ModerationAction,
  PostSortMode,
  PostTag,
} from "@/types";
import { GuildAboutCard } from "./GuildAboutCard";
import { GuildOnlineNowCard } from "./GuildOnlineNowCard";
import { GuildTrendingCard } from "./GuildTrendingCard";
import { GuildJoinCard } from "./GuildJoinCard";

interface GuildPublicFeedTabProps {
  guildId: string;
  guildName: string;
  guildDescription: string;
  experts: ExpertMember[];
  isMember: boolean;
  membershipRole?: ExpertRole;
  userType?: "candidate" | "company" | "expert" | null;
  onJoinClick: () => void;
  /** Optional tag-count breakdown to label the chips (per mock). */
  tagCounts?: Partial<Record<PostTag | "all" | "hot", number>>;
}

interface FilterChip {
  value: PostTag | "all" | "hot";
  label: string;
}

const FILTER_CHIPS: FilterChip[] = [
  { value: "all", label: "All" },
  { value: "hot", label: "🔥 Hot" },
  { value: "discussion", label: "Discussion" },
  { value: "question", label: "Question" },
  { value: "insight", label: "Insight" },
  { value: "job_related", label: "Job-related" },
];

export function GuildPublicFeedTab({
  guildId,
  guildName,
  guildDescription,
  experts,
  isMember,
  membershipRole,
  userType,
  onJoinClick,
  tagCounts,
}: GuildPublicFeedTabProps) {
  const auth = useAuthContext();
  const { isConnected } = useAccount();
  const isAuthenticated = auth.isAuthenticated || isConnected;

  const privileges = getFeedPrivileges(
    userType ?? auth.userType,
    membershipRole,
    isMember
  );
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const [chip, setChip] = useState<PostTag | "all" | "hot">("all");
  const [sortMode, setSortMode] = useState<PostSortMode>("hot");
  const [showNewPost, setShowNewPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<GuildPost | null>(null);

  // The "🔥 Hot" chip is sort-mode driven (server respects sort=hot). All
  // other chips are tag filters. Translate chip → API params.
  const apiTag: PostTag | "all" = chip === "hot" || chip === "all" ? "all" : chip;
  const apiSort: PostSortMode = chip === "hot" ? "hot" : sortMode;

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
          .getPosts(guildId, { sort: apiSort, tag: apiTag, page: pg, limit })
          .then((res) => ({ data: res.data, total: res.total })),
      [guildId, apiSort, apiTag]
    ),
    { limit: 20 }
  );

  const handlePostCreated = () => {
    setShowNewPost(false);
    refetch();
  };

  const handlePostModerated = (_postId: string, action: ModerationAction) => {
    if (action === "delete") setSelectedPost(null);
    refetch();
  };

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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-7 items-start">
        {/* Main column */}
        <div>
          {/* Composer */}
          <div className="mb-4 rounded-[14px] border border-surface-border bg-surface-1 px-4 py-3.5 flex gap-3 items-center hover:border-surface-border-strong transition-colors">
            <div className="w-7 h-7 rounded-lg bg-surface-2 border border-surface-border flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
              {(auth.email || "?").trim().slice(0, 1).toUpperCase()}
            </div>
            <button
              onClick={() => showNewPostButton && setShowNewPost(true)}
              className="flex-1 text-left text-sm text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed"
              disabled={!showNewPostButton}
            >
              {showNewPostButton
                ? "Share something with the guild — ask a question, post an insight, or open a discussion…"
                : isMember
                  ? "Posting requires apprentice rank or higher."
                  : "Join the guild to post."}
            </button>
            <div className="hidden sm:flex gap-1.5">
              <button
                disabled
                title="Add poll"
                className="w-8 h-8 rounded-lg bg-surface-2 border border-surface-border flex items-center justify-center text-muted-foreground"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button
                disabled
                title="Attach"
                className="w-8 h-8 rounded-lg bg-surface-2 border border-surface-border flex items-center justify-center text-muted-foreground"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
              <button
                disabled
                title="Code"
                className="w-8 h-8 rounded-lg bg-surface-2 border border-surface-border flex items-center justify-center text-muted-foreground"
              >
                <CodeIcon className="w-3.5 h-3.5" />
              </button>
              {showNewPostButton && (
                <button
                  onClick={() => setShowNewPost(true)}
                  className="ml-1 inline-flex items-center gap-1 px-3 h-8 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Post
                </button>
              )}
            </div>
          </div>

          {/* Filter chips + sort */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {FILTER_CHIPS.map((c) => {
              const isActive = chip === c.value;
              const count = tagCounts?.[c.value];
              return (
                <button
                  key={c.value}
                  onClick={() => setChip(c.value)}
                  className={`px-3 py-1.5 rounded-full border text-xs inline-flex items-center gap-1.5 transition-all ${
                    isActive
                      ? "bg-primary/[0.12] border-primary/35 text-primary font-semibold"
                      : "bg-surface-1 border-surface-border text-muted-foreground hover:border-surface-border-strong hover:text-foreground"
                  }`}
                >
                  {c.label}
                  {count !== undefined && count > 0 && (
                    <span className="opacity-70">· {count}</span>
                  )}
                </button>
              );
            })}
            <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
              Sort:
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as PostSortMode)}
                disabled={chip === "hot"}
                className="bg-transparent text-foreground font-semibold focus:outline-none disabled:opacity-50"
              >
                <option value="hot">Hot</option>
                <option value="new">New</option>
                <option value="top">Top</option>
              </select>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-[14px] border border-surface-border bg-surface-1 px-5 py-[18px] animate-pulse"
                >
                  <div className="h-4 bg-surface-2 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-surface-2 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-surface-2 rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && !error && posts.length === 0 && (
            <EmptyState
              icon={MessageSquare}
              title="No posts yet"
              description={
                isMember
                  ? "Be the first to start a discussion in this guild!"
                  : "No discussions have been started in this guild yet."
              }
              action={
                showNewPostButton
                  ? { label: "Create First Post", onClick: () => setShowNewPost(true) }
                  : undefined
              }
            />
          )}

          {!isLoading && !error && posts.length > 0 && (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isBookmarked={isBookmarked(post.id)}
                  onBookmarkToggle={toggleBookmark}
                  onClick={() => setSelectedPost(post)}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <GuildAboutCard description={guildDescription} />
          <GuildOnlineNowCard experts={experts} />
          <GuildTrendingCard />
          <GuildJoinCard
            guildName={guildName}
            onApply={onJoinClick}
            hidden={isMember}
          />
        </aside>
      </div>

      {showNewPost && (
        <NewPostModal
          guildId={guildId}
          onClose={() => setShowNewPost(false)}
          onCreated={handlePostCreated}
        />
      )}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          isBookmarked={isBookmarked(selectedPost.id)}
          onBookmarkToggle={toggleBookmark}
          onClose={() => setSelectedPost(null)}
          onPostModerated={handlePostModerated}
        />
      )}
    </FeedProvider>
  );
}
