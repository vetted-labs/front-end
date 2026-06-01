"use client";

import { useState } from "react";
import { ExternalLink, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { questsApi } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { toast } from "sonner";
import type { PendingSubmission } from "@/types";

interface QuestReviewPanelProps {
  wallet: string;
}

/** Officer/master review surface: approve or reject pending verifiable submissions. */
export function QuestReviewPanel({ wallet }: QuestReviewPanelProps) {
  const [items, setItems] = useState<PendingSubmission[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const { execute } = useApi();

  const { isLoading, refetch } = useFetch(
    () => questsApi.listPendingSubmissions(wallet),
    {
      skip: !wallet,
      onSuccess: setItems,
      onError: () => toast.error("Failed to load submissions"),
    },
  );

  async function review(id: string, decision: "approve" | "reject") {
    setActingId(id);
    await execute(() => questsApi.reviewSubmission(id, wallet, decision), {
      onSuccess: () => {
        toast.success(decision === "approve" ? "Approved — reward granted" : "Submission rejected");
        setItems((prev) => prev.filter((i) => i.id !== id));
        refetch();
      },
      onError: (msg) => toast.error(msg),
    });
    setActingId(null);
  }

  if (!isLoading && items.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="Nothing to review"
        description="Verifiable quest submissions from experts in your guilds will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const submission = item.submission as { text?: string; url?: string } | null;
        return (
          <div key={item.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.questTitle}</p>
                <p className="text-xs text-muted-foreground">by {item.expertName}</p>
              </div>
              <Badge variant="subtle">+{item.questReward} VETD</Badge>
            </div>

            {submission?.text && (
              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/30 p-3 text-sm text-foreground">
                {submission.text}
              </p>
            )}
            {submission?.url && (
              <a
                href={submission.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View post
              </a>
            )}
            {item.screenshotUrl && (
              <a
                href={questsApi.screenshotUrl(item.id, wallet)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 ml-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ImageIcon className="h-3.5 w-3.5" /> View screenshot
              </a>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={actingId === item.id}
                onClick={() => review(item.id, "reject")}
              >
                Reject
              </Button>
              <Button
                variant="default"
                size="sm"
                isLoading={actingId === item.id}
                onClick={() => review(item.id, "approve")}
              >
                Approve
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
