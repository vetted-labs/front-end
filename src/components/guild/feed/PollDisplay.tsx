"use client";

import { useState } from "react";
import { guildFeedApi } from "@/lib/api";
import { toast } from "sonner";
import type { PostPoll } from "@/types";

interface PollDisplayProps {
  guildId: string;
  postId: string;
  poll: PostPoll;
  isAuthenticated: boolean;
}

function isPollExpired(poll: PostPoll): boolean {
  if (!poll.expiresAt) return false;
  return new Date(poll.expiresAt) < new Date();
}

function formatExpiry(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return `${Math.ceil(diff / (1000 * 60))}m left`;
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

export function PollDisplay({
  guildId,
  postId,
  poll: initialPoll,
  isAuthenticated,
}: PollDisplayProps) {
  const [poll, setPoll] = useState<PostPoll>(initialPoll);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const expired = isPollExpired(poll);
  const showResults = poll.hasVoted || expired;

  const handleSelect = (optionId: string) => {
    if (showResults || submitting) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (poll.choiceMode === "single") {
        return new Set([optionId]);
      }
      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
      }
      return next;
    });
  };

  const handleVote = async () => {
    if (!isAuthenticated) {
      toast.error("Sign in to vote");
      return;
    }
    if (selected.size === 0) {
      toast.error("Select an option");
      return;
    }

    setSubmitting(true);
    try {
      const result = await guildFeedApi.castPollVote(guildId, postId, {
        optionIds: [...selected],
      });
      setPoll(result.poll);
      toast.success("Vote cast!");
    } catch {
      toast.error("Failed to cast vote");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Poll &middot; {poll.choiceMode === "single" ? "Single choice" : "Multiple choice"}
        </span>
        {poll.expiresAt && (
          <span className={`text-xs font-medium ${expired ? "text-red-500" : "text-muted-foreground"}`}>
            {formatExpiry(poll.expiresAt)}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {poll.options.map((option) => {
          const pct = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
          const isSelected = selected.has(option.id);

          if (showResults) {
            return (
              <div key={option.id} className="relative">
                <div
                  className={`absolute inset-0 rounded-lg ${
                    option.hasVoted ? "bg-primary/15" : "bg-muted/30"
                  }`}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between px-3 py-2 rounded-lg border border-border/50">
                  <span className="text-sm text-foreground">
                    {option.hasVoted && <span className="mr-1.5">&#10003;</span>}
                    {option.text}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground ml-2">
                    {pct}% ({option.voteCount})
                  </span>
                </div>
              </div>
            );
          }

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                isSelected
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 text-foreground hover:border-primary/30"
              }`}
            >
              {option.text}
            </button>
          );
        })}
      </div>

      {!showResults && (
        <button
          onClick={handleVote}
          disabled={submitting || selected.size === 0}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Voting..." : "Vote"}
        </button>
      )}

      <p className="text-xs text-muted-foreground">
        {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
      </p>
    </div>
  );
}
