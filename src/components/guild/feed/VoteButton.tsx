"use client";

import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { guildFeedApi } from "@/lib/api";
import { useExpertSession } from "@/lib/hooks/useExpertSession";
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
  const { ensureSession } = useExpertSession();
  const [voted, setVoted] = useState(hasVoted);
  const [count, setCount] = useState(upvoteCount);
  const [isVoting, setIsVoting] = useState(false);
  // Post-submit cooldown: keeps the button disabled for 500ms after the API
  // resolves (success or failure) so a fast network can't be spammed with
  // rapid re-clicks. Layered on top of `isVoting` which already guards the
  // in-flight window.
  const [coolingDown, setCoolingDown] = useState<boolean>(false);

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Sign in to vote");
      return;
    }

    if (isVoting || coolingDown) return;

    // Gate the vote on a fresh expert session JWT BEFORE touching state, so
    // an aborted signature leaves the optimistic count clean.
    const session = await ensureSession();
    if (!session.ok && session.reason !== "flag-off") {
      if (session.reason === "user-rejected") {
        toast.error("Sign to participate");
      } else {
        toast.error(session.error ?? "Could not authenticate. Please try again.");
      }
      return;
    }

    // Optimistic update
    const newVoted = !voted;
    const newCount = newVoted ? count + 1 : count - 1;
    setVoted(newVoted);
    setCount(newCount);
    setIsVoting(true);
    setCoolingDown(true);

    try {
      const result = await guildFeedApi.vote(guildId, {
        targetId,
        targetType,
      });
      setVoted(result.voted);
      setCount(result.newCount);
      onVoteUpdate?.(result.voted, result.newCount);
    } catch {
      // Revert optimistic update BEFORE the cooldown timer starts so the UI
      // reflects the rolled-back state for the full 500ms window.
      setVoted(!newVoted);
      setCount(newVoted ? newCount - 1 : newCount + 1);
      toast.error("Failed to vote");
    } finally {
      setIsVoting(false);
      // Hold the button disabled for 500ms after the API resolves regardless
      // of outcome. Vanilla setTimeout — no new deps. Component unmount before
      // the timer fires would warn about state on an unmounted component, but
      // VoteButton is short-lived per row and the 500ms window is small.
      setTimeout(() => setCoolingDown(false), 500);
    }
  };

  return (
    <button
      onClick={handleVote}
      disabled={isVoting || coolingDown}
      data-testid="vote-button"
      className={`flex flex-col items-center gap-2 px-1.5 py-1 rounded-lg transition-colors ${
        voted
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:text-primary hover:bg-primary/5"
      } ${!isAuthenticated ? "cursor-default" : ""}`}
    >
      <ChevronUp
        className={`w-5 h-5 ${voted ? "text-primary" : ""}`}
      />
      <span className="text-xs font-medium leading-none">
        {scoreHidden ? "Vote" : count}
      </span>
    </button>
  );
}
