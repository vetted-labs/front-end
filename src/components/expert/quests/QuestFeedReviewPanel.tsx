"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { questsTeamApi } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { formatTimeAgo } from "@/lib/utils";
import { toast } from "sonner";
import type { QuestFeedPost } from "@/types";

/**
 * TEAM-ONLY review queue for shared quest answers (VET-115 part 2). Gated like
 * the platform-admin surfaces — `questsTeamApi` authenticates via the SIWE
 * Bearer JWT and the backend rejects non-admins with 403. Approving a post
 * publishes it AND lifts the author's streak-2 allocation server-side.
 *
 * Reuses the `QuestReviewPanel` interaction pattern (list → approve/reject),
 * adding an optional per-post review note.
 */
export function QuestFeedReviewPanel() {
  const [items, setItems] = useState<QuestFeedPost[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);
  const { execute } = useApi();

  const { isLoading, refetch } = useFetch(() => questsTeamApi.getPendingFeedPosts(), {
    onSuccess: setItems,
    onError: (msg) => toast.error(msg || "Failed to load pending answers"),
  });

  async function review(post: QuestFeedPost, decision: "approve" | "reject") {
    setActingId(post.id);
    await execute(
      () => questsTeamApi.reviewFeedPost(post.id, decision, notes[post.id]?.trim() || undefined),
      {
        onSuccess: () => {
          toast.success(decision === "approve" ? "Answer approved" : "Answer rejected");
          setItems((prev) => prev.filter((i) => i.id !== post.id));
          refetch();
        },
        onError: (msg) => toast.error(msg),
      },
    );
    setActingId(null);
  }

  if (!isLoading && items.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="Nothing to review"
        description="Shared quest answers awaiting team approval will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((post) => (
        <div key={post.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {post.author?.name || "Anonymous expert"}
              </p>
              <p className="text-xs text-muted-foreground">
                {post.createdAt ? `Shared ${formatTimeAgo(post.createdAt)}` : "Shared answer"}
              </p>
            </div>
            <Badge variant="subtle">{post.expertiseField}</Badge>
          </div>

          <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/30 p-3 text-sm text-foreground">
            {post.answerText}
          </p>

          <Textarea
            label="Review note (optional)"
            value={notes[post.id] ?? ""}
            onChange={(e) => setNotes((prev) => ({ ...prev, [post.id]: e.target.value }))}
            rows={2}
            maxLength={1000}
            className="mt-3"
          />

          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={actingId === post.id}
              onClick={() => review(post, "reject")}
            >
              Reject
            </Button>
            <Button
              variant="default"
              size="sm"
              isLoading={actingId === post.id}
              onClick={() => review(post, "approve")}
            >
              Approve
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
