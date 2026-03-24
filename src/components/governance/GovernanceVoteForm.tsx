"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Crown, Info } from "lucide-react";
import { useApi } from "@/lib/hooks/useFetch";

interface GovernanceVoteFormProps {
  /** Merit-weighted vote weight (1.0 – 4.5) */
  voteWeight: number;
  /** Raw reputation score */
  reputation: number;
  /** Whether the voter is a Guild Master (1.5x multiplier) */
  isGuildMaster?: boolean;
  onSubmit: (vote: "for" | "against" | "abstain", reason: string) => Promise<void>;
  disabled?: boolean;
}

export function GovernanceVoteForm({
  voteWeight,
  reputation,
  isGuildMaster = false,
  onSubmit,
  disabled = false,
}: GovernanceVoteFormProps) {
  const [selectedVote, setSelectedVote] = useState<"for" | "against" | "abstain" | null>(null);
  const [reason, setReason] = useState("");
  const { execute: submitVote, isLoading: isSubmitting } = useApi();

  const handleSubmit = async () => {
    if (!selectedVote) return;
    await submitVote(() => onSubmit(selectedVote, reason));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          Cast Your Vote
        </h3>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Vote weight: <span className="font-semibold text-foreground tabular-nums">{voteWeight.toFixed(2)}x</span>
          </p>
          {isGuildMaster && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
              <Crown className="w-3 h-3" />
              1.5x Master
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>Based on your reputation ({reputation.toLocaleString()} pts). Formula: 1 + min(rep/1000, 2.0){isGuildMaster ? " × 1.5" : ""}.</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          variant={selectedVote === "for" ? "default" : "outline"}
          className={selectedVote === "for" ? "bg-green-600 hover:bg-green-700" : "hover:border-green-500 hover:text-green-500"}
          onClick={() => setSelectedVote("for")}
          disabled={disabled || isSubmitting}
          size="lg"
        >
          For
        </Button>
        <Button
          variant={selectedVote === "against" ? "default" : "outline"}
          className={selectedVote === "against" ? "bg-red-600 hover:bg-red-700" : "hover:border-red-500 hover:text-red-500"}
          onClick={() => setSelectedVote("against")}
          disabled={disabled || isSubmitting}
          size="lg"
        >
          Against
        </Button>
        <Button
          variant={selectedVote === "abstain" ? "default" : "outline"}
          className={selectedVote === "abstain" ? "bg-gray-600 hover:bg-gray-700" : ""}
          onClick={() => setSelectedVote("abstain")}
          disabled={disabled || isSubmitting}
          size="lg"
        >
          Abstain
        </Button>
      </div>

      <Textarea
        placeholder="Reason for your vote (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        disabled={disabled || isSubmitting}
      />

      <Button
        onClick={handleSubmit}
        disabled={!selectedVote || disabled || isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Vote"
        )}
      </Button>
    </div>
  );
}
