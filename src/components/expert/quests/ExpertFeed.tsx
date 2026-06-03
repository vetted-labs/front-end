"use client";

import { useCallback, useState } from "react";
import { ChevronUp, MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { DataSection } from "@/lib/motion";
import { questsApi } from "@/lib/api";
import { useApi } from "@/lib/hooks/useFetch";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { EXPERTISE_FIELDS } from "@/config/quests";
import { cn, formatTimeAgo } from "@/lib/utils";
import { toast } from "sonner";
import type { QuestFeedPost } from "@/types";

interface ExpertFeedProps {
  wallet: string;
}

type SortMode = "top" | "new";

/**
 * Public expert feed surface (VET-115 part 2). Lists approved shared answers,
 * filterable by expertise field and sortable by top / new, with an optimistic
 * upvote toggle. Visual language reuses the guild-feed vote button pattern.
 */
export function ExpertFeed({ wallet }: ExpertFeedProps) {
  const [field, setField] = useState<string>("");
  const [sort, setSort] = useState<SortMode>("top");
  const [posts, setPosts] = useState<QuestFeedPost[]>([]);
  const { execute, isLoading } = useApi<QuestFeedPost[]>();

  // Imperative load with explicit filter args so a field/sort change pulls the
  // right query immediately (avoids the stale-closure trap of refetch()).
  const load = useCallback(
    (nextField: string, nextSort: SortMode) => {
      if (!wallet) return;
      execute(
        () => questsApi.getFeed(wallet, { field: nextField || undefined, sort: nextSort }),
        {
          onSuccess: setPosts,
          onError: () => toast.error("Failed to load the feed"),
        },
      );
    },
    [wallet, execute],
  );

  useMountEffect(() => {
    load(field, sort);
  });

  const changeField = (next: string) => {
    setField(next);
    load(next, sort);
  };
  const changeSort = (next: SortMode) => {
    setSort(next);
    load(field, next);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={field === ""} onClick={() => changeField("")}>
            All fields
          </FilterChip>
          {EXPERTISE_FIELDS.map((f) => (
            <FilterChip key={f} active={field === f} onClick={() => changeField(f)}>
              {f}
            </FilterChip>
          ))}
        </div>
        <div className="flex gap-1.5">
          <FilterChip active={sort === "top"} onClick={() => changeSort("top")}>
            Top
          </FilterChip>
          <FilterChip active={sort === "new"} onClick={() => changeSort("new")}>
            New
          </FilterChip>
        </div>
      </div>

      <DataSection
        isLoading={isLoading}
        skeleton={
          <div className="space-y-3">
            <SkeletonCard className="min-h-[120px]" />
            <SkeletonCard className="min-h-[120px]" />
          </div>
        }
      >
        {posts.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title="No answers yet"
            description={
              field
                ? `No approved answers in ${field} yet — check back soon.`
                : "Approved expert answers will appear here. Be the first to share one from a completed quest."
            }
          />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                wallet={wallet}
                onUpdate={(updated) =>
                  setPosts((prev) =>
                    prev.map((p) => (p.id === updated.id ? updated : p)),
                  )
                }
              />
            ))}
          </div>
        )}
      </DataSection>
    </div>
  );
}

interface FeedPostCardProps {
  post: QuestFeedPost;
  wallet: string;
  onUpdate: (post: QuestFeedPost) => void;
}

function FeedPostCard({ post, wallet, onUpdate }: FeedPostCardProps) {
  const [voting, setVoting] = useState(false);

  async function toggle() {
    if (voting) return;
    // Optimistic update first.
    const optimistic: QuestFeedPost = {
      ...post,
      hasUpvoted: !post.hasUpvoted,
      upvoteCount: post.upvoteCount + (post.hasUpvoted ? -1 : 1),
    };
    onUpdate(optimistic);
    setVoting(true);
    try {
      const res = await questsApi.toggleUpvote(post.id, wallet);
      onUpdate({ ...post, hasUpvoted: res.voted, upvoteCount: res.upvoteCount });
    } catch {
      // Roll back to the server-truth snapshot we started from.
      onUpdate(post);
      toast.error("Failed to vote");
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card p-4">
      <button
        type="button"
        data-testid="feed-upvote-button"
        onClick={toggle}
        disabled={voting}
        aria-pressed={post.hasUpvoted}
        className={cn(
          "flex h-fit flex-col items-center gap-1 rounded-lg px-2 py-1.5 transition-colors",
          post.hasUpvoted
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
        )}
      >
        <ChevronUp className="h-5 w-5" />
        <span className="text-xs font-semibold leading-none tabular-nums">
          {post.upvoteCount}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {post.expertiseField}
          </span>
          <span className="text-xs text-muted-foreground">
            {post.author?.name || "Anonymous expert"}
            {post.createdAt && <> · {formatTimeAgo(post.createdAt)}</>}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {post.answerText}
        </p>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
