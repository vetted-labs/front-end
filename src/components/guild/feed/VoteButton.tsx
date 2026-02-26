"use client";

import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { guildFeedApi } from "@/lib/api";
import { toast } from "sonner";
import { useFeedContext } from "./FeedContext";

interface VoteButtonProps {
  targetId: string;
  targetType: "post" | "reply";
  upvoteCount: number;
  hasVoted: boolean;
  scoreHidden: boolean;
  onVoteUpdate?: (voted: boolean, newCount: number) => void;
}

export function VoteButton({
  targetId,
  targetType,
  upvoteCount,
  hasVoted,
  scoreHidden,
  onVoteUpdate,
}: VoteButtonProps) {
  const { guildId, isAuthenticated } = useFeedContext();
  const [voted, setVoted] = useState(hasVoted);
  const [count, setCount] = useState(upvoteCount);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Sign in to vote");
      return;
    }

    if (isVoting) return;

    // Optimistic update
    const newVoted = !voted;
    const newCount = newVoted ? count + 1 : count - 1;
    setVoted(newVoted);
    setCount(newCount);
    setIsVoting(true);

    try {
      const result = await guildFeedApi.vote(guildId, {
        targetId,
        targetType,
      });
      setVoted(result.voted);
      setCount(result.newCount);
      onVoteUpdate?.(result.voted, result.newCount);
    } catch {
      // Revert optimistic update
      setVoted(!newVoted);
      setCount(newVoted ? newCount - 1 : newCount + 1);
      toast.error("Failed to vote");
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <button
      onClick={handleVote}
      disabled={isVoting}
      className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors ${
        voted
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:text-primary hover:bg-primary/5"
      } ${!isAuthenticated ? "cursor-default" : ""}`}
    >
      <ChevronUp
        className={`w-5 h-5 ${voted ? "text-primary" : ""}`}
      />
      <span className="text-xs font-semibold leading-none">
        {scoreHidden ? "Vote" : count}
      </span>
    </button>
  );
}
